import { z } from "zod";
import { pgTable, text, integer, timestamp, jsonb, real, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// ============== DRIZZLE DATABASE TABLES ==============

// Resumes table - stores parsed resume data permanently
export const resumes = pgTable("resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  linkedin: text("linkedin"),
  github: text("github"),
  summary: text("summary"),
  experience: jsonb("experience").$type<Experience[]>().default([]),
  education: jsonb("education").$type<Education[]>().default([]),
  skills: jsonb("skills").$type<Skills>().default({ technical: [], soft: [], confidenceScore: 0 }),
  projects: jsonb("projects").$type<Project[]>().default([]),
  certifications: jsonb("certifications").$type<Certification[]>().default([]),
  languages: jsonb("languages").$type<Language[]>().default([]),
  originalFilename: text("original_filename").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  overallConfidence: real("overall_confidence"),
  overallScore: real("overall_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Job descriptions table - for matching and gap analysis
export const jobDescriptions = pgTable("job_descriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  company: text("company"),
  description: text("description").notNull(),
  requiredSkills: jsonb("required_skills").$type<string[]>().default([]),
  preferredSkills: jsonb("preferred_skills").$type<string[]>().default([]),
  experienceYears: integer("experience_years"),
  educationLevel: text("education_level"),
  keywords: jsonb("keywords").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Skills gap analysis results
export const skillsGapAnalysis = pgTable("skills_gap_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  resumeId: uuid("resume_id").references(() => resumes.id).notNull(),
  jobDescriptionId: uuid("job_description_id").references(() => jobDescriptions.id).notNull(),
  matchScore: real("match_score").notNull(),
  matchingSkills: jsonb("matching_skills").$type<string[]>().default([]),
  missingSkills: jsonb("missing_skills").$type<string[]>().default([]),
  recommendations: jsonb("recommendations").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Job matching results
export const jobMatches = pgTable("job_matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  resumeId: uuid("resume_id").references(() => resumes.id).notNull(),
  jobDescriptionId: uuid("job_description_id").references(() => jobDescriptions.id).notNull(),
  matchScore: real("match_score").notNull(),
  skillsMatch: real("skills_match").notNull(),
  experienceMatch: real("experience_match").notNull(),
  educationMatch: real("education_match").notNull(),
  reasons: jsonb("reasons").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Resume scores
export const resumeScores = pgTable("resume_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  resumeId: uuid("resume_id").references(() => resumes.id).notNull(),
  overallScore: real("overall_score").notNull(),
  completenessScore: real("completeness_score").notNull(),
  keywordScore: real("keyword_score").notNull(),
  formattingScore: real("formatting_score").notNull(),
  experienceScore: real("experience_score").notNull(),
  educationScore: real("education_score").notNull(),
  skillsScore: real("skills_score").notNull(),
  suggestions: jsonb("suggestions").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ATS keyword recommendations
export const keywordRecommendations = pgTable("keyword_recommendations", {
  id: uuid("id").primaryKey().defaultRandom(),
  resumeId: uuid("resume_id").references(() => resumes.id).notNull(),
  jobDescriptionId: uuid("job_description_id").references(() => jobDescriptions.id),
  existingKeywords: jsonb("existing_keywords").$type<string[]>().default([]),
  missingKeywords: jsonb("missing_keywords").$type<string[]>().default([]),
  suggestedPhrases: jsonb("suggested_phrases").$type<string[]>().default([]),
  atsScore: real("ats_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Email notifications log
export const emailNotifications = pgTable("email_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  resumeId: uuid("resume_id").references(() => resumes.id).notNull(),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  status: text("status").notNull().default("pending"),
});

// Processing jobs table (for async processing)
export const processingJobs = pgTable("processing_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  status: text("status").notNull().default("pending"),
  uploadTimestamp: timestamp("upload_timestamp").defaultNow().notNull(),
  processingStartTime: timestamp("processing_start_time"),
  processingEndTime: timestamp("processing_end_time"),
  errorMessage: text("error_message"),
  resumeId: uuid("resume_id").references(() => resumes.id),
});

// Relations
export const resumesRelations = relations(resumes, ({ many }) => ({
  skillsGapAnalysis: many(skillsGapAnalysis),
  jobMatches: many(jobMatches),
  resumeScores: many(resumeScores),
  keywordRecommendations: many(keywordRecommendations),
  emailNotifications: many(emailNotifications),
  processingJobs: many(processingJobs),
}));

export const jobDescriptionsRelations = relations(jobDescriptions, ({ many }) => ({
  skillsGapAnalysis: many(skillsGapAnalysis),
  jobMatches: many(jobMatches),
  keywordRecommendations: many(keywordRecommendations),
}));

// Insert schemas
export const insertResumeSchema = createInsertSchema(resumes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertJobDescriptionSchema = createInsertSchema(jobDescriptions).omit({ id: true, createdAt: true });
export const insertProcessingJobSchema = createInsertSchema(processingJobs).omit({ id: true, uploadTimestamp: true });

// ============== ZOD SCHEMAS FOR VALIDATION ==============

export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

export const contactInfoSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
});

export const experienceSchema = z.object({
  company: z.string(),
  position: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  responsibilities: z.array(z.string()),
  achievements: z.array(z.string()),
  confidenceScore: z.number().min(0).max(100),
});

export const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  graduationDate: z.string().optional(),
  gpa: z.number().optional(),
  confidenceScore: z.number().min(0).max(100),
});

export const skillsSchema = z.object({
  technical: z.array(z.string()),
  soft: z.array(z.string()),
  confidenceScore: z.number().min(0).max(100),
});

export const projectSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  url: z.string().optional(),
  confidenceScore: z.number().min(0).max(100),
});

export const certificationSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  issueDate: z.string().optional(),
  expirationDate: z.string().optional(),
  confidenceScore: z.number().min(0).max(100),
});

export const languageSchema = z.object({
  language: z.string(),
  proficiency: z.string(),
  confidenceScore: z.number().min(0).max(100),
});

export const metadataSchema = z.object({
  originalFilename: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  processingTime: z.number().optional(),
  overallConfidence: z.number().min(0).max(100).optional(),
  language: z.string().optional(),
});

export const parsedResumeSchema = z.object({
  id: z.string(),
  name: z.string(),
  contactInfo: contactInfoSchema,
  summary: z.string().optional(),
  experience: z.array(experienceSchema),
  education: z.array(educationSchema),
  skills: skillsSchema,
  projects: z.array(projectSchema),
  certifications: z.array(certificationSchema),
  languages: z.array(languageSchema),
  metadata: metadataSchema,
});

export const processingJobSchema = z.object({
  id: z.string(),
  filename: z.string(),
  fileSize: z.number(),
  fileType: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  uploadTimestamp: z.string(),
  processingStartTime: z.string().optional(),
  processingEndTime: z.string().optional(),
  errorMessage: z.string().optional(),
  result: parsedResumeSchema.optional(),
});

// Skills Gap Analysis schema
export const skillsGapResultSchema = z.object({
  matchScore: z.number().min(0).max(100),
  matchingSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  recommendations: z.array(z.string()),
});

// Resume Score schema
export const resumeScoreResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  completenessScore: z.number().min(0).max(100),
  keywordScore: z.number().min(0).max(100),
  formattingScore: z.number().min(0).max(100),
  experienceScore: z.number().min(0).max(100),
  educationScore: z.number().min(0).max(100),
  skillsScore: z.number().min(0).max(100),
  suggestions: z.array(z.string()),
});

