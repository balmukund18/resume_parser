import { createModuleLogger } from "./logger";
import { generateContentWithFallback } from "./ai-client";
import type { ExtractedLink } from "./text-extractor";
import type { 
  ParsedResume, Metadata, SkillsGapResult, ResumeScoreResult, 
  JobMatchResult, KeywordOptimization, CredibilityResult, ImpactQuantificationResult 
} from "@shared/schema";

const logger = createModuleLogger("ResumeParser");

/**
 * Extract and parse JSON from AI response text
 * Handles multiple formats: markdown code blocks, plain JSON, JSON with surrounding text
 */
function extractJSONFromResponse(responseText: string, functionName: string): any {
  if (!responseText || responseText.trim().length === 0) {
    throw new Error(`Empty response from AI in ${functionName}`);
  }

  let jsonStr = responseText.trim();
  
  // Strategy 1: Extract from markdown code blocks (```json ... ``` or ``` ... ```)
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    // Strategy 2: Find JSON object boundaries { ... }
    const objectMatch = responseText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    } else {
      // Strategy 3: Try to find JSON array [ ... ]
      const arrayMatch = responseText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonStr = arrayMatch[0];
      }
    }
  }
  
  // Clean up common issues
  jsonStr = jsonStr
    .replace(/^[^{[]*/, '') // Remove leading non-JSON text
    .replace(/[^}\]]*$/, '') // Remove trailing non-JSON text
    .trim();
  
  if (jsonStr.length < 2) {
    logger.error(`No valid JSON found in ${functionName} response`, {
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 500),
    });
    throw new Error(`No valid JSON found in AI response for ${functionName}`);
  }
  
  try {
    return JSON.parse(jsonStr);
  } catch (parseError: any) {
    logger.error(`Failed to parse JSON in ${functionName}`, {
      error: parseError.message,
      responseLength: responseText.length,
      extractedLength: jsonStr.length,
      responsePreview: responseText.substring(0, 500),
      extractedPreview: jsonStr.substring(0, 500),
      position: parseError.message.match(/position (\d+)/)?.[1],
    });
    
    throw new Error(`Failed to parse AI response in ${functionName}: ${parseError.message}`);
  }
}

const RESUME_PARSING_PROMPT = `You are an expert resume-parsing and document-analysis AI with deep knowledge of resume formats, industry standards, and data extraction best practices.

Your task is to analyze the provided resume text and extract structured, accurate information with high precision.

## CRITICAL REQUIREMENTS

### 1. HYPERLINK EXTRACTION (FIRST-CLASS FEATURE)
I will provide you with:
- Resume text content
- Extracted hyperlinks with anchor text, URLs, and section context

You MUST extract and categorize EVERY link:
- **Profile Links**: LinkedIn, GitHub, LeetCode, Codeforces, HackerRank, Kaggle, Portfolio, Personal Website, Twitter/X, Medium, Dev.to, Stack Overflow, Behance, Dribbble
- **Project Links**: Live demos, GitHub repos, deployed apps, documentation, case studies
- **Experience Links**: Company websites, product pages, tools, platforms, press releases
- **Education Links**: Institution websites, course pages, certificates, transcripts
- **Certification Links**: Credential verification URLs, issuer websites, badge links

**PRIORITY**: Use the provided extracted hyperlinks (they have accurate anchor text and section context) over URLs found in plain text.

### 2. ACCURACY PRINCIPLES
- Extract ONLY information explicitly present in the resume
- Do NOT infer, assume, or hallucinate data
- If information is ambiguous, use null or mark with lower confidence
- Preserve exact wording for names, titles, and companies
- Normalize dates to consistent formats (YYYY-MM-DD, YYYY-MM, or YYYY)
- Deduplicate skills, experiences, and other entries

### 3. DATE PARSING RULES
- Parse dates in various formats: "Jan 2020", "January 2020", "01/2020", "2020-01", "2020"
- Convert relative dates: "Present" → "Present", "Current" → "Present"
- Handle partial dates: "2020" → "2020", "Jan 2020" → "2020-01"
- If only year is available, use YYYY format
- If month and year, use YYYY-MM format
- If full date, use YYYY-MM-DD format
- For ongoing positions, use "Present" as endDate

### 4. SKILL EXTRACTION GUIDELINES
- **Technical Skills**: Programming languages, frameworks, tools, platforms, methodologies, databases, cloud services, APIs, libraries
- **Soft Skills**: Communication, leadership, teamwork, problem-solving, time management, adaptability, creativity
- Extract skills from multiple sections: Skills section, Experience descriptions, Projects, Certifications
- Normalize skill names (e.g., "JS" → "JavaScript", "React.js" → "React")
- Group related skills (e.g., "AWS", "Amazon Web Services" → "AWS")
- Remove duplicates and variations`;

