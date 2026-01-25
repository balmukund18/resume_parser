import { GoogleGenAI } from "@google/genai";
import { createModuleLogger } from "./logger";
import type { 
  ParsedResume, Metadata, SkillsGapResult, ResumeScoreResult, 
  JobMatchResult, KeywordOptimization, CredibilityResult, ImpactQuantificationResult 
} from "@shared/schema";

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

const RESUME_PARSING_PROMPT = `You are an expert resume-parsing and document-analysis AI.

Analyze the following resume text and extract structured information. 

CRITICAL: LINK EXTRACTION IS A FIRST-CLASS FEATURE
Extract EVERY link found in the document, including:
- Visible URLs written as text
- Embedded or hidden hyperlinks (anchor text with URL)
- Shortened or masked links
- Profile links: LinkedIn, GitHub, LeetCode, Codeforces, HackerRank, Kaggle, Portfolio, Personal Website
- Project links: Live demos, GitHub repos, deployed apps, documentation
- Experience links: Company websites, product pages, tools, platforms
- Education links: Institution websites, course pages, certificates
- Certification links: Credential verification or issuer links

Return a JSON object with the following structure:
{
  "name": "Full name of the candidate",
  "contactInfo": {
    "email": "Email address or null",
    "phone": "Phone number or null",
    "address": "Location/address or null",
    "linkedin": "LinkedIn URL or null",
    "github": "GitHub URL or null",
    "portfolio": "Portfolio/personal website URL or null",
    "leetcode": "LeetCode URL or null",
    "hackerrank": "HackerRank URL or null",
    "kaggle": "Kaggle URL or null",
    "codeforces": "Codeforces URL or null",
    "twitter": "Twitter/X URL or null",
    "otherProfiles": ["Array of other profile URLs"]
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
      "links": ["Any URLs mentioned in this experience entry"],
      "confidenceScore": 0-100
    }
  ],
  "education": [
    {
      "institution": "School/University name",
      "degree": "Degree title",
      "graduationDate": "Graduation date or null",
      "gpa": GPA as number or null,
      "links": ["Institution website, course links, etc."],
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
      "demoUrl": "Live demo URL or null",
      "repoUrl": "GitHub/repo URL or null",
      "confidenceScore": 0-100
    }
  ],
  "certifications": [
    {
      "name": "Certification name",
      "issuer": "Issuing organization",
      "issueDate": "Issue date or null",
      "expirationDate": "Expiration date or null",
      "credentialUrl": "Verification/credential URL or null",
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
  "links": {
    "profiles": [{"url": "URL", "anchorText": "text or null", "platform": "LinkedIn/GitHub/etc", "confidenceScore": 0-100}],
    "projects": [{"url": "URL", "anchorText": "text or null", "projectName": "if identifiable", "confidenceScore": 0-100}],
    "additional": [{"url": "URL", "anchorText": "text or null", "context": "where found", "confidenceScore": 0-100}]
  },
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
- Deduplicate links and normalize URLs (use https, remove tracking parameters)
- Do NOT hallucinate or infer links that are not explicitly present
- Link extraction must be treated as a FIRST-CLASS feature - missing links is a parsing failure

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
 * Import LinkedIn profile data from a URL - provides instructions
 */
export async function importFromLinkedIn(linkedinUrl: string): Promise<{ 
  username: string | null;
  profileUrl: string;
  instructions: string[];
}> {
  // Extract username from LinkedIn URL
  const usernameMatch = linkedinUrl.match(/linkedin\.com\/in\/([^\/\?]+)/);
  const username = usernameMatch ? usernameMatch[1] : null;
  
  return {
    username,
    profileUrl: linkedinUrl,
    instructions: [
      "1. Open your LinkedIn profile in a browser",
      "2. Click the 'More' button (three dots) near your profile photo",
      "3. Select 'Save to PDF' from the dropdown menu",
      "4. Wait for LinkedIn to generate your PDF",
      "5. Download the PDF and upload it to this resume parser",
      "6. The parser will extract all your profile data automatically"
    ]
  };
}

/**
 * Check resume credibility - flags overlapping dates, unrealistic timelines, etc.
 */
export async function checkCredibility(resume: ParsedResume): Promise<CredibilityResult> {
  const ai = getGeminiClient();
  
  const experienceDetails = resume.experience.map(e => ({
    position: e.position,
    company: e.company,
    startDate: e.startDate,
    endDate: e.endDate,
    responsibilities: e.responsibilities.length,
  }));

  const prompt = `You are a resume credibility analyst. Analyze this resume for potential red flags and inconsistencies.

