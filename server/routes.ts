import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { extractText, getFileType, validateMimeType } from "./utils/text-extractor";
import { 
  parseResumeWithAI, 
  analyzeSkillsGap, 
  scoreResume, 
  matchResumeToJob, 
  optimizeKeywords,
  importFromLinkedIn,
  checkCredibility,
  quantifyImpact
} from "./utils/resume-parser";
import { validate, uploadSchema, exportSchema, idSchema } from "./utils/validation";
import { createModuleLogger } from "./utils/logger";
import type { ParsedResume, JobDescriptionInput } from "@shared/schema";

const logger = createModuleLogger("Routes");

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Cleanup old files on startup (24h retention)
function cleanupOldFiles() {
  try {
    const files = fs.readdirSync(uploadsDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    files.forEach((file) => {
      const filePath = path.join(uploadsDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          logger.info(`Cleaned up old file: ${file}`);
        }
      } catch {
        // Ignore individual file errors
      }
    });
  } catch (error) {
    logger.error(`Failed to cleanup old files: ${error}`);
  }
}

// Run cleanup on startup and every hour
cleanupOldFiles();
setInterval(cleanupOldFiles, 60 * 60 * 1000);

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const fileType = getFileType(file.originalname);
    if (!fileType) {
      cb(new Error("Invalid file type. Supported formats: PDF, DOCX, TXT"));
      return;
    }
    
    if (!validateMimeType(file.mimetype, fileType)) {
      cb(new Error("File type mismatch. The file extension does not match its content."));
      return;
    }
    
    cb(null, true);
  },
});

// Cleanup uploaded file helper
function cleanupFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Cleaned up file: ${filePath}`);
    }
  } catch (error) {
    logger.error(`Failed to cleanup file: ${filePath}`);
  }
}

// Escape CSV value properly
function escapeCSV(value: string): string {
  if (!value) return "";
  // Escape double quotes and wrap in quotes
  return `"${value.replace(/"/g, '""')}"`;
}