const RESUME_JSON_SCHEMA = `
## OUTPUT FORMAT (Strict JSON Schema)

You must return a valid JSON object matching this exact structure:

{
  "name": "Full legal name of the candidate (extract from header/contact section)",
  "contactInfo": {
    "email": "Primary email address (normalize to lowercase) or null",
    "phone": "Phone number in international format if possible, or as written, or null",
    "address": "Full address, city/state, or location (as written) or null",
    "linkedin": "Full LinkedIn profile URL (normalize to https://) or null",
    "github": "Full GitHub profile URL (normalize to https://) or null",
    "portfolio": "Portfolio/personal website URL or null",
    "leetcode": "LeetCode profile URL or null",
    "hackerrank": "HackerRank profile URL or null",
    "kaggle": "Kaggle profile URL or null",
    "codeforces": "Codeforces profile URL or null",
    "twitter": "Twitter/X profile URL or null",
    "otherProfiles": ["Array of other profile URLs (Medium, Dev.to, Stack Overflow, etc.)"]
  },
  "summary": "Professional summary, objective, or profile statement (preserve original wording) or null",
  "experience": [
    {
      "company": "Exact company name as written",
      "position": "Exact job title as written",
      "startDate": "Start date in YYYY-MM-DD, YYYY-MM, or YYYY format, or null",
      "endDate": "End date in same format, or 'Present' for current role, or null",
      "responsibilities": ["Array of job responsibilities/bullet points (preserve original wording)"],
      "achievements": ["Array of notable achievements, metrics, awards (preserve original wording)"],
      "links": ["Array of URLs related to this experience (company website, products, tools)"],
      "confidenceScore": 0-100 (confidence in accuracy of this entry)
    }
  ],
  "education": [
    {
      "institution": "Full institution name as written",
      "degree": "Complete degree title (e.g., 'Bachelor of Science in Computer Science')",
      "graduationDate": "Graduation date in YYYY-MM-DD, YYYY-MM, or YYYY format, or null",
      "gpa": GPA as number (e.g., 3.8) or null if not mentioned,
      "links": ["Array of URLs (institution website, course pages, certificates)"],
      "confidenceScore": 0-100
    }
  ],
  "skills": {
    "technical": ["Array of technical/hard skills (normalize variations, remove duplicates)"],
    "soft": ["Array of soft/interpersonal skills"],
    "confidenceScore": 0-100
  },
  "projects": [
    {
      "name": "Project name as written",
      "description": "Project description (preserve key details)",
      "technologies": ["Array of technologies, frameworks, tools used"],
      "url": "Main project URL or null",
      "demoUrl": "Live demo URL or null",
      "repoUrl": "GitHub/repository URL or null",
      "confidenceScore": 0-100
    }
  ],
  "certifications": [
    {
      "name": "Full certification name",
      "issuer": "Issuing organization (e.g., 'Amazon Web Services', 'Google Cloud')",
      "issueDate": "Issue date in YYYY-MM-DD, YYYY-MM, or YYYY format, or null",
      "expirationDate": "Expiration date in same format, or null if not applicable",
      "credentialUrl": "Verification/credential URL or null",
      "confidenceScore": 0-100
    }
  ],
  "languages": [
    {
      "language": "Language name (e.g., 'English', 'Spanish', 'Mandarin Chinese')",
      "proficiency": "Proficiency level: 'Native', 'Fluent', 'Professional', 'Conversational', or 'Basic'",
      "confidenceScore": 0-100
    }
  ],
  "links": {
    "profiles": [
      {
        "url": "Full URL (normalize to https://)",
        "anchorText": "Anchor text from hyperlink or null",
        "platform": "Platform name (LinkedIn/GitHub/LeetCode/HackerRank/Kaggle/Codeforces/Portfolio/Twitter/Medium/etc)",
        "confidenceScore": 0-100
      }
    ],
    "projects": [
      {
        "url": "Full URL",
        "anchorText": "Anchor text or null",
        "projectName": "Project name if identifiable from context, or null",
        "confidenceScore": 0-100
      }
    ],
    "additional": [
      {
        "url": "Full URL",
        "anchorText": "Anchor text or null",
        "context": "Where found (e.g., 'experience at Company X', 'education section', 'certification')",
        "confidenceScore": 0-100
      }
    ]
  },
  "detectedLanguage": "Language code: 'en' for English, 'es' for Spanish, or other ISO 639-1 codes"
}

## HYPERLINK PROCESSING INSTRUCTIONS

### Step 1: Section-Specific Link Placement
Place links in their relevant sections FIRST:
- **Experience links** → experience[].links array (company websites, product pages, tools, platforms)
- **Education links** → education[].links array (institution websites, course pages, certificates)
- **Project URLs** → projects array with url (main), demoUrl (live demo), repoUrl (source code)
- **Certification links** → certifications[].credentialUrl (verification URLs)
- **Profile links** → contactInfo fields (linkedin, github, portfolio, etc.)

### Step 2: Comprehensive Links Section
ALSO include ALL links in the main links object:
- **profiles**: All social/professional profiles (LinkedIn, GitHub, LeetCode, etc.)
- **projects**: All project-related links (demos, repos, documentation)
- **additional**: All other links with context about where they were found

### Step 3: Link Processing Priority
1. **First**: Use extracted hyperlinks provided below (they have accurate anchor text and section context)
2. **Second**: Match links to sections based on the 'section' field from extracted hyperlinks
3. **Third**: Extract any additional visible URLs from resume text
4. **Fourth**: Ensure every link appears in BOTH its relevant section AND the comprehensive links object

### Step 4: Section Context Mapping
Use the 'section' field from extracted hyperlinks:
- link.section = 'experience' → Add to relevant experience[].links
- link.section = 'education' → Add to relevant education[].links
- link.section = 'projects' → Add to projects array url, demoUrl, or repoUrl fields
- link.section = 'certifications' → Add to certifications[].credentialUrl
- link.section = 'contact' → Add to contactInfo fields

### Step 5: URL Normalization
- Convert all URLs to HTTPS
- Remove tracking parameters (utm_*, ref=, etc.)
- Remove trailing slashes
- Deduplicate identical URLs
- Preserve anchor text when available

## CONFIDENCE SCORING GUIDELINES

Assign confidence scores (0-100) based on certainty:
- **90-100 (High)**: Information is explicitly stated, clear, and unambiguous
- **70-89 (Medium)**: Information is inferred from context but reasonably certain
- **50-69 (Low-Medium)**: Information is somewhat ambiguous or partially inferred
- **Below 50 (Low)**: Information is uncertain, highly inferred, or potentially incorrect

Apply confidence scores to:
- Each experience entry
- Each education entry
- Skills section overall
- Each project
- Each certification
- Each language
- Each link

## CRITICAL RULES

1. **Accuracy First**: Extract ONLY information explicitly present. Do NOT infer or assume.
2. **Null vs Empty**: Use null for missing optional fields, empty arrays [] for missing lists
3. **Date Formats**: Normalize to YYYY-MM-DD, YYYY-MM, or YYYY (prefer most specific format available)
4. **Name Preservation**: Preserve exact wording for names, titles, companies, institutions
5. **Deduplication**: Remove duplicate skills, experiences, projects, certifications
6. **Link Extraction**: Missing links is a parsing failure - extract ALL links
7. **No Hallucination**: Do NOT create links, skills, or experiences that aren't in the resume
8. **Language Detection**: Detect primary language (en, es, fr, de, etc.) based on content

## OUTPUT REQUIREMENTS

- Return ONLY valid JSON (no markdown, no code blocks, no explanations)
- Ensure all required fields are present
- Use proper JSON escaping for special characters
- Maintain consistent date formats throughout
- Normalize all URLs to HTTPS
- Preserve original wording in descriptions and summaries

---

## RESUME TEXT TO ANALYZE:
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
  extractedLinks: ExtractedLink[],
  metadata: Omit<Metadata, "processingTime" | "overallConfidence" | "language">
): Promise<ParseResult> {
  const startTime = Date.now();
  logger.info("Starting AI resume parsing");
  
  // Prepare hyperlinks context
  let hyperlinkContext = "\n\nEXTRACTED HYPERLINKS:\n";
  if (extractedLinks.length > 0) {
    hyperlinkContext += extractedLinks.map((link, i) => 
      `${i + 1}. Text: "${link.text}" -> URL: ${link.url} (${link.context || 'Document'})`
    ).join('\n');
    logger.info(`Processing ${extractedLinks.length} extracted hyperlinks`);
  } else {
    hyperlinkContext += "No embedded hyperlinks found in document.\n";
  }
  
  hyperlinkContext += "\nRESUME TEXT:\n";
  
  try {
    const fullPrompt = RESUME_PARSING_PROMPT + RESUME_JSON_SCHEMA + hyperlinkContext + text;
    const response = await generateContentWithFallback({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
      config: {
        maxOutputTokens: 8192,
        temperature: 0.1,
      },
    });
    
    const responseText = response.text || "";
    logger.info(`Received response from ${response.provider} (${responseText.length} chars)`);
    
    // Extract and parse JSON using helper function
    const parsedData = extractJSONFromResponse(responseText, "parseResumeWithAI");
    
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
        portfolio: parsedData.contactInfo?.portfolio || undefined,
        leetcode: parsedData.contactInfo?.leetcode || undefined,
        hackerrank: parsedData.contactInfo?.hackerrank || undefined,
        kaggle: parsedData.contactInfo?.kaggle || undefined,
        codeforces: parsedData.contactInfo?.codeforces || undefined,
        twitter: parsedData.contactInfo?.twitter || undefined,
        otherProfiles: parsedData.contactInfo?.otherProfiles || undefined,
      },
      summary: parsedData.summary || undefined,
      experience: (parsedData.experience || []).map((exp: any) => ({
        company: exp.company || "",
        position: exp.position || "",
        startDate: exp.startDate || undefined,
        endDate: exp.endDate || undefined,
        responsibilities: exp.responsibilities || [],
        achievements: exp.achievements || [],
        links: exp.links || undefined,
        confidenceScore: exp.confidenceScore || 75,
      })),
      education: (parsedData.education || []).map((edu: any) => ({
        institution: edu.institution || "",
        degree: edu.degree || "",
        graduationDate: edu.graduationDate || undefined,
        gpa: edu.gpa || undefined,
        links: edu.links || undefined,
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
        demoUrl: proj.demoUrl || undefined,
        repoUrl: proj.repoUrl || undefined,
        confidenceScore: proj.confidenceScore || 75,
      })),
      certifications: (parsedData.certifications || []).map((cert: any) => ({
        name: cert.name || "",
        issuer: cert.issuer || "",
        issueDate: cert.issueDate || undefined,
        expirationDate: cert.expirationDate || undefined,
        credentialUrl: cert.credentialUrl || undefined,
        confidenceScore: cert.confidenceScore || 75,
      })),
      languages: (parsedData.languages || []).map((lang: any) => ({
        language: lang.language || "",
        proficiency: lang.proficiency || "Professional",
        confidenceScore: lang.confidenceScore || 75,
      })),
      links: parsedData.links ? {
        profiles: parsedData.links.profiles || [],
        projects: parsedData.links.projects || [],
        additional: parsedData.links.additional || [],
      } : undefined,
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
  const prompt = `You are an expert recruiter and career advisor analyzing the skills gap between a candidate's resume and a job description.

