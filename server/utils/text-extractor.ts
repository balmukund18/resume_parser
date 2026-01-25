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
 * Hybrid approach: Tries pdfjs-dist first for clickable hyperlinks (annotations),
 * then falls back to pdf-parse for text extraction. Combines both results.
 */
async function extractFromPdf(filePath: string): Promise<ExtractionResult> {
  logger.info(`Extracting text and links from PDF: ${filePath}`);
  
  const dataBuffer = fs.readFileSync(filePath);
  let text = "";
  let numPages = 1;
  const extractedLinks: ExtractedLink[] = [];
  const seenUrls = new Set<string>();
  
  // STEP 1: Try pdfjs-dist to extract clickable hyperlinks (annotations)
  // This captures links that aren't visible in the text (e.g., "View Portfolio" → actual URL)
  try {
    logger.info("Attempting to extract clickable hyperlinks using pdfjs-dist...");
    
    // Set up polyfills for Node.js
    if (typeof globalThis.DOMMatrix === 'undefined') {
      try {
        const dommatrixModule = await import("dommatrix");
        // dommatrix exports DOMMatrix as a class/constructor
        const DOMMatrixPolyfill = (dommatrixModule as any).DOMMatrix || (dommatrixModule as any).default;
        if (DOMMatrixPolyfill) {
          (globalThis as any).DOMMatrix = DOMMatrixPolyfill;
          (globalThis as any).DOMMatrixReadOnly = DOMMatrixPolyfill;
        }
      } catch (polyfillError) {
        logger.warn("Could not load DOMMatrix polyfill, continuing without it");
      }
    }
    
    // Import pdfjs-dist legacy build (better Node.js compatibility)
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    
    const uint8Array = new Uint8Array(dataBuffer);
    const doc = await pdfjsLib.getDocument({ 
      data: uint8Array,
      useSystemFonts: true, // Better Node.js compatibility
      verbosity: 0 // Reduce logging
    }).promise;
    
    numPages = doc.numPages;
    logger.info(`PDF has ${numPages} pages`);
    
    // Extract text and annotations from all pages
    const textParts: string[] = [];
    
    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      
      // Extract text content
      try {
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        textParts.push(pageText);
      } catch (textError) {
        logger.warn(`Error extracting text from page ${i}: ${textError}`);
      }
      
      // Extract annotations (clickable hyperlinks) - THIS IS THE KEY FEATURE
      try {
        const annotations = await page.getAnnotations();
        
        for (const annotation of annotations) {
          if (annotation.subtype === 'Link' && annotation.url) {
            const url = annotation.url;
            
            // Skip if already seen
            if (seenUrls.has(url.toLowerCase())) continue;
            seenUrls.add(url.toLowerCase());
            
            // Get anchor text from annotation or surrounding text
            const linkText = annotation.contents || annotation.alternativeText || annotation.title || 'Link';
            
            // Try to determine section based on annotation position or text
            let section: ExtractedLink['section'] = 'other';
            const lowerText = linkText.toLowerCase();
            if (lowerText.includes('linkedin') || lowerText.includes('github') || lowerText.includes('profile')) {
              section = 'contact';
            } else if (lowerText.includes('project') || lowerText.includes('portfolio') || lowerText.includes('demo')) {
              section = 'projects';
            } else if (lowerText.includes('company') || lowerText.includes('work')) {
              section = 'experience';
            } else if (lowerText.includes('university') || lowerText.includes('college') || lowerText.includes('education')) {
              section = 'education';
            }
            
            extractedLinks.push({
              url: url,
              text: linkText,
              context: `Page ${i} - Clickable link`,
              page: i,
              section: section
            });
            
            logger.info(`Found clickable hyperlink on page ${i}: "${linkText}" -> ${url}`);
          }
        }
      } catch (annotationError: any) {
        // If annotation extraction fails, continue (not critical)
        logger.warn(`Error extracting annotations from page ${i}: ${annotationError.message}`);
      }
    }
    
    text = textParts.join("\n\n");
    logger.info(`Successfully extracted ${extractedLinks.length} clickable hyperlinks using pdfjs-dist`);
    
  } catch (pdfjsError: any) {
    // pdfjs-dist failed (likely DOMMatrix or other browser API issue)
    logger.warn(`pdfjs-dist extraction failed: ${pdfjsError.message}`);
    logger.info("Falling back to pdf-parse for text extraction...");
    
    // Fallback to pdf-parse for text extraction
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: dataBuffer });
      const pdfData = await parser.getText();
      text = pdfData.text || "";
      numPages = (parser as any).doc?.numPages || 1;
      logger.info("Successfully extracted text using pdf-parse fallback");
    } catch (fallbackError: any) {
      logger.error(`Both pdfjs-dist and pdf-parse failed: ${fallbackError.message}`);
      throw new Error(`PDF extraction failed: ${fallbackError.message}`);
    }
  }
    
  // STEP 2: Extract visible URLs from text (complement to clickable links)
  // This catches URLs that are visible in the text but might not be clickable
  // Comprehensive URL regex pattern
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  
  // Also match common domain patterns without protocol (linkedin.com, github.com, etc.)
  const domainPattern = /(?:^|\s)(linkedin\.com|github\.com|leetcode\.com|hackerrank\.com|kaggle\.com|codeforces\.com|medium\.com|dev\.to|stackoverflow\.com|twitter\.com|x\.com|behance\.net|dribbble\.com|portfolio|personal website)[\/\w\-\.]*/gi;
  
  // Split text into lines for better context detection
  const lines = text.split('\n');
  
  // Section detection keywords for better context
  const sectionKeywords: Record<string, string[]> = {
    contact: ['contact', 'reach me', 'get in touch', 'email', 'phone', 'linkedin', 'github', 'profile'],
    experience: ['experience', 'work', 'employment', 'career', 'position', 'role', 'company'],
    education: ['education', 'university', 'college', 'school', 'degree', 'studies'],
    projects: ['projects', 'portfolio', 'work samples', 'demos', 'applications', 'websites'],
    skills: ['skills', 'technologies', 'programming', 'tools'],
    certifications: ['certifications', 'certificates', 'credentials', 'licenses']
  };
  
  let currentSection: ExtractedLink['section'] = 'other';
  
  lines.forEach((line: string, lineIndex: number) => {
    const lowerLine = line.toLowerCase().trim();
    
    // Detect section based on line content
    for (const [section, keywords] of Object.entries(sectionKeywords)) {
      if (keywords.some(keyword => lowerLine.includes(keyword))) {
        currentSection = section as ExtractedLink['section'];
        break;
      }
    }
    
    // Extract full URLs (with http/https)
    urlRegex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = urlRegex.exec(line)) !== null) {
      let url = match[0];
      // Normalize URL
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      
      // Skip if already seen (from clickable links or previous text extraction)
      if (seenUrls.has(url.toLowerCase())) continue;
      seenUrls.add(url.toLowerCase());
      
      // Extract anchor text - look for text before/after URL
      let linkText = line.trim();
      // Remove the URL from the line to get surrounding text
      linkText = linkText.replace(url, '').trim();
      // If no text left, try to infer from URL domain
      if (!linkText || linkText.length < 3) {
        const domain = url.match(/https?:\/\/(?:www\.)?([^\/]+)/)?.[1] || '';
        if (domain.includes('linkedin')) linkText = 'LinkedIn Profile';
        else if (domain.includes('github')) linkText = 'GitHub Profile';
        else if (domain.includes('leetcode')) linkText = 'LeetCode Profile';
        else if (domain.includes('portfolio')) linkText = 'Portfolio';
        else linkText = url; // Fallback to URL itself
      }
      
      extractedLinks.push({
        url: url,
        text: linkText.substring(0, 150), // Limit text length
        context: `Line ${lineIndex + 1} - Visible in text`,
        page: Math.floor(lineIndex / 50) + 1, // Estimate page number
        section: currentSection,
        position: lineIndex
      });
      
      logger.info(`Found visible URL in PDF [${currentSection}]: ${linkText.substring(0, 50)} -> ${url}`);
    }
    
    // Also extract domain patterns (linkedin.com/in/username, github.com/username, etc.)
    domainPattern.lastIndex = 0;
    while ((match = domainPattern.exec(line)) !== null) {
      const domainMatch = match[0].trim();
      // Try to find the full URL in the same line
      const fullUrlMatch = line.match(new RegExp(`https?://${domainMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s]*`, 'i'));
      if (fullUrlMatch) {
        const url = fullUrlMatch[0];
        if (!seenUrls.has(url.toLowerCase())) {
          seenUrls.add(url.toLowerCase());
          extractedLinks.push({
            url: url,
            text: line.trim().replace(url, '').trim() || domainMatch,
            context: `Line ${lineIndex + 1} - Domain pattern`,
            page: Math.floor(lineIndex / 50) + 1,
            section: currentSection,
            position: lineIndex
          });
          logger.info(`Found domain pattern URL: ${url}`);
        }
      }
    }
  });
  
  logger.info(`Extracted ${numPages} pages and ${extractedLinks.length} total links from PDF (${extractedLinks.filter(l => l.context?.includes('Clickable')).length} clickable, ${extractedLinks.filter(l => l.context?.includes('Visible')).length} visible)`);
  
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
