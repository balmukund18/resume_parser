import fs from "fs";
import path from "path";
import * as mammoth from "mammoth";
import { createModuleLogger } from "./logger";

const logger = createModuleLogger("TextExtractor");

export type SupportedFileType = "pdf" | "docx" | "txt";

export interface ExtractedLink {
  url: string;
  text: string;
  context?: string;
  page?: number;
  section?: 'header' | 'contact' | 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'languages' | 'references' | 'other';
  position?: number; // Position in the document to help with section detection
}

export interface ExtractionResult {
  text: string;
  pageCount?: number;
  links: ExtractedLink[];
}

/**
 * Determine file type from extension
 */
export function getFileType(filename: string): SupportedFileType | null {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "pdf";
    case ".docx":
      return "docx";
    case ".txt":
      return "txt";
    default:
      return null;
  }
}

/**
 * Validate MIME type matches expected file type
 */
export function validateMimeType(mimeType: string, fileType: SupportedFileType): boolean {
  const validMimeTypes: Record<SupportedFileType, string[]> = {
    pdf: ["application/pdf"],
    docx: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    txt: ["text/plain"],
  };
  
  return validMimeTypes[fileType]?.includes(mimeType) ?? false;
}

/**
 * Extract text and hyperlinks from PDF file
 */
async function extractFromPdf(filePath: string): Promise<ExtractionResult> {
  logger.info(`Extracting text and links from PDF: ${filePath}`);
  
  // Use pdfjs-dist directly for reliable PDF text and annotation extraction
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  
  const dataBuffer = fs.readFileSync(filePath);
  const uint8Array = new Uint8Array(dataBuffer);
  
  const doc = await pdfjsLib.getDocument({ data: uint8Array }).promise;
  const numPages = doc.numPages;
  
  const textParts: string[] = [];
  const extractedLinks: ExtractedLink[] = [];
  
  // Extract text and annotations from all pages
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    
    // Extract text content
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    textParts.push(pageText);
    
    // Extract annotations (hyperlinks)
    try {
      const annotations = await page.getAnnotations();
      
      for (const annotation of annotations) {
        if (annotation.subtype === 'Link' && annotation.url) {
          // Get the text content that corresponds to the link area
          const linkText = annotation.contents || annotation.alternativeText || 'Link';
          
          extractedLinks.push({
            url: annotation.url,
            text: linkText,
            context: `Page ${i}`,
            page: i
          });
          
          logger.info(`Found hyperlink on page ${i}: ${linkText} -> ${annotation.url}`);
        }
      }
    } catch (error) {
      logger.warn(`Error extracting annotations from page ${i}: ${error}`);
    }
  }
  
  const text = textParts.join("\n\n");
  
  logger.info(`Extracted ${numPages} pages and ${extractedLinks.length} hyperlinks from PDF`);
  
  return {
    text,
    pageCount: numPages,
    links: extractedLinks,
  };
}

/**
 * Extract text and hyperlinks from DOCX file
 */
async function extractFromDocx(filePath: string): Promise<ExtractionResult> {
  logger.info(`Extracting text and links from DOCX: ${filePath}`);
  
  const extractedLinks: ExtractedLink[] = [];
  
  // Extract HTML with hyperlinks preserved
  const htmlResult = await mammoth.convertToHtml(
    { path: filePath },
    {
      styleMap: [
        "p[style-name='Normal'] => p",
        "p[style-name='Heading 1'] => h1",
        "p[style-name='Heading 2'] => h2"
      ]
    }
  );
  
  // Extract text content
  const textResult = await mammoth.extractRawText({ path: filePath });
  
  // Parse HTML to extract hyperlinks
  const htmlContent = htmlResult.value;
  const linkRegex = /<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
  let match;
  
  while ((match = linkRegex.exec(htmlContent)) !== null) {
    const [, url, text] = match;
    extractedLinks.push({
      url: url,
      text: text.trim(),
      context: 'DOCX document'
    });
    logger.info(`Found hyperlink in DOCX: ${text.trim()} -> ${url}`);
  }
  
  if (textResult.messages.length > 0) {
    textResult.messages.forEach((msg) => {
      logger.warn(`DOCX extraction warning: ${msg.message}`);
    });
  }
  
  logger.info(`Extracted ${textResult.value.length} characters and ${extractedLinks.length} hyperlinks from DOCX`);
  
  return {
    text: textResult.value,
    links: extractedLinks,
  };
}

/**
 * Extract text from TXT file with section-aware link detection
 */
async function extractFromTxt(filePath: string): Promise<ExtractionResult> {
  logger.info(`Extracting text from TXT: ${filePath}`);
  
  const text = fs.readFileSync(filePath, "utf-8");
  const extractedLinks: ExtractedLink[] = [];
  
  // Split text into lines for section analysis
  const lines = text.split('\n');
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
  
  let currentSection: ExtractedLink['section'] = 'other';
  
  // Section detection keywords
  const sectionKeywords = {
    contact: ['contact', 'reach me', 'get in touch', 'email', 'phone', 'linkedin', 'github'],
    experience: ['experience', 'work history', 'employment', 'professional', 'career', 'position', 'role'],
    education: ['education', 'academic', 'university', 'college', 'school', 'degree', 'studies'],
    projects: ['projects', 'portfolio', 'work samples', 'demos', 'applications', 'websites'],
    skills: ['skills', 'technologies', 'programming', 'languages', 'tools', 'expertise'],
    certifications: ['certifications', 'certificates', 'credentials', 'licenses', 'awards']
  };
  
  lines.forEach((line, lineIndex) => {
    const lowerLine = line.toLowerCase().trim();
    
    // Detect section based on line content
    for (const [section, keywords] of Object.entries(sectionKeywords)) {
      if (keywords.some(keyword => lowerLine.includes(keyword))) {
        currentSection = section as ExtractedLink['section'];
        break;
      }
    }
    
    // Extract URLs from current line
    let match;
    urlRegex.lastIndex = 0; // Reset regex
    
    while ((match = urlRegex.exec(line)) !== null) {
      const url = match[0];
      
      extractedLinks.push({
        url: url,
        text: url,
        context: `Line ${lineIndex + 1}`,
        section: currentSection,
        position: lineIndex
      });
      
      logger.info(`Found URL in ${currentSection} section: ${url}`);
    }
  });
  
  logger.info(`Extracted ${text.length} characters and ${extractedLinks.length} URLs from TXT`);
  
  return {
    text,
    links: extractedLinks,
  };
}

/**
 * Extract text from any supported file type
 */
export async function extractText(
  filePath: string, 
  fileType: SupportedFileType
): Promise<ExtractionResult> {
  switch (fileType) {
    case "pdf":
      return extractFromPdf(filePath);
    case "docx":
      return extractFromDocx(filePath);
    case "txt":
      return extractFromTxt(filePath);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
