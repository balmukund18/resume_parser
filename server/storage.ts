import { eq, lt, desc, and } from "drizzle-orm";
import { db } from "./db";
import { 
  users,
  resumes, 
  processingJobs, 
  jobDescriptions, 
  skillsGapAnalysis, 
  jobMatches, 
  resumeScores, 
  keywordRecommendations,
  emailNotifications,
  type User,
  type InsertUser,
  type Resume,
  type InsertResume,
  type JobDescription,
  type InsertJobDescription,
  type DbProcessingJob,
  type ParsedResume,
  type ProcessingJob,
  type ProcessingStatus,
  type SkillsGapResult,
  type ResumeScoreResult,
  type JobMatchResult,
  type KeywordOptimization,
} from "@shared/schema";

export interface IStorage {
  // User operations
  createUser(data: InsertUser): Promise<User>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;

  // Resume operations
  createResume(data: InsertResume): Promise<Resume>;
  getResume(id: string, userId: string): Promise<Resume | undefined>;
  getParsedResume(id: string, userId: string): Promise<ParsedResume | undefined>;
  getAllResumes(userId: string): Promise<Resume[]>;
  deleteResume(id: string, userId: string): Promise<boolean>;
  deleteAllResumes(userId: string): Promise<number>;

  // Job operations (processing)
  createJob(filename: string, fileSize: number, fileType: string, userId: string): Promise<ProcessingJob>;
  getJob(id: string, userId?: string): Promise<ProcessingJob | undefined>;
  updateJobStatus(id: string, status: ProcessingStatus, errorMessage?: string): Promise<ProcessingJob | undefined>;
  setJobResult(id: string, result: ParsedResume, userId: string): Promise<ProcessingJob | undefined>;
  deleteJob(id: string): Promise<boolean>;
  getAllJobs(): Promise<ProcessingJob[]>;
  cleanupOldJobs(maxAgeMs: number): Promise<number>;
  
  // Job descriptions
  createJobDescription(data: InsertJobDescription): Promise<JobDescription>;
  getJobDescription(id: string): Promise<JobDescription | undefined>;
  getAllJobDescriptions(userId: string): Promise<JobDescription[]>;
  deleteJobDescription(id: string, userId: string): Promise<boolean>;
  
  // Analysis operations
  saveSkillsGapAnalysis(resumeId: string, jobDescriptionId: string, result: SkillsGapResult): Promise<void>;
  saveResumeScore(resumeId: string, result: ResumeScoreResult): Promise<void>;
  saveJobMatch(resumeId: string, jobDescriptionId: string, result: JobMatchResult): Promise<void>;
  saveKeywordRecommendations(resumeId: string, jobDescriptionId: string | null, result: KeywordOptimization): Promise<void>;
  
