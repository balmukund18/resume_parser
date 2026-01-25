import { randomUUID } from "crypto";
import type { ProcessingJob, ParsedResume, ProcessingStatus } from "@shared/schema";

export interface IStorage {
  createJob(filename: string, fileSize: number, fileType: string): Promise<ProcessingJob>;
  getJob(id: string): Promise<ProcessingJob | undefined>;
  updateJobStatus(id: string, status: ProcessingStatus, errorMessage?: string): Promise<ProcessingJob | undefined>;
  setJobResult(id: string, result: ParsedResume): Promise<ProcessingJob | undefined>;
  deleteJob(id: string): Promise<boolean>;
  getAllJobs(): Promise<ProcessingJob[]>;
  cleanupOldJobs(maxAgeMs: number): Promise<number>;
}

export class MemStorage implements IStorage {
  private jobs: Map<string, ProcessingJob>;

  constructor() {
    this.jobs = new Map();
    
    // Cleanup old jobs every hour
    setInterval(() => {
      this.cleanupOldJobs(24 * 60 * 60 * 1000); // 24 hours
    }, 60 * 60 * 1000);
  }

  async createJob(filename: string, fileSize: number, fileType: string): Promise<ProcessingJob> {
    const id = randomUUID();
    const job: ProcessingJob = {
      id,
      filename,
      fileSize,
      fileType,
      status: "pending",
      uploadTimestamp: new Date().toISOString(),
    };
    this.jobs.set(id, job);
    return job;
  }

  async getJob(id: string): Promise<ProcessingJob | undefined> {
    return this.jobs.get(id);
  }

  async updateJobStatus(
    id: string, 
    status: ProcessingStatus, 
    errorMessage?: string
  ): Promise<ProcessingJob | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    
    job.status = status;
    
    if (status === "processing" && !job.processingStartTime) {
      job.processingStartTime = new Date().toISOString();
    }
    
    if (status === "completed" || status === "failed") {
      job.processingEndTime = new Date().toISOString();
    }
    
    if (errorMessage) {
      job.errorMessage = errorMessage;
    }
    
    this.jobs.set(id, job);
    return job;
  }

  async setJobResult(id: string, result: ParsedResume): Promise<ProcessingJob | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    
    job.result = result;
    job.status = "completed";
    job.processingEndTime = new Date().toISOString();
    
    this.jobs.set(id, job);
    return job;
  }

  async deleteJob(id: string): Promise<boolean> {
    return this.jobs.delete(id);
  }

  async getAllJobs(): Promise<ProcessingJob[]> {
    return Array.from(this.jobs.values());
  }

  async cleanupOldJobs(maxAgeMs: number): Promise<number> {
    const now = Date.now();
    let deleted = 0;
    
    for (const [id, job] of this.jobs.entries()) {
      const uploadTime = new Date(job.uploadTimestamp).getTime();
      if (now - uploadTime > maxAgeMs) {
        this.jobs.delete(id);
        deleted++;
      }
    }
    
    return deleted;
  }
}

export const storage = new MemStorage();
