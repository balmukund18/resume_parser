import { GoogleGenAI } from "@google/genai";
import { createModuleLogger } from "./logger";
import type { ParsedResume, Metadata } from "@shared/schema";

const logger = createModuleLogger("ResumeParser");

// Initialize Gemini client using Replit AI Integrations
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const RESUME_PARSING_PROMPT = `You are an expert resume parser. Analyze the following resume text and extract structured information.

Return a JSON object with the following structure:
{
  "name": "Full name of the candidate",
  "contactInfo": {
    "email": "Email address or null",
    "phone": "Phone number or null",
    "address": "Location/address or null",
    "linkedin": "LinkedIn URL or null",
    "github": "GitHub URL or null"
  },
  "summary": "Professional summary or objective text or null",
  "experience": [
    {
      "company": "Company name",
      "position": "Job title",
      "startDate": "Start date (YYYY-MM or YYYY format) or null",
      "endDate": "End date or 'Present' or null",
      "responsibilities": ["List of job responsibilities"],
      "achievements": ["Notable achievements"],
      "confidenceScore": 0-100
    }
  ],
  "education": [
    {
      "institution": "School/University name",
      "degree": "Degree title",
      "graduationDate": "Graduation date or null",
      "gpa": GPA as number or null,
      "confidenceScore": 0-100
    }
  ],
  "skills": {
    "technical": ["List of technical/hard skills"],
    "soft": ["List of soft skills"],
    "confidenceScore": 0-100
  },
  "projects": [
    {
      "name": "Project name",
      "description": "Brief description",
      "technologies": ["Technologies used"],
      "url": "Project URL or null",
      "confidenceScore": 0-100
    }
  ],
  "certifications": [
    {
      "name": "Certification name",
      "issuer": "Issuing organization",
      "issueDate": "Issue date or null",
      "expirationDate": "Expiration date or null",
      "confidenceScore": 0-100
    }
  ],
  "languages": [
    {
      "language": "Language name",
      "proficiency": "Proficiency level (Native, Fluent, Professional, Basic)",
      "confidenceScore": 0-100
    }
  ],
  "detectedLanguage": "en or es (detected language of resume)"
}

Confidence scores should reflect how certain you are about the extracted data:
- 90-100: High confidence - clearly stated in resume
- 70-89: Medium confidence - inferred from context
- Below 70: Low confidence - uncertain or ambiguous

IMPORTANT:
- If information is not found, use null for optional fields or empty arrays for lists
- Dates should be in YYYY-MM-DD or YYYY-MM or YYYY format when possible
- Extract as much relevant information as possible
- Be thorough but accurate - only include information that is clearly in the resume

RESUME TEXT:
`;

export interface ParseResult {
  resume: ParsedResume;
  processingTime: number;
}

/**
 * Parse resume text using Gemini AI
 */
export async function parseResumeWithAI(
  text: string,
  metadata: Omit<Metadata, "processingTime" | "overallConfidence" | "language">
): Promise<ParseResult> {
  const startTime = Date.now();
  logger.info("Starting AI resume parsing");
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: RESUME_PARSING_PROMPT + text,
      config: {
        maxOutputTokens: 8192,
        temperature: 0.1, // Low temperature for consistent extraction
      },
    });
    
    const responseText = response.text || "";
    logger.info(`Received response from Gemini (${responseText.length} chars)`);
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    // Parse the JSON response
    let parsedData;
    try {
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      logger.error("Failed to parse AI response as JSON");
      throw new Error("Failed to parse AI response");
    }
    
    const processingTime = Date.now() - startTime;
    logger.info(`Resume parsing completed in ${processingTime}ms`);
    
    // Calculate overall confidence
    const confidenceScores: number[] = [];
    
    if (parsedData.experience?.length > 0) {
      parsedData.experience.forEach((exp: any) => {
        if (typeof exp.confidenceScore === "number") {
          confidenceScores.push(exp.confidenceScore);
        }
      });
    }
    
    if (parsedData.education?.length > 0) {
      parsedData.education.forEach((edu: any) => {
        if (typeof edu.confidenceScore === "number") {
          confidenceScores.push(edu.confidenceScore);
        }
      });
    }
    
    if (parsedData.skills?.confidenceScore) {
      confidenceScores.push(parsedData.skills.confidenceScore);
    }
    
    const overallConfidence = confidenceScores.length > 0
      ? Math.round(confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length)
      : 75;
    
    // Build the ParsedResume object
    const resume: ParsedResume = {
      id: "", // Will be set by caller
      name: parsedData.name || "Unknown",
      contactInfo: {
        email: parsedData.contactInfo?.email || undefined,
        phone: parsedData.contactInfo?.phone || undefined,
        address: parsedData.contactInfo?.address || undefined,
        linkedin: parsedData.contactInfo?.linkedin || undefined,
        github: parsedData.contactInfo?.github || undefined,
      },
      summary: parsedData.summary || undefined,
      experience: (parsedData.experience || []).map((exp: any) => ({
        company: exp.company || "",
        position: exp.position || "",
        startDate: exp.startDate || undefined,
        endDate: exp.endDate || undefined,
        responsibilities: exp.responsibilities || [],
        achievements: exp.achievements || [],
        confidenceScore: exp.confidenceScore || 75,
      })),
      education: (parsedData.education || []).map((edu: any) => ({
        institution: edu.institution || "",
        degree: edu.degree || "",
        graduationDate: edu.graduationDate || undefined,
        gpa: edu.gpa || undefined,
        confidenceScore: edu.confidenceScore || 75,
      })),
      skills: {
        technical: parsedData.skills?.technical || [],
        soft: parsedData.skills?.soft || [],
        confidenceScore: parsedData.skills?.confidenceScore || 75,
      },
      projects: (parsedData.projects || []).map((proj: any) => ({
        name: proj.name || "",
        description: proj.description || "",
        technologies: proj.technologies || [],
        url: proj.url || undefined,
        confidenceScore: proj.confidenceScore || 75,
      })),
      certifications: (parsedData.certifications || []).map((cert: any) => ({
        name: cert.name || "",
        issuer: cert.issuer || "",
        issueDate: cert.issueDate || undefined,
        expirationDate: cert.expirationDate || undefined,
        confidenceScore: cert.confidenceScore || 75,
      })),
      languages: (parsedData.languages || []).map((lang: any) => ({
        language: lang.language || "",
        proficiency: lang.proficiency || "Professional",
        confidenceScore: lang.confidenceScore || 75,
      })),
      metadata: {
        ...metadata,
        processingTime,
        overallConfidence,
        language: parsedData.detectedLanguage || "en",
      },
    };
    
    return {
      resume,
      processingTime,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Resume parsing failed after ${processingTime}ms: ${error}`);
    throw error;
  }
}