  // Email notifications
  logEmailNotification(resumeId: string, email: string, subject: string, status: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  // Resume operations
  async createResume(data: InsertResume): Promise<Resume> {
    const [resume] = await db.insert(resumes).values(data).returning();
    return resume;
  }

  async getResume(id: string, userId: string): Promise<Resume | undefined> {
    const [resume] = await db.select().from(resumes).where(
      and(eq(resumes.id, id), eq(resumes.userId, userId))
    );
    return resume || undefined;
  }

  async getParsedResume(id: string, userId: string): Promise<ParsedResume | undefined> {
    const resume = await this.getResume(id, userId);
    if (!resume) return undefined;
    return this.resumeToParsedResume(resume);
  }

  async getAllResumes(userId: string): Promise<Resume[]> {
    return await db.select().from(resumes)
      .where(eq(resumes.userId, userId))
      .orderBy(desc(resumes.createdAt));
  }

  async deleteResume(id: string, userId: string): Promise<boolean> {
    // Verify ownership first
    const resume = await this.getResume(id, userId);
    if (!resume) return false;

    // Delete from dependent tables first (foreign key order)
    await db.delete(skillsGapAnalysis).where(eq(skillsGapAnalysis.resumeId, id));
    await db.delete(jobMatches).where(eq(jobMatches.resumeId, id));
    await db.delete(resumeScores).where(eq(resumeScores.resumeId, id));
    await db.delete(keywordRecommendations).where(eq(keywordRecommendations.resumeId, id));
    await db.delete(emailNotifications).where(eq(emailNotifications.resumeId, id));
    await db.delete(processingJobs).where(eq(processingJobs.resumeId, id));
    const result = await db.delete(resumes).where(
      and(eq(resumes.id, id), eq(resumes.userId, userId))
    );
    return (result.rowCount ?? 0) > 0;
  }

  async deleteAllResumes(userId: string): Promise<number> {
    // Get all resume IDs for this user first
    const userResumes = await db.select({ id: resumes.id }).from(resumes).where(eq(resumes.userId, userId));
    const resumeIds = userResumes.map(r => r.id);

    if (resumeIds.length === 0) return 0;

    // Delete from all dependent tables for these resumes
    for (const rid of resumeIds) {
      await db.delete(skillsGapAnalysis).where(eq(skillsGapAnalysis.resumeId, rid));
      await db.delete(jobMatches).where(eq(jobMatches.resumeId, rid));
      await db.delete(resumeScores).where(eq(resumeScores.resumeId, rid));
      await db.delete(keywordRecommendations).where(eq(keywordRecommendations.resumeId, rid));
      await db.delete(emailNotifications).where(eq(emailNotifications.resumeId, rid));
      await db.delete(processingJobs).where(eq(processingJobs.resumeId, rid));
    }
    
    const result = await db.delete(resumes).where(eq(resumes.userId, userId));
    return result.rowCount ?? 0;
  }

  // Job (processing) operations
  async createJob(filename: string, fileSize: number, fileType: string, userId: string): Promise<ProcessingJob> {
    const [job] = await db.insert(processingJobs).values({
      filename,
      fileSize,
      fileType,
      userId,
      status: "pending",
    }).returning();
    
    return this.dbJobToProcessingJob(job);
  }

  async getJob(id: string, userId?: string): Promise<ProcessingJob | undefined> {
    const conditions = userId 
      ? and(eq(processingJobs.id, id), eq(processingJobs.userId, userId))
      : eq(processingJobs.id, id);
    const [job] = await db.select().from(processingJobs).where(conditions);
    if (!job) return undefined;
    
    // If completed, fetch the resume data
    let result: ParsedResume | undefined;
    if (job.status === "completed" && job.resumeId) {
      const resume = await this.getResumeById(job.resumeId);
      if (resume) {
        result = this.resumeToParsedResume(resume);
      }
    }
    
    return this.dbJobToProcessingJob(job, result);
  }

  // Internal: get resume by ID without userId check (for job result lookup)
  private async getResumeById(id: string): Promise<Resume | undefined> {
    const [resume] = await db.select().from(resumes).where(eq(resumes.id, id));
    return resume || undefined;
  }

  async updateJobStatus(id: string, status: ProcessingStatus, errorMessage?: string): Promise<ProcessingJob | undefined> {
    const updates: Partial<DbProcessingJob> = { status };
    
    if (status === "processing") {
      updates.processingStartTime = new Date();
    }
    
    if (status === "completed" || status === "failed") {
      updates.processingEndTime = new Date();
    }
    
    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }
    
    const [job] = await db.update(processingJobs)
      .set(updates)
      .where(eq(processingJobs.id, id))
      .returning();
    
    if (!job) return undefined;
    return this.dbJobToProcessingJob(job);
  }

  async setJobResult(id: string, result: ParsedResume, userId: string): Promise<ProcessingJob | undefined> {
    // First create the resume with userId
    const resume = await this.createResume({
      userId,
      name: result.name,
      email: result.contactInfo.email,
      phone: result.contactInfo.phone,
      address: result.contactInfo.address,
      linkedin: result.contactInfo.linkedin,
      github: result.contactInfo.github,
      summary: result.summary,
      experience: result.experience,
      education: result.education,
      skills: result.skills,
      projects: result.projects,
      certifications: result.certifications,
      languages: result.languages,
      extendedContact: {
        portfolio: result.contactInfo.portfolio,
        leetcode: result.contactInfo.leetcode,
        hackerrank: result.contactInfo.hackerrank,
        kaggle: result.contactInfo.kaggle,
        codeforces: result.contactInfo.codeforces,
        twitter: result.contactInfo.twitter,
        otherProfiles: result.contactInfo.otherProfiles,
      },
      links: result.links,
      originalFilename: result.metadata.originalFilename,
      fileType: result.metadata.fileType,
      fileSize: result.metadata.fileSize,
      overallConfidence: result.metadata.overallConfidence,
    });
    
    // Update the job with the resume reference
    const [job] = await db.update(processingJobs)
      .set({
        status: "completed",
        processingEndTime: new Date(),
        resumeId: resume.id,
      })
      .where(eq(processingJobs.id, id))
      .returning();
    
    if (!job) return undefined;
    
    // Update the result with the new resume ID
    result.id = resume.id;
    
    return this.dbJobToProcessingJob(job, result);
  }