## TASK
Perform a comprehensive skills gap analysis to determine:
1. How well the candidate matches the job requirements
2. Which skills the candidate already has
3. Which critical skills are missing
4. Actionable recommendations to improve the match

## CANDIDATE SKILLS
**Technical Skills:** ${resumeSkills.technical.length > 0 ? resumeSkills.technical.join(", ") : "None listed"}
**Soft Skills:** ${resumeSkills.soft.length > 0 ? resumeSkills.soft.join(", ") : "None listed"}

## JOB DESCRIPTION
**Job Title:** ${jobDescription.title}
**Job Description:** ${jobDescription.description}
${jobDescription.requiredSkills ? `**Required Skills:** ${jobDescription.requiredSkills.join(", ")}` : ""}

## ANALYSIS INSTRUCTIONS

1. **Extract Required Skills**: Identify all skills mentioned in the job description (both explicit and implicit)
   - Technical skills: programming languages, frameworks, tools, platforms, methodologies
   - Soft skills: communication, leadership, teamwork, problem-solving, etc.
   - Domain knowledge: industry-specific knowledge, regulations, standards

2. **Match Skills**: Compare candidate skills with job requirements
   - Consider variations (e.g., "JS" = "JavaScript", "React.js" = "React")
   - Consider related skills (e.g., "AWS" includes knowledge of cloud computing)
   - Be fair but thorough