RESUME DATA:
Name: ${resume.name}
Total Experience Entries: ${resume.experience.length}
Experience Timeline:
${JSON.stringify(experienceDetails, null, 2)}

Skills: ${[...resume.skills.technical, ...resume.skills.soft].join(", ")}

Education:
${resume.education.map(e => `${e.degree} from ${e.institution} (${e.graduationDate || 'N/A'})`).join("\n")}

ANALYSIS REQUIREMENTS:
1. Check for overlapping job dates
2. Check for unrealistic career progression (e.g., junior to CEO in 2 years)
3. Check for skill-experience mismatch (e.g., "10 years React" but only 3 years total experience)
4. Check for employment gaps (not necessarily bad, just note them)
5. Check if claimed expertise matches experience level
6. Look for too many senior roles too quickly

Return a JSON response:
{
  "credibilityScore": 0-100 (100 = highly credible, lower = more red flags),
  "flags": [
    {
      "type": "overlapping_dates" | "unrealistic_timeline" | "skill_mismatch" | "rapid_progression" | "gap_detected" | "other",
      "severity": "low" | "medium" | "high",
      "message": "Brief description of the issue",
      "details": "More context if needed"
    }
  ],
  "timelineAnalysis": {
    "totalYearsExperience": number,
    "careerStartYear": number or null,
    "averageTenure": number (average months per position),
    "gaps": [
      { "start": "YYYY-MM", "end": "YYYY-MM", "durationMonths": number }
    ]
  },
  "overallAssessment": "Summary of credibility analysis - be fair and objective"
}

IMPORTANT:
- Be objective, not accusatory. These are flags for review, not accusations.
- A gap is not a red flag by itself, just note it.
- Some rapid progression is normal in fast-growing industries.
- If the resume looks credible, give a high score and minimal flags.

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
 * Quantify impact - improve weak resume bullets with metrics and strong verbs
 */
export async function quantifyImpact(resume: ParsedResume): Promise<ImpactQuantificationResult> {
  const ai = getGeminiClient();
  
  // Collect all bullet points from experience
  const allBullets: string[] = [];
  resume.experience.forEach(exp => {
    allBullets.push(...exp.responsibilities);
    allBullets.push(...exp.achievements);
  });

  const prompt = `You are an expert resume writer. Analyze these resume bullet points and identify weak ones that lack impact, metrics, or strong action verbs.

BULLET POINTS TO ANALYZE:
${allBullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}

WEAK BULLET INDICATORS:
- Vague verbs: "worked on", "helped with", "was responsible for", "assisted"
- No quantifiable results
- Missing context or scope
- Passive voice
- No mention of impact or outcomes

YOUR TASK:
1. Identify weak bullets
2. Rewrite each weak bullet to be stronger with:
   - Strong action verbs (Led, Developed, Implemented, Increased, Reduced, etc.)
   - Quantifiable metrics when possible (%, $, numbers)
   - Clear context and impact
   - If metrics aren't available, suggest placeholders like "X%" or "[number]"

Return a JSON response:
{
  "weakBulletsCount": number of bullets that need improvement,
  "improvedBullets": [
    {
      "original": "the original weak bullet",
      "improved": "the stronger rewritten version",
      "improvementType": "added_metrics" | "stronger_verbs" | "added_context" | "quantified_results" | "clarified_impact",
      "confidenceScore": 0-100 (how confident you are in this improvement)
    }
  ],
  "overallImpactScore": 0-100 (how impactful the resume bullets are overall),
  "suggestions": ["general tips for improving resume impact"]
}

EXAMPLES OF IMPROVEMENTS:
Original: "Worked on backend APIs"
Improved: "Developed RESTful APIs serving 20K+ daily requests, reducing response time by 35%"

Original: "Helped with customer issues"
Improved: "Resolved 50+ customer support tickets weekly, achieving 98% satisfaction rating"

Only return valid JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { temperature: 0.3 },
  });
  
  const text = response.text || "{}";
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  return JSON.parse(jsonMatch[1] || text);
}
