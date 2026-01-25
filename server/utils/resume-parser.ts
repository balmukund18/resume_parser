import { GoogleGenAI } from "@google/genai";
import { createModuleLogger } from "./logger";
import type { ParsedResume, Metadata, SkillsGapResult, ResumeScoreResult, JobMatchResult, KeywordOptimization } from "@shared/schema";

const logger = createModuleLogger("ResumeParser");

// Initialize Gemini client - supports both user API key and Replit AI Integrations
function getGeminiClient(): GoogleGenAI {
  // First check for user's own API key
  if (process.env.GEMINI_API_KEY) {
    logger.info("Using user-provided GEMINI_API_KEY");
    return new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  
  // Fall back to Replit AI Integrations
  if (process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
    logger.info("Using Replit AI Integrations");
    return new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });
  }
  
  throw new Error("No Gemini API key configured. Set GEMINI_API_KEY environment variable.");
}

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
  
  const ai = getGeminiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: RESUME_PARSING_PROMPT + text,
      config: {
        maxOutputTokens: 8192,
        temperature: 0.1,
      },
    });
    
    const responseText = response.text || "";
    logger.info(`Received response from Gemini (${responseText.length} chars)`);
    
    // Extract JSON from response
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
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
    
    const resume: ParsedResume = {
      id: "",
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
    
    return { resume, processingTime };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`Resume parsing failed after ${processingTime}ms: ${error}`);
    throw error;
  }
}

/**
 * Analyze skills gap between resume and job description
 */
export async function analyzeSkillsGap(
  resumeSkills: { technical: string[]; soft: string[] },
  jobDescription: { title: string; description: string; requiredSkills?: string[] }
): Promise<SkillsGapResult> {
  const ai = getGeminiClient();
  
  const prompt = `Analyze the skills gap between a candidate's resume and a job description.

CANDIDATE SKILLS:
Technical: ${resumeSkills.technical.join(", ")}
Soft Skills: ${resumeSkills.soft.join(", ")}

JOB DESCRIPTION:
Title: ${jobDescription.title}
Description: ${jobDescription.description}
${jobDescription.requiredSkills ? `Required Skills: ${jobDescription.requiredSkills.join(", ")}` : ""}

Provide a JSON response with:
{
  "matchScore": 0-100 (how well the candidate matches),
  "matchingSkills": ["skills the candidate has that match the job"],
  "missingSkills": ["skills the job requires that the candidate lacks"],
  "recommendations": ["specific actionable advice to improve the match"]
}

Be thorough and specific. Only return valid JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { temperature: 0.2 },
  });
  
  const text = response.text || "{}";
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  return JSON.parse(jsonMatch[1] || text);
}

/**
 * Score a resume based on completeness and quality
 */
export async function scoreResume(resume: ParsedResume): Promise<ResumeScoreResult> {
  const ai = getGeminiClient();
  
  const prompt = `Score this resume on various criteria. Be critical but fair.

RESUME DATA:
Name: ${resume.name}
Summary: ${resume.summary || "Not provided"}
Experience: ${resume.experience.length} positions
Education: ${resume.education.length} entries
Technical Skills: ${resume.skills.technical.join(", ") || "None listed"}
Soft Skills: ${resume.skills.soft.join(", ") || "None listed"}
Projects: ${resume.projects.length} projects
Certifications: ${resume.certifications.length} certifications

Experience Details:
${resume.experience.map(e => `- ${e.position} at ${e.company}: ${e.responsibilities.length} responsibilities, ${e.achievements.length} achievements`).join("\n")}

Provide a JSON response with scores from 0-100:
{
  "overallScore": weighted average of all scores,
  "completenessScore": how complete is the resume (all sections filled),
  "keywordScore": industry-relevant keywords present,
  "formattingScore": implied structure quality based on data,
  "experienceScore": quality and relevance of experience,
  "educationScore": education quality and relevance,
  "skillsScore": breadth and depth of skills,
  "suggestions": ["specific improvements the candidate should make"]
}

Only return valid JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { temperature: 0.2 },
  });
  
  const text = response.text || "{}";
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  return JSON.parse(jsonMatch[1] || text);
}

/**
 * Match resume against a job description
 */
export async function matchResumeToJob(
  resume: ParsedResume,
  jobDescription: { title: string; company?: string; description: string }
): Promise<JobMatchResult> {
  const ai = getGeminiClient();
  
  const prompt = `Evaluate how well this candidate matches the job.

CANDIDATE:
Name: ${resume.name}
Experience: ${resume.experience.map(e => `${e.position} at ${e.company}`).join("; ")}
Education: ${resume.education.map(e => `${e.degree} from ${e.institution}`).join("; ")}
Skills: ${[...resume.skills.technical, ...resume.skills.soft].join(", ")}

JOB:
Title: ${jobDescription.title}
${jobDescription.company ? `Company: ${jobDescription.company}` : ""}
Description: ${jobDescription.description}

Provide a JSON response:
{
  "matchScore": 0-100 (overall match percentage),
  "skillsMatch": 0-100 (how well skills align),
  "experienceMatch": 0-100 (how relevant is their experience),
  "educationMatch": 0-100 (education fit),
  "reasons": ["specific reasons why they are/aren't a good match"]
}

Only return valid JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { temperature: 0.2 },
  });
  
  const text = response.text || "{}";
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  return JSON.parse(jsonMatch[1] || text);
}

/**
 * Suggest keywords for ATS optimization
 */
export async function optimizeKeywords(
  resume: ParsedResume,
  targetJobDescription?: { title: string; description: string }
): Promise<KeywordOptimization> {
  const ai = getGeminiClient();
  
  const jobContext = targetJobDescription 
    ? `\nTARGET JOB:\nTitle: ${targetJobDescription.title}\nDescription: ${targetJobDescription.description}`
    : "\nNo specific job target - provide general ATS optimization.";
  
  const prompt = `Analyze this resume for ATS (Applicant Tracking System) optimization.

RESUME:
Name: ${resume.name}
Summary: ${resume.summary || "Not provided"}
Skills: ${[...resume.skills.technical, ...resume.skills.soft].join(", ")}
Experience: ${resume.experience.map(e => `${e.position}: ${e.responsibilities.slice(0, 3).join(", ")}`).join("; ")}
${jobContext}

Provide a JSON response:
{
  "existingKeywords": ["keywords already in the resume that are ATS-friendly"],
  "missingKeywords": ["important keywords missing from the resume"],
  "suggestedPhrases": ["specific phrases to add for better ATS scoring"],
  "atsScore": 0-100 (estimated ATS compatibility score)
}

Focus on action verbs, industry terms, and quantifiable achievements.
Only return valid JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { temperature: 0.2 },
  });
  
  const text = response.text || "{}";
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  return JSON.parse(jsonMatch[1] || text);
}

/**
 * Import LinkedIn profile data from a URL (parses public profile)
 */
export async function importFromLinkedIn(linkedinUrl: string): Promise<Partial<ParsedResume>> {
  const ai = getGeminiClient();
  
  const prompt = `Given this LinkedIn URL: ${linkedinUrl}

I cannot access the URL directly, but based on the URL format, extract any information visible in the URL itself (like username).

Since I cannot access external URLs, return a template structure that would need to be filled in:
{
  "name": "Extract from URL if possible or 'Unknown'",
  "contactInfo": {
    "linkedin": "${linkedinUrl}"
  },
  "note": "LinkedIn data import requires the user to manually provide profile data or use LinkedIn's official API"
}

Return valid JSON only.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { temperature: 0.1 },
  });
  
  const text = response.text || "{}";
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  return JSON.parse(jsonMatch[1] || text);
}