3. **Calculate Match Score**: 
   - 90-100: Excellent match - candidate has most/all required skills
   - 70-89: Good match - candidate has core skills, missing some advanced/preferred
   - 50-69: Moderate match - candidate has some skills but missing key requirements
   - Below 50: Poor match - significant skills gap

4. **Identify Missing Skills**: List skills that are:
   - Explicitly required in the job description
   - Implicitly necessary based on the role
   - Preferred/desirable skills that would strengthen the application

5. **Provide Recommendations**: Give specific, actionable advice:
   - Which skills to learn/improve (prioritized by importance)
   - How to gain these skills (courses, projects, certifications)
   - How to highlight transferable skills
   - How to frame existing experience to match requirements

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no explanations):

{
  "matchScore": 0-100,
  "matchingSkills": ["array of skills candidate has that match job requirements"],
  "missingSkills": ["array of skills job requires that candidate lacks (prioritized by importance)"],
  "recommendations": [
    "Specific, actionable recommendation 1",
    "Specific, actionable recommendation 2",
    "..."
  ]
}

Be thorough, specific, and constructive. Only return valid JSON.`;

  const response = await generateContentWithFallback({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { temperature: 0.2 },
  });
  
  return extractJSONFromResponse(response.text || "", "analyzeSkillsGap");
}

/**
 * Score a resume based on completeness and quality
 */
export async function scoreResume(resume: ParsedResume): Promise<ResumeScoreResult> {
  const experienceDetails = resume.experience.map(e => ({
    position: e.position,
    company: e.company,
    duration: e.startDate && e.endDate ? `${e.startDate} to ${e.endDate}` : "Dates not specified",
    responsibilities: e.responsibilities.length,
    achievements: e.achievements.length,
    hasMetrics: e.achievements.some(a => /\d+%|\$|\d+\+/.test(a)) || e.responsibilities.some(r => /\d+%|\$|\d+\+/.test(r))
  }));

  const prompt = `You are an expert resume reviewer and career coach. Evaluate this resume comprehensively and provide detailed scoring and feedback.

## RESUME OVERVIEW
**Name:** ${resume.name}
**Summary/Objective:** ${resume.summary || "Not provided"}
**Total Experience Entries:** ${resume.experience.length}
**Education Entries:** ${resume.education.length}
**Technical Skills Count:** ${resume.skills.technical.length}
**Soft Skills Count:** ${resume.skills.soft.length}
**Projects:** ${resume.projects.length}
**Certifications:** ${resume.certifications.length}
**Languages:** ${resume.languages?.length || 0}