  async deleteJob(id: string): Promise<boolean> {
    const result = await db.delete(processingJobs).where(eq(processingJobs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllJobs(): Promise<ProcessingJob[]> {
    const jobs = await db.select().from(processingJobs).orderBy(desc(processingJobs.uploadTimestamp));
    return jobs.map(job => this.dbJobToProcessingJob(job));
  }

  async cleanupOldJobs(maxAgeMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    const result = await db.delete(processingJobs).where(lt(processingJobs.uploadTimestamp, cutoff));
    return result.rowCount ?? 0;
  }

  // Job descriptions
  async createJobDescription(data: InsertJobDescription): Promise<JobDescription> {
    const [jd] = await db.insert(jobDescriptions).values(data).returning();
    return jd;
  }

  async getJobDescription(id: string): Promise<JobDescription | undefined> {
    const [jd] = await db.select().from(jobDescriptions).where(eq(jobDescriptions.id, id));
    return jd || undefined;
  }

  async getAllJobDescriptions(userId: string): Promise<JobDescription[]> {
    return await db.select().from(jobDescriptions)
      .where(eq(jobDescriptions.userId, userId))
      .orderBy(desc(jobDescriptions.createdAt));
  }

  async deleteJobDescription(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(jobDescriptions).where(
      and(eq(jobDescriptions.id, id), eq(jobDescriptions.userId, userId))
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Analysis operations
  async saveSkillsGapAnalysis(resumeId: string, jobDescriptionId: string, result: SkillsGapResult): Promise<void> {
    await db.insert(skillsGapAnalysis).values({
      resumeId,
      jobDescriptionId,
      matchScore: result.matchScore,
      matchingSkills: result.matchingSkills,
      missingSkills: result.missingSkills,
      recommendations: result.recommendations,
    });
  }

  async saveResumeScore(resumeId: string, result: ResumeScoreResult): Promise<void> {
    await db.insert(resumeScores).values({
      resumeId,
      overallScore: result.overallScore,
      completenessScore: result.completenessScore,
      keywordScore: result.keywordScore,
      formattingScore: result.formattingScore,
      experienceScore: result.experienceScore,
      educationScore: result.educationScore,
      skillsScore: result.skillsScore,
      suggestions: result.suggestions,
    });
    
    // Update resume with overall score
    await db.update(resumes).set({ overallScore: result.overallScore }).where(eq(resumes.id, resumeId));
  }

  async saveJobMatch(resumeId: string, jobDescriptionId: string, result: JobMatchResult): Promise<void> {
    await db.insert(jobMatches).values({
      resumeId,
      jobDescriptionId,
      matchScore: result.matchScore,
      skillsMatch: result.skillsMatch,
      experienceMatch: result.experienceMatch,
      educationMatch: result.educationMatch,
      reasons: result.reasons,
    });
  }

  async saveKeywordRecommendations(resumeId: string, jobDescriptionId: string | null, result: KeywordOptimization): Promise<void> {
    await db.insert(keywordRecommendations).values({
      resumeId,
      jobDescriptionId,
      existingKeywords: result.existingKeywords,
      missingKeywords: result.missingKeywords,
      suggestedPhrases: result.suggestedPhrases,
      atsScore: result.atsScore,
    });
  }

  // Email notifications
  async logEmailNotification(resumeId: string, email: string, subject: string, status: string): Promise<void> {
    await db.insert(emailNotifications).values({
      resumeId,
      recipientEmail: email,
      subject,
      status,
    });
  }

  // Helper methods
  private dbJobToProcessingJob(job: DbProcessingJob, result?: ParsedResume): ProcessingJob {
    return {
      id: job.id,
      filename: job.filename,
      fileSize: job.fileSize,
      fileType: job.fileType,
      status: job.status as ProcessingStatus,
      uploadTimestamp: job.uploadTimestamp.toISOString(),
      processingStartTime: job.processingStartTime?.toISOString(),
      processingEndTime: job.processingEndTime?.toISOString(),
      errorMessage: job.errorMessage || undefined,
      result,
    };
  }

  private resumeToParsedResume(resume: Resume): ParsedResume {
    const extContact = resume.extendedContact as {
      portfolio?: string;
      leetcode?: string;
      hackerrank?: string;
      kaggle?: string;
      codeforces?: string;
      twitter?: string;
      otherProfiles?: string[];
    } | null;

    return {
      id: resume.id,
      name: resume.name,
      contactInfo: {
        email: resume.email || undefined,
        phone: resume.phone || undefined,
        address: resume.address || undefined,
        linkedin: resume.linkedin || undefined,
        github: resume.github || undefined,
        portfolio: extContact?.portfolio || undefined,
        leetcode: extContact?.leetcode || undefined,
        hackerrank: extContact?.hackerrank || undefined,
        kaggle: extContact?.kaggle || undefined,
        codeforces: extContact?.codeforces || undefined,
        twitter: extContact?.twitter || undefined,
        otherProfiles: extContact?.otherProfiles || undefined,
      },
      summary: resume.summary || undefined,
      experience: resume.experience || [],
      education: resume.education || [],
      skills: resume.skills || { technical: [], soft: [], confidenceScore: 0 },
      projects: resume.projects || [],
      certifications: resume.certifications || [],
      languages: resume.languages || [],
      links: resume.links || undefined,
      metadata: {
        originalFilename: resume.originalFilename,
        fileType: resume.fileType,
        fileSize: resume.fileSize,
        overallConfidence: resume.overallConfidence || undefined,
      },
    };
  }
}

export const storage = new DatabaseStorage();