// Job Match schema
export const jobMatchResultSchema = z.object({
  matchScore: z.number().min(0).max(100),
  skillsMatch: z.number().min(0).max(100),
  experienceMatch: z.number().min(0).max(100),
  educationMatch: z.number().min(0).max(100),
  reasons: z.array(z.string()),
});

// Keyword Optimization schema
export const keywordOptimizationSchema = z.object({
  existingKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  suggestedPhrases: z.array(z.string()),
  atsScore: z.number().min(0).max(100),
});

// Types
export type ContactInfo = z.infer<typeof contactInfoSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Skills = z.infer<typeof skillsSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type Language = z.infer<typeof languageSchema>;
export type Metadata = z.infer<typeof metadataSchema>;
export type ParsedResume = z.infer<typeof parsedResumeSchema>;
export type ProcessingJob = z.infer<typeof processingJobSchema>;
export type SkillsGapResult = z.infer<typeof skillsGapResultSchema>;
export type ResumeScoreResult = z.infer<typeof resumeScoreResultSchema>;
export type JobMatchResult = z.infer<typeof jobMatchResultSchema>;
export type KeywordOptimization = z.infer<typeof keywordOptimizationSchema>;

// Database types
export type Resume = typeof resumes.$inferSelect;
export type InsertResume = typeof resumes.$inferInsert;
export type JobDescription = typeof jobDescriptions.$inferSelect;
export type InsertJobDescription = typeof jobDescriptions.$inferInsert;
export type DbProcessingJob = typeof processingJobs.$inferSelect;

// API request/response types
export type UploadResponse = {
  id: string;
  message: string;
};

export type StatusResponse = ProcessingJob;

export type ExportFormat = "json" | "csv";

// Job description input for analysis
export const jobDescriptionInputSchema = z.object({
  title: z.string(),
  company: z.string().optional(),
  description: z.string(),
});

export type JobDescriptionInput = z.infer<typeof jobDescriptionInputSchema>;

// Email notification request
export const emailNotificationRequestSchema = z.object({
  email: z.string().email(),
  includeAnalysis: z.boolean().optional(),
});

export type EmailNotificationRequest = z.infer<typeof emailNotificationRequestSchema>;