## EXPERIENCE DETAILS
${JSON.stringify(experienceDetails, null, 2)}

## TECHNICAL SKILLS
${resume.skills.technical.length > 0 ? resume.skills.technical.join(", ") : "None listed"}

## SOFT SKILLS
${resume.skills.soft.length > 0 ? resume.skills.soft.join(", ") : "None listed"}

## SCORING CRITERIA

Evaluate each aspect on a scale of 0-100:

1. **Completeness Score (0-100)**
   - All major sections present (contact, summary, experience, education, skills)
   - Each section has sufficient detail
   - No critical information missing
   - Professional summary/objective provided

2. **Keyword Score (0-100)**
   - Industry-relevant keywords present
   - ATS-friendly terminology
   - Appropriate technical jargon
   - Action verbs used effectively

3. **Formatting Score (0-100)**
   - Well-structured data (implies good formatting)
   - Consistent date formats
   - Clear section organization
   - Professional presentation

4. **Experience Score (0-100)**
   - Relevance and quality of positions
   - Quantifiable achievements present
   - Clear progression/advancement
   - Appropriate level of detail
   - Strong action verbs and impact statements

5. **Education Score (0-100)**
   - Relevance of education to career
   - Prestigious institutions (if applicable)
   - Additional credentials (certifications, courses)
   - GPA mentioned (if strong)

6. **Skills Score (0-100)**
   - Breadth and depth of technical skills
   - Balance of hard and soft skills
   - Relevance to target industry
   - Modern/current technologies
   - Skill diversity

7. **Overall Score (0-100)**
   - Weighted average: Experience (30%), Skills (25%), Completeness (20%), Keywords (15%), Education (10%)

## FEEDBACK REQUIREMENTS

Provide specific, actionable suggestions:
- What's missing or weak
- How to improve each section
- Industry best practices to follow
- Common mistakes to avoid
- Prioritized recommendations

## OUTPUT FORMAT
Return ONLY valid JSON:

{
  "overallScore": 0-100,
  "completenessScore": 0-100,
  "keywordScore": 0-100,
  "formattingScore": 0-100,
  "experienceScore": 0-100,
  "educationScore": 0-100,
  "skillsScore": 0-100,
  "suggestions": [
    "Specific, prioritized improvement suggestion 1",
    "Specific, prioritized improvement suggestion 2",
    "..."
  ]
}

Be critical but constructive. Only return valid JSON.`;

  const response = await generateContentWithFallback({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { temperature: 0.2 },
  });
  
  return extractJSONFromResponse(response.text || "", "scoreResume");
}

/**
 * Match resume against a job description
 */
export async function matchResumeToJob(
  resume: ParsedResume,
  jobDescription: { title: string; company?: string; description: string }
): Promise<JobMatchResult> {
  const experienceSummary = resume.experience.map(e => 
    `${e.position} at ${e.company}${e.startDate ? ` (${e.startDate}${e.endDate ? ` - ${e.endDate}` : " - Present"})` : ""}`
  ).join("; ");

  const prompt = `You are an expert recruiter evaluating how well a candidate matches a job position. Perform a comprehensive match analysis.

## CANDIDATE PROFILE
**Name:** ${resume.name}
**Summary:** ${resume.summary || "Not provided"}
**Total Experience:** ${resume.experience.length} position(s)
**Experience History:** ${experienceSummary || "No experience listed"}
**Education:** ${resume.education.map(e => `${e.degree} from ${e.institution}${e.graduationDate ? ` (${e.graduationDate})` : ""}`).join("; ") || "Not provided"}
**Technical Skills:** ${resume.skills.technical.length > 0 ? resume.skills.technical.join(", ") : "None listed"}
**Soft Skills:** ${resume.skills.soft.length > 0 ? resume.skills.soft.join(", ") : "None listed"}
**Projects:** ${resume.projects.length} project(s)
**Certifications:** ${resume.certifications.length} certification(s)

## JOB REQUIREMENTS
**Job Title:** ${jobDescription.title}
${jobDescription.company ? `**Company:** ${jobDescription.company}` : ""}
**Job Description:** ${jobDescription.description}

## MATCH ANALYSIS INSTRUCTIONS

Evaluate the candidate across multiple dimensions:

1. **Skills Match (0-100)**
   - Compare candidate's technical and soft skills with job requirements
   - Consider skill depth, relevance, and currency
   - Weight required skills higher than preferred skills
   - Consider transferable skills

2. **Experience Match (0-100)**
   - Relevance of past roles to the target position
   - Years of experience vs. requirements
   - Industry experience alignment
   - Career progression and advancement
   - Achievements and impact in similar roles

3. **Education Match (0-100)**
   - Degree relevance to job requirements
   - Institution reputation (if relevant)
   - Additional credentials (certifications, courses)
   - Continuous learning indicators

4. **Overall Match Score (0-100)**
   - Weighted combination: Skills (40%), Experience (40%), Education (20%)
   - Consider both hard requirements and soft factors
   - Be realistic but fair

