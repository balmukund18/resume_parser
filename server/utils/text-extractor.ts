import fs from "fs";
import path from "path";
import * as mammoth from "mammoth";
import { createModuleLogger } from "./logger";

const logger = createModuleLogger("TextExtractor");

export type SupportedFileType = "pdf" | "docx" | "txt";

export interface ExtractionResult {
  text: string;
  pageCount?: number;
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
 * Extract text from PDF file
 */
async function extractFromPdf(filePath: string): Promise<ExtractionResult> {
  logger.info(`Extracting text from PDF: ${filePath}`);
  
  // Use pdfjs-dist directly for reliable PDF text extraction
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  
  const dataBuffer = fs.readFileSync(filePath);
  const uint8Array = new Uint8Array(dataBuffer);
  
  const doc = await pdfjsLib.getDocument({ data: uint8Array }).promise;
  const numPages = doc.numPages;
  
  // Extract text from all pages
  const textParts: string[] = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    textParts.push(pageText);
  }
  
  const text = textParts.join("\n\n");
  
  logger.info(`Extracted ${numPages} pages from PDF`);
  
  return {
    text,
    pageCount: numPages,
  };
}

/**
 * Extract text from DOCX file
 */
async function extractFromDocx(filePath: string): Promise<ExtractionResult> {
  logger.info(`Extracting text from DOCX: ${filePath}`);
  
  const result = await mammoth.extractRawText({ path: filePath });
  
  if (result.messages.length > 0) {
    result.messages.forEach((msg) => {
      logger.warn(`DOCX extraction warning: ${msg.message}`);
    });
  }
  
  logger.info(`Extracted ${result.value.length} characters from DOCX`);
  
  return {
    text: result.value,
  };
}

/**
 * Extract text from TXT file
 */
async function extractFromTxt(filePath: string): Promise<ExtractionResult> {
  logger.info(`Extracting text from TXT: ${filePath}`);
  
  const text = fs.readFileSync(filePath, "utf-8");
  
  logger.info(`Extracted ${text.length} characters from TXT`);
  
  return {
    text,
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