// Convert resume to CSV format
function resumeToCSV(resume: ParsedResume): string {
  const lines: string[] = [];
  
  // Header
  lines.push("Section,Field,Value");
  
  // Personal Info
  lines.push(`Personal,Name,${escapeCSV(resume.name)}`);
  if (resume.contactInfo.email) lines.push(`Personal,Email,${escapeCSV(resume.contactInfo.email)}`);
  if (resume.contactInfo.phone) lines.push(`Personal,Phone,${escapeCSV(resume.contactInfo.phone)}`);
  if (resume.contactInfo.address) lines.push(`Personal,Address,${escapeCSV(resume.contactInfo.address)}`);
  if (resume.contactInfo.linkedin) lines.push(`Personal,LinkedIn,${escapeCSV(resume.contactInfo.linkedin)}`);
  if (resume.contactInfo.github) lines.push(`Personal,GitHub,${escapeCSV(resume.contactInfo.github)}`);
  
  // Summary
  if (resume.summary) {
    lines.push(`Summary,Text,${escapeCSV(resume.summary)}`);
  }
  
  // Experience
  resume.experience.forEach((exp, i) => {
    lines.push(`Experience ${i + 1},Company,${escapeCSV(exp.company)}`);
    lines.push(`Experience ${i + 1},Position,${escapeCSV(exp.position)}`);
    lines.push(`Experience ${i + 1},Start Date,${escapeCSV(exp.startDate || "")}`);
    lines.push(`Experience ${i + 1},End Date,${escapeCSV(exp.endDate || "")}`);
    if (exp.responsibilities.length > 0) {
      lines.push(`Experience ${i + 1},Responsibilities,${escapeCSV(exp.responsibilities.join("; "))}`);
    }
    if (exp.achievements.length > 0) {
      lines.push(`Experience ${i + 1},Achievements,${escapeCSV(exp.achievements.join("; "))}`);
    }
    lines.push(`Experience ${i + 1},Confidence,"${exp.confidenceScore}%"`);
  });
  
  // Education
  resume.education.forEach((edu, i) => {
    lines.push(`Education ${i + 1},Institution,${escapeCSV(edu.institution)}`);
    lines.push(`Education ${i + 1},Degree,${escapeCSV(edu.degree)}`);
    lines.push(`Education ${i + 1},Graduation Date,${escapeCSV(edu.graduationDate || "")}`);
    if (edu.gpa) lines.push(`Education ${i + 1},GPA,"${edu.gpa}"`);
    lines.push(`Education ${i + 1},Confidence,"${edu.confidenceScore}%"`);
  });
  
  // Skills
  if (resume.skills.technical.length > 0) {
    lines.push(`Skills,Technical,${escapeCSV(resume.skills.technical.join(", "))}`);
  }
  if (resume.skills.soft.length > 0) {
    lines.push(`Skills,Soft,${escapeCSV(resume.skills.soft.join(", "))}`);
  }
  lines.push(`Skills,Confidence,"${resume.skills.confidenceScore}%"`);
  
  // Projects
  resume.projects.forEach((proj, i) => {
    lines.push(`Project ${i + 1},Name,${escapeCSV(proj.name)}`);
    lines.push(`Project ${i + 1},Description,${escapeCSV(proj.description)}`);
    if (proj.technologies.length > 0) {
      lines.push(`Project ${i + 1},Technologies,${escapeCSV(proj.technologies.join(", "))}`);
    }
    if (proj.url) lines.push(`Project ${i + 1},URL,${escapeCSV(proj.url)}`);
    lines.push(`Project ${i + 1},Confidence,"${proj.confidenceScore}%"`);
  });
  
  // Certifications
  resume.certifications.forEach((cert, i) => {
    lines.push(`Certification ${i + 1},Name,${escapeCSV(cert.name)}`);
    lines.push(`Certification ${i + 1},Issuer,${escapeCSV(cert.issuer)}`);
    if (cert.issueDate) lines.push(`Certification ${i + 1},Issue Date,${escapeCSV(cert.issueDate)}`);
    if (cert.expirationDate) lines.push(`Certification ${i + 1},Expiration Date,${escapeCSV(cert.expirationDate)}`);
    lines.push(`Certification ${i + 1},Confidence,"${cert.confidenceScore}%"`);
  });
  
  // Languages
  resume.languages.forEach((lang, i) => {
    lines.push(`Language ${i + 1},Language,${escapeCSV(lang.language)}`);
    lines.push(`Language ${i + 1},Proficiency,${escapeCSV(lang.proficiency)}`);
    lines.push(`Language ${i + 1},Confidence,"${lang.confidenceScore}%"`);
  });
  
  return lines.join("\n");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Upload resume endpoint
  app.post("/api/resumes/upload", (req: Request, res: Response) => {
    upload.single("resume")(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ message: "File size exceeds 10MB limit" });
        }
        logger.error(`Multer error: ${err.message}`);
        return res.status(400).json({ message: err.message });
      } else if (err) {
        logger.error(`Upload error: ${err.message}`);
        return res.status(400).json({ message: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const file = req.file;
      const fileType = getFileType(file.originalname);
      
      if (!fileType) {
        cleanupFile(file.path);
        return res.status(400).json({ message: "Invalid file type" });
      }
      
      // Validate file metadata
      const validation = validate(uploadSchema, {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
      
      if (validation.error) {
        cleanupFile(file.path);
        return res.status(400).json({ message: validation.error });
      }
      
      try {
        // Create job
        const job = await storage.createJob(
          file.originalname,
          file.size,
          fileType
        );
        
        logger.info(`Created job ${job.id} for file ${file.originalname}`);
        
        // Start async processing
        processResume(job.id, file.path, fileType, file.originalname, file.size);
        
        res.status(201).json({
          id: job.id,
          message: "Resume uploaded successfully. Processing started.",
        });
      } catch (error) {
        cleanupFile(file.path);
        logger.error(`Failed to create job: ${error}`);
        res.status(500).json({ message: "Failed to process upload" });
      }
    });
  });
  
  // Get job status
  app.get("/api/resumes/:id/status", async (req: Request, res: Response) => {
    const validation = validate(idSchema, { id: req.params.id });
    
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }
    
    const job = await storage.getJob(req.params.id);
    
    if (!job) {
      return res.status(404).json({ message: "Resume not found" });
    }
    
    // Return job without the result for status endpoint
    const { result, ...jobStatus } = job;
    res.json(jobStatus);
  });
  
  // Get parsed resume
  app.get("/api/resumes/:id", async (req: Request, res: Response) => {
    const validation = validate(idSchema, { id: req.params.id });
    
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }
    
    const job = await storage.getJob(req.params.id);
    
    if (!job) {
      return res.status(404).json({ message: "Resume not found" });
    }
    
    if (job.status !== "completed" || !job.result) {
      return res.status(400).json({ 
        message: "Resume is not yet processed", 
        status: job.status 
      });
    }
    
    res.json(job.result);
  });
  
  // Export resume
  app.post("/api/resumes/:id/export", async (req: Request, res: Response) => {
    const idValidation = validate(idSchema, { id: req.params.id });
    
    if (idValidation.error) {
      return res.status(400).json({ message: idValidation.error });
    }
    
    const formatValidation = validate(exportSchema, req.body);
    
    if (formatValidation.error) {
      return res.status(400).json({ message: formatValidation.error });
    }
    
    const job = await storage.getJob(req.params.id);
    
    if (!job) {
      return res.status(404).json({ message: "Resume not found" });
    }
    
    if (job.status !== "completed" || !job.result) {
      return res.status(400).json({ message: "Resume is not yet processed" });
    }
    
    const { format } = req.body as { format: "json" | "csv" };
    
    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${job.filename}.json"`);
      res.send(JSON.stringify(job.result, null, 2));
    } else {
      const csv = resumeToCSV(job.result);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${job.filename}.csv"`);
      res.send(csv);
    }
  });
  
  // Delete resume
  app.delete("/api/resumes/:id", async (req: Request, res: Response) => {
    const validation = validate(idSchema, { id: req.params.id });
    
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }
    
    const deleted = await storage.deleteJob(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Resume not found" });
    }
    
    logger.info(`Deleted resume ${req.params.id}`);
    res.status(204).send();
  });

  // ============== NEW ANALYSIS ENDPOINTS ==============

  // Get all saved resumes
  app.get("/api/resumes/saved/all", async (req: Request, res: Response) => {
    try {
      const resumes = await storage.getAllResumes();
      res.json(resumes);
    } catch (error) {
      logger.error(`Failed to get resumes: ${error}`);
      res.status(500).json({ message: "Failed to retrieve resumes" });
    }
  });

  // Skills Gap Analysis
  app.post("/api/resumes/:id/skills-gap", async (req: Request, res: Response) => {
    const validation = validate(idSchema, { id: req.params.id });
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const { title, company, description } = req.body as JobDescriptionInput;
    if (!title || !description) {
      return res.status(400).json({ message: "Job title and description are required" });
    }

    try {
      const resume = await storage.getResume(req.params.id);
      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      // Create job description record
      const jobDesc = await storage.createJobDescription({
        title,
        company: company || null,
        description,
        requiredSkills: [],
        preferredSkills: [],
        keywords: [],
      });

      // Analyze skills gap
      const result = await analyzeSkillsGap(
        { 
          technical: resume.skills?.technical || [], 
          soft: resume.skills?.soft || [] 
        },
        { title, description }
      );

      // Save analysis
      await storage.saveSkillsGapAnalysis(resume.id, jobDesc.id, result);

      logger.info(`Skills gap analysis completed for resume ${resume.id}`);
      res.json(result);
    } catch (error) {
      logger.error(`Skills gap analysis failed: ${error}`);
      res.status(500).json({ message: "Failed to analyze skills gap" });
    }
  });

  // Resume Scoring
  app.post("/api/resumes/:id/score", async (req: Request, res: Response) => {
    const validation = validate(idSchema, { id: req.params.id });
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    try {
      const parsedResume = await storage.getParsedResume(req.params.id);
      if (!parsedResume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      const result = await scoreResume(parsedResume);
      
      // Save score
      await storage.saveResumeScore(req.params.id, result);

      logger.info(`Resume scoring completed for ${req.params.id}`);
      res.json(result);
    } catch (error) {
      logger.error(`Resume scoring failed: ${error}`);
      res.status(500).json({ message: "Failed to score resume" });
    }
  });

  // Job Matching
  app.post("/api/resumes/:id/match-job", async (req: Request, res: Response) => {
    const validation = validate(idSchema, { id: req.params.id });
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const { title, company, description } = req.body as JobDescriptionInput;
    if (!title || !description) {
      return res.status(400).json({ message: "Job title and description are required" });
    }

    try {
      const parsedResume = await storage.getParsedResume(req.params.id);
      if (!parsedResume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      // Create job description record
      const jobDesc = await storage.createJobDescription({
        title,
        company: company || null,
        description,
        requiredSkills: [],
        preferredSkills: [],
        keywords: [],
      });

      const result = await matchResumeToJob(parsedResume, { title, company, description });
      
      // Save match
      await storage.saveJobMatch(req.params.id, jobDesc.id, result);

      logger.info(`Job matching completed for resume ${req.params.id}`);
      res.json(result);
    } catch (error) {
      logger.error(`Job matching failed: ${error}`);
      res.status(500).json({ message: "Failed to match job" });
    }
  });

  // ATS Keyword Optimization
  app.post("/api/resumes/:id/optimize-keywords", async (req: Request, res: Response) => {
    const validation = validate(idSchema, { id: req.params.id });
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const { title, description } = req.body as Partial<JobDescriptionInput>;

    try {
      const parsedResume = await storage.getParsedResume(req.params.id);
      if (!parsedResume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      const targetJob = title && description ? { title, description } : undefined;
      const result = await optimizeKeywords(parsedResume, targetJob);
      
      // Save recommendations
      await storage.saveKeywordRecommendations(req.params.id, null, result);

      logger.info(`Keyword optimization completed for resume ${req.params.id}`);
      res.json(result);
    } catch (error) {
      logger.error(`Keyword optimization failed: ${error}`);
      res.status(500).json({ message: "Failed to optimize keywords" });
    }
  });

  // LinkedIn Import
  app.post("/api/resumes/import-linkedin", async (req: Request, res: Response) => {
    const { linkedinUrl } = req.body;
    if (!linkedinUrl || !linkedinUrl.includes("linkedin.com")) {
      return res.status(400).json({ message: "Valid LinkedIn URL is required" });
    }

    try {
      const result = await importFromLinkedIn(linkedinUrl);
      logger.info(`LinkedIn import guide requested for ${linkedinUrl}`);
      res.json({
        success: true,
        username: result.username,
        profileUrl: result.profileUrl,
        message: result.username 
          ? `Found profile: ${result.username}. Follow the steps below to import your full profile.`
          : "Follow the steps below to export and import your LinkedIn profile.",
        instructions: result.instructions,
        tip: "LinkedIn PDF export includes your complete profile data which our AI can parse accurately."
      });
    } catch (error) {
      logger.error(`LinkedIn import failed: ${error}`);
      res.status(500).json({ message: "Failed to process LinkedIn URL" });
    }
  });

  // Resume Credibility Check
  app.post("/api/resumes/:id/credibility", async (req: Request, res: Response) => {
    const validation = validate(idSchema, { id: req.params.id });
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    try {
      const parsedResume = await storage.getParsedResume(req.params.id);
      if (!parsedResume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      const result = await checkCredibility(parsedResume);
      
      logger.info(`Credibility check completed for resume ${req.params.id}`);
      res.json(result);
    } catch (error) {
      logger.error(`Credibility check failed: ${error}`);
      res.status(500).json({ message: "Failed to check credibility" });
    }
  });

  // Impact Quantification
  app.post("/api/resumes/:id/impact", async (req: Request, res: Response) => {
    const validation = validate(idSchema, { id: req.params.id });
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    try {
      const parsedResume = await storage.getParsedResume(req.params.id);
      if (!parsedResume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      const result = await quantifyImpact(parsedResume);
      
      logger.info(`Impact quantification completed for resume ${req.params.id}`);
      res.json(result);
    } catch (error) {
      logger.error(`Impact quantification failed: ${error}`);
      res.status(500).json({ message: "Failed to quantify impact" });
    }
  });

  // Email Notification (placeholder - requires email service setup)
  app.post("/api/resumes/:id/send-email", async (req: Request, res: Response) => {
    const validation = validate(idSchema, { id: req.params.id });
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const { email, includeAnalysis } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email address is required" });
    }

    try {
      const parsedResume = await storage.getParsedResume(req.params.id);
      if (!parsedResume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      // Log the notification attempt
      await storage.logEmailNotification(
        req.params.id,
        email,
        `Resume Analysis Results - ${parsedResume.name}`,
        "pending"
      );

      // Note: Actual email sending requires email service integration
      logger.info(`Email notification logged for resume ${req.params.id} to ${email}`);
      res.json({
        message: "Email notification queued. Note: Email service requires configuration.",
        email,
        resumeId: req.params.id,
        includeAnalysis: includeAnalysis || false,
        status: "Email service not configured. To enable, set up SendGrid or Resend integration."
      });
    } catch (error) {
      logger.error(`Email notification failed: ${error}`);
      res.status(500).json({ message: "Failed to send email notification" });
    }
  });

  // Get all job descriptions
  app.get("/api/job-descriptions", async (req: Request, res: Response) => {
    try {
      const jobDescs = await storage.getAllJobDescriptions();
      res.json(jobDescs);
    } catch (error) {
      logger.error(`Failed to get job descriptions: ${error}`);
      res.status(500).json({ message: "Failed to retrieve job descriptions" });
    }
  });

  // Create job description
  app.post("/api/job-descriptions", async (req: Request, res: Response) => {
    const { title, company, description } = req.body as JobDescriptionInput;
    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    try {
      const jobDesc = await storage.createJobDescription({
        title,
        company: company || null,
        description,
        requiredSkills: [],
        preferredSkills: [],
        keywords: [],
      });
      res.status(201).json(jobDesc);
    } catch (error) {
      logger.error(`Failed to create job description: ${error}`);
      res.status(500).json({ message: "Failed to create job description" });
    }
  });
  
  return httpServer;
}

// Async resume processing function
async function processResume(
  jobId: string,
  filePath: string,
  fileType: "pdf" | "docx" | "txt",
  originalFilename: string,
  fileSize: number
) {
  const maxRetries = 3;
  let attempt = 0;
  
  try {
    await storage.updateJobStatus(jobId, "processing");
    logger.info(`Processing job ${jobId}, attempt ${attempt + 1}`);
    
    // Extract text from file
    const extraction = await extractText(filePath, fileType);
    
    if (!extraction.text || extraction.text.trim().length === 0) {
      throw new Error("No text could be extracted from the file");
    }
    
    logger.info(`Extracted ${extraction.text.length} characters from ${originalFilename}`);
    
    // Parse with AI (with retries)
    let parseResult = null;
    let lastError = null;
    
    while (attempt < maxRetries) {
      try {
        parseResult = await parseResumeWithAI(extraction.text, {
          originalFilename,
          fileType,
          fileSize,
        });
        break;
      } catch (error) {
        lastError = error;
        attempt++;
        logger.warn(`AI parsing attempt ${attempt} failed: ${error}`);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    if (!parseResult) {
      throw lastError || new Error("Failed to parse resume after retries");
    }
    
    // Set the job ID on the resume
    parseResult.resume.id = jobId;
    
    // Update job with result
    await storage.setJobResult(jobId, parseResult.resume);
    logger.info(`Successfully processed job ${jobId}`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Failed to process job ${jobId}: ${errorMessage}`);
    await storage.updateJobStatus(jobId, "failed", errorMessage);
  } finally {
    // Always cleanup the uploaded file
    cleanupFile(filePath);
  }
}