5. **Match Reasons**
   - Specific strengths that make them a good fit
   - Specific gaps or concerns
   - Transferable skills or experiences
   - Potential for growth/learning curve

## OUTPUT FORMAT
Return ONLY valid JSON:

{
  "matchScore": 0-100,
  "skillsMatch": 0-100,
  "experienceMatch": 0-100,
  "educationMatch": 0-100,
  "reasons": [
    "Specific reason 1 (strength or gap)",
    "Specific reason 2",
    "..."
  ]
}

Be thorough, specific, and objective. Only return valid JSON.`;

  const response = await generateContentWithFallback({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { temperature: 0.2 },
  });
  
  return extractJSONFromResponse(response.text || "", "matchResumeToJob");
}

/**
 * Suggest keywords for ATS optimization
 */
export async function optimizeKeywords(
  resume: ParsedResume,
  targetJobDescription?: { title: string; description: string }
): Promise<KeywordOptimization> {
  const jobContext = targetJobDescription 
    ? `## TARGET JOB
**Title:** ${targetJobDescription.title}
**Description:** ${targetJobDescription.description}

**Analysis Focus:** Optimize resume keywords to match this specific job posting.`
    : `## GENERAL ATS OPTIMIZATION
**Analysis Focus:** Provide general ATS optimization recommendations for better visibility across job postings.`;
  
  const prompt = `You are an ATS (Applicant Tracking System) optimization expert. Analyze this resume for keyword optimization and ATS compatibility.

## RESUME CONTENT
**Name:** ${resume.name}
**Summary/Objective:** ${resume.summary || "Not provided"}
**Technical Skills:** ${resume.skills.technical.join(", ") || "None"}
**Soft Skills:** ${resume.skills.soft.join(", ") || "None"}
**Experience Positions:** ${resume.experience.length}
**Projects:** ${resume.projects.length}
**Certifications:** ${resume.certifications.length}

**Experience Highlights:**
${resume.experience.map((e, i) => `${i + 1}. ${e.position} at ${e.company}\n   Responsibilities: ${e.responsibilities.slice(0, 2).join("; ")}`).join("\n")}

${jobContext}

## ATS OPTIMIZATION ANALYSIS

### 1. Existing Keywords Analysis
Identify keywords already present that are:
- ATS-friendly (common industry terms)
- Action verbs (Led, Developed, Implemented, etc.)
- Technical terms relevant to the field
- Industry-standard terminology
- Quantifiable metrics and achievements

### 2. Missing Keywords Analysis
Identify important keywords that are:
- Mentioned in job description (if provided)
- Industry-standard terms for the role
- Common ATS search terms
- Skills/technologies expected for the position
- Certifications or credentials relevant to the field

### 3. Suggested Phrases
Provide specific phrases the candidate should add:
- Action verb + achievement combinations
- Industry-specific terminology
- Quantifiable impact statements
- Skill + context combinations
- Certification mentions

### 4. ATS Score Calculation
Rate ATS compatibility (0-100) based on:
- Keyword density and relevance
- Action verb usage
- Quantifiable achievements
- Industry terminology presence
- Skill keyword optimization
- Formatting implications (based on structure)

**Scoring Guide:**
- 90-100: Excellent ATS optimization
- 70-89: Good optimization, minor improvements needed
- 50-69: Moderate optimization, significant improvements needed
- Below 50: Poor optimization, major improvements required

## OUTPUT FORMAT
Return ONLY valid JSON:

{
  "existingKeywords": ["keyword1", "keyword2", "..."],
  "missingKeywords": ["missing_keyword1", "missing_keyword2", "..."],
  "suggestedPhrases": [
    "Specific phrase suggestion 1",
    "Specific phrase suggestion 2",
    "..."
  ],
  "atsScore": 0-100
}

