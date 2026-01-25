import { z } from "zod";

// Resume processing status
export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

// Contact info schema
export const contactInfoSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
});

// Experience entry schema
export const experienceSchema = z.object({
  company: z.string(),
  position: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  responsibilities: z.array(z.string()),
  achievements: z.array(z.string()),
  confidenceScore: z.number().min(0).max(100),
});

// Education entry schema
export const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  graduationDate: z.string().optional(),
  gpa: z.number().optional(),
  confidenceScore: z.number().min(0).max(100),
});

// Skills schema
export const skillsSchema = z.object({
  technical: z.array(z.string()),
  soft: z.array(z.string()),
  confidenceScore: z.number().min(0).max(100),
});

// Project entry schema
export const projectSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  url: z.string().optional(),
  confidenceScore: z.number().min(0).max(100),
});

// Certification schema
export const certificationSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  issueDate: z.string().optional(),
  expirationDate: z.string().optional(),
  confidenceScore: z.number().min(0).max(100),
});

// Language schema
export const languageSchema = z.object({
  language: z.string(),
  proficiency: z.string(),
  confidenceScore: z.number().min(0).max(100),
});

// Metadata schema
export const metadataSchema = z.object({
  originalFilename: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  processingTime: z.number().optional(),
  overallConfidence: z.number().min(0).max(100).optional(),
  language: z.string().optional(),
});

// Full parsed resume schema
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

// Processing job schema
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

// API request/response types
export type UploadResponse = {
  id: string;
  message: string;
};

export type StatusResponse = ProcessingJob;

export type ExportFormat = "json" | "csv";

// Keep existing user schema for compatibility
export interface User {
  id: string;
  username: string;
  password: string;
}

export interface InsertUser {
  username: string;
  password: string;
}