Be specific and actionable. Only return valid JSON.`;

  const response = await generateContentWithFallback({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { temperature: 0.2 },
  });
  
  return extractJSONFromResponse(response.text || "", "optimizeKeywords");
}

/**
 * Check resume credibility - flags overlapping dates, unrealistic timelines, etc.
 */
export async function checkCredibility(resume: ParsedResume): Promise<CredibilityResult> {
  // Pre-calculate all date-related metrics
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // Parse dates and calculate experience
  const parsedExperiences = resume.experience.map(exp => {
    const parseDate = (dateStr: string | null | undefined): { year: number; month: number } | null => {
      if (!dateStr || dateStr === "Present") return null;
      // Handle formats: YYYY-MM-DD, YYYY-MM, YYYY
      const parts = dateStr.split("-");
      const year = parseInt(parts[0], 10);
      const month = parts.length > 1 ? parseInt(parts[1], 10) : 1;
      if (isNaN(year) || isNaN(month)) return null;
      return { year, month };
    };
    
    const start = parseDate(exp.startDate);
    const end = exp.endDate === "Present" ? { year: currentYear, month: currentMonth } : parseDate(exp.endDate);
    
    return {
      position: exp.position,
      company: exp.company,
      startDate: exp.startDate,
      endDate: exp.endDate,
      start,
      end,
    };
  }).filter(exp => exp.start !== null); // Only include entries with valid start dates
  
  // Calculate total years of experience
  if (parsedExperiences.length === 0) {
    return {
      credibilityScore: 85,
      flags: [],
      timelineAnalysis: {
        totalYearsExperience: 0,
        averageTenure: 0,
        gaps: [],
      },
      overallAssessment: "Resume appears credible. No experience entries to analyze.",
    };
  }
  
  // Sort by start date
  parsedExperiences.sort((a, b) => {
    if (!a.start || !b.start) return 0;
    if (a.start.year !== b.start.year) return a.start.year - b.start.year;
    return a.start.month - b.start.month;
  });
  
  // Calculate total months of experience
  let totalMonths = 0;
  const sortedRanges: Array<{ start: { year: number; month: number }; end: { year: number; month: number } }> = [];
  
  parsedExperiences.forEach(exp => {
    if (exp.start && exp.end) {
      const startMonths = exp.start.year * 12 + exp.start.month;
      const endMonths = exp.end.year * 12 + exp.end.month;
      // Add 1 to include both start and end months (e.g., Jun-Jul = 2 months, not 1)
      totalMonths += (endMonths - startMonths + 1);
      sortedRanges.push({ start: exp.start, end: exp.end });
    }
  });
  
  const totalYearsExperience = Math.round((totalMonths / 12) * 10) / 10; // Round to 1 decimal
  const averageTenureMonths = Math.round((totalMonths / parsedExperiences.length) * 10) / 10;
  
  // Detect overlapping roles
  let overlapCount = 0;
  for (let i = 0; i < sortedRanges.length; i++) {
    for (let j = i + 1; j < sortedRanges.length; j++) {
      const range1 = sortedRanges[i];
      const range2 = sortedRanges[j];
      const start1 = range1.start.year * 12 + range1.start.month;
      const end1 = range1.end.year * 12 + range1.end.month;
      const start2 = range2.start.year * 12 + range2.start.month;
      const end2 = range2.end.year * 12 + range2.end.month;
      
      // Check if ranges overlap
      if (!(end1 < start2 || end2 < start1)) {
        overlapCount++;
      }
    }
  }
  
  // Detect employment gaps
  const gaps: Array<{ start: string; end: string; durationMonths: number }> = [];
  for (let i = 0; i < sortedRanges.length - 1; i++) {
    const currentEnd = sortedRanges[i].end;
    const nextStart = sortedRanges[i + 1].start;
    const gapEndMonths = currentEnd.year * 12 + currentEnd.month;
    const gapStartMonths = nextStart.year * 12 + nextStart.month;
    const gapMonths = gapStartMonths - gapEndMonths;
    
    // Consider gaps of 2+ months (allowing for 1 month transition)
    if (gapMonths >= 2) {
      gaps.push({
        start: `${currentEnd.year}-${String(currentEnd.month).padStart(2, '0')}`,
        end: `${nextStart.year}-${String(nextStart.month).padStart(2, '0')}`,
        durationMonths: gapMonths,
      });
    }
  }
  
  // Build experience timeline string
  const experienceTimeline = parsedExperiences.map(exp => 
    `${exp.position} at ${exp.company}: ${exp.startDate} to ${exp.endDate}`
  ).join("\n");
  
  // Build skills list (no years claimed)
  const skillsList = [...resume.skills.technical, ...resume.skills.soft].join(", ");
  
  // Build education summary
  const educationSummary = resume.education.map(e => 
    `${e.degree} from ${e.institution}${e.graduationDate ? ` (${e.graduationDate})` : ''}`
  ).join("\n");
  
  // Determine if this is a student/early-career resume
  const isStudentOrEarlyCareer = totalYearsExperience < 2 || 
    resume.education.some(e => {
      const gradYear = e.graduationDate ? parseInt(e.graduationDate.split("-")[0]) : null;
      return gradYear && gradYear >= currentYear - 2; // Graduated in last 2 years
    });

  // Classify each role as past, current, or future
  const roleClassifications = parsedExperiences.map(exp => {
    if (!exp.start) return { ...exp, classification: "unknown" };
    const startMonths = exp.start.year * 12 + exp.start.month;
    const currentMonths = currentYear * 12 + currentMonth;
    const isCurrent = exp.endDate === "Present" && startMonths <= currentMonths;
    const isFuture = startMonths > currentMonths;
    const isPast = !isCurrent && !isFuture;
    
    return {
      position: exp.position,
      company: exp.company,
      startDate: exp.startDate,
      endDate: exp.endDate,
      classification: isCurrent ? "current" : isFuture ? "future" : "past",
    };
  });

  const prompt = `You are a resume credibility reviewer.

CRITICAL: TODAY'S DATE IS ${currentYear}-${String(currentMonth).padStart(2, '0')}
You MUST use this exact date. Do NOT infer, guess, or assume the current date.

IMPORTANT CONTEXT:
All date calculations, overlaps, gaps, and experience durations have ALREADY been computed by code.
You MUST NOT calculate dates, durations, or timelines yourself.
You MUST NOT invent years of experience or assume skill durations.

Your task is to INTERPRET the verified facts below and highlight potential review points carefully and conservatively.

=====================
VERIFIED FACTS
=====================

TODAY'S DATE: ${currentYear}-${String(currentMonth).padStart(2, '0')}
(Use this to determine if roles are past, current, or future)

Total years of professional experience: ${totalYearsExperience}
Average tenure per role (months): ${averageTenureMonths}

Overlapping roles detected: ${overlapCount}
Employment gaps detected: ${gaps.length}

Resume Type: ${isStudentOrEarlyCareer ? "STUDENT/EARLY-CAREER" : "PROFESSIONAL"}
(Student/early-career resumes should be evaluated more leniently)

Role Classifications (pre-computed):
${roleClassifications.map(r => `- ${r.position} at ${r.company}: ${r.classification} (${r.startDate} to ${r.endDate})`).join("\n")}

Chronological experience:
${experienceTimeline}

Skills listed (no years claimed unless explicitly stated):
${skillsList}

Education:
${educationSummary}

=====================
ANALYSIS GUIDELINES
=====================

1. DO NOT calculate or infer dates, years, or durations. Use TODAY'S DATE provided above.
2. DO NOT assume seniority based on job titles alone.
3. DO NOT assume skill experience length unless explicitly stated.
4. Employment gaps are NOT negative by default — only note them.
   - Academic gaps (between education periods) are NORMAL and should NOT be flagged.
   - Planned internships or future roles are NORMAL for students and should NOT be flagged.
5. Overlapping roles are only high severity if they are unexplained and significant.
6. Rapid career growth can be normal — flag ONLY if extreme or implausible.
7. Be objective, neutral, and non-accusatory.
8. FUTURE-DATED ROLES: A role is only "future-dated" if its start date is AFTER today's date (${currentYear}-${String(currentMonth).padStart(2, '0')}).
   - Roles starting ON or BEFORE today are NOT future-dated.
   - Roles starting in the current month and marked "Present" are CURRENT roles, not future.
9. STUDENT/EARLY-CAREER RULES:
   - Do NOT penalize for academic gaps or planned internships.
   - Use softer scoring thresholds (start higher, deduct less).
   - Career changes and exploration are normal at this stage.

=====================
SCORING RULES
=====================

${isStudentOrEarlyCareer ? 
  `STUDENT/EARLY-CAREER SCORING (More Lenient):
- Start credibilityScore at 95 (higher baseline for students).
- Minor gap or overlap: −3 (smaller deduction).
- Clear but explainable issue: −5 (smaller deduction).
- Multiple moderate concerns: −10 (smaller deduction).
- Severe or repeated inconsistencies: up to −25 (smaller max deduction).
- NEVER score below 70 unless there are multiple high-severity issues.
- If no meaningful concerns exist, keep score between 85–100.` :
  `PROFESSIONAL SCORING:
- Start credibilityScore at 100.
- Minor gap or overlap: −5.
- Clear but explainable issue: −10.
- Multiple moderate concerns: −20.
- Severe or repeated inconsistencies: up to −40.
- NEVER score below 60 unless there are multiple high-severity issues.
- If no meaningful concerns exist, keep score between 85–100.`}

=====================
OUTPUT FORMAT
=====================

Return ONLY valid JSON in this exact schema:

{
  "credibilityScore": number,
  "flags": [
    {
      "type": "overlapping_dates" | "unrealistic_timeline" | "skill_mismatch" | "rapid_progression" | "gap_detected" | "other",
      "severity": "low" | "medium" | "high",
      "message": "Clear, neutral description of the review point",
      "details": "Optional additional context, if helpful"
    }
  ],
  "timelineAnalysis": {
    "totalYearsExperience": ${totalYearsExperience},
    "averageTenure": ${averageTenureMonths},
    "gaps": ${JSON.stringify(gaps)}
  },
  "overallAssessment": "Balanced summary of resume credibility. Be fair and professional."
}

=====================
FINAL REMINDERS
=====================

- Be conservative. Fewer accurate flags are better than many weak ones.
- This is a review aid, NOT an accusation system.
- If the resume appears credible, explicitly say so.
- Return ONLY JSON. No explanations outside JSON.`;

  const response = await generateContentWithFallback({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { temperature: 0.2 },
  });
  
  return extractJSONFromResponse(response.text || "", "checkCredibility");
}

/**
 * Quantify impact - improve weak resume bullets with metrics and strong verbs
 */
export async function quantifyImpact(resume: ParsedResume): Promise<ImpactQuantificationResult> {
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

  try {
    const response = await generateContentWithFallback({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.3 },
    });
    
    return extractJSONFromResponse(response.text || "", "quantifyImpact");
  } catch (error: any) {
    logger.error(`Impact quantification failed: ${error.message || String(error)}`);
    // Re-throw with more context
    throw new Error(`Failed to quantify impact: ${error.message || String(error)}`);
  }
}
