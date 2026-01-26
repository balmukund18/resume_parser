import * as brevo from "@getbrevo/brevo";
import type { ParsedResume } from "@shared/schema";
import { createModuleLogger } from "./logger";

const logger = createModuleLogger("Email");

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function formatResumeAsHTML(resume: ParsedResume, includeFullDetails: boolean): string {
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
        Resume Analysis: ${resume.name}
      </h1>
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #495057; margin-top: 0;">Contact Information</h2>
        ${resume.contactInfo.email ? `<p><strong>Email:</strong> ${resume.contactInfo.email}</p>` : ''}
        ${resume.contactInfo.phone ? `<p><strong>Phone:</strong> ${resume.contactInfo.phone}</p>` : ''}
        ${resume.contactInfo.address ? `<p><strong>Address:</strong> ${resume.contactInfo.address}</p>` : ''}
        ${resume.contactInfo.linkedin ? `<p><strong>LinkedIn:</strong> ${resume.contactInfo.linkedin}</p>` : ''}
        ${resume.contactInfo.github ? `<p><strong>GitHub:</strong> ${resume.contactInfo.github}</p>` : ''}
      </div>

      ${resume.summary ? `
        <div style="margin: 20px 0;">
          <h2 style="color: #495057;">Summary</h2>
          <p>${resume.summary}</p>
        </div>
      ` : ''}

      ${resume.skills.technical.length > 0 || resume.skills.soft.length > 0 ? `
        <div style="margin: 20px 0;">
          <h2 style="color: #495057;">Skills</h2>
          ${resume.skills.technical.length > 0 ? `
            <p><strong>Technical:</strong> ${resume.skills.technical.join(', ')}</p>
          ` : ''}
          ${resume.skills.soft.length > 0 ? `
            <p><strong>Soft Skills:</strong> ${resume.skills.soft.join(', ')}</p>
          ` : ''}
        </div>
      ` : ''}`;

  if (includeFullDetails) {
    html += `
      ${resume.experience.length > 0 ? `
        <div style="margin: 20px 0;">
          <h2 style="color: #495057;">Work Experience</h2>
          ${resume.experience.map(exp => `
            <div style="margin-bottom: 15px; padding: 10px; background: #fff; border-left: 3px solid #007bff;">
              <h3 style="margin: 0; color: #333;">${exp.position}</h3>
              <p style="margin: 5px 0; color: #666;">${exp.company} | ${exp.startDate || 'N/A'} - ${exp.endDate || 'Present'}</p>
              ${exp.responsibilities.length > 0 ? `
                <ul style="margin: 10px 0;">
                  ${exp.responsibilities.map(r => `<li>${r}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${resume.education.length > 0 ? `
        <div style="margin: 20px 0;">
          <h2 style="color: #495057;">Education</h2>
          ${resume.education.map(edu => `
            <div style="margin-bottom: 15px;">
              <h3 style="margin: 0; color: #333;">${edu.degree}</h3>
              <p style="margin: 5px 0; color: #666;">${edu.institution} | ${edu.graduationDate || 'N/A'}</p>
              ${edu.gpa ? `<p style="margin: 0; color: #666;">GPA: ${edu.gpa}</p>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${resume.projects.length > 0 ? `
        <div style="margin: 20px 0;">
          <h2 style="color: #495057;">Projects</h2>
          ${resume.projects.map(p => `
            <div style="margin-bottom: 15px;">
              <h3 style="margin: 0; color: #333;">${p.name}</h3>
              <p style="margin: 5px 0;">${p.description}</p>
              ${p.technologies.length > 0 ? `<p style="color: #666;"><em>Technologies: ${p.technologies.join(', ')}</em></p>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${resume.certifications.length > 0 ? `
        <div style="margin: 20px 0;">
          <h2 style="color: #495057;">Certifications</h2>
          ${resume.certifications.map(c => `
            <p><strong>${c.name}</strong> - ${c.issuer}</p>
          `).join('')}
        </div>
      ` : ''}`;
  }

  html += `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px;">
        <p>This resume was parsed and analyzed by Resume Parser.</p>
        <p>Overall Confidence: ${resume.metadata.overallConfidence ? Math.round(resume.metadata.overallConfidence) + '%' : 'N/A'}</p>
      </div>
    </div>
  `;

  return html;
}

function formatResumeAsText(resume: ParsedResume, includeFullDetails: boolean): string {
  let text = `RESUME ANALYSIS: ${resume.name}\n`;
  text += "=".repeat(50) + "\n\n";

  text += "CONTACT INFORMATION\n";
  text += "-".repeat(20) + "\n";
  if (resume.contactInfo.email) text += `Email: ${resume.contactInfo.email}\n`;
  if (resume.contactInfo.phone) text += `Phone: ${resume.contactInfo.phone}\n`;
  if (resume.contactInfo.address) text += `Address: ${resume.contactInfo.address}\n`;
  if (resume.contactInfo.linkedin) text += `LinkedIn: ${resume.contactInfo.linkedin}\n`;
  if (resume.contactInfo.github) text += `GitHub: ${resume.contactInfo.github}\n`;
  text += "\n";

  if (resume.summary) {
    text += "SUMMARY\n";
    text += "-".repeat(20) + "\n";
    text += resume.summary + "\n\n";
  }

  if (resume.skills.technical.length > 0 || resume.skills.soft.length > 0) {
    text += "SKILLS\n";
    text += "-".repeat(20) + "\n";
    if (resume.skills.technical.length > 0) {
      text += `Technical: ${resume.skills.technical.join(', ')}\n`;
    }
    if (resume.skills.soft.length > 0) {
      text += `Soft Skills: ${resume.skills.soft.join(', ')}\n`;
    }
    text += "\n";
  }

  if (includeFullDetails) {
    if (resume.experience.length > 0) {
      text += "WORK EXPERIENCE\n";
      text += "-".repeat(20) + "\n";
      resume.experience.forEach(exp => {
        text += `${exp.position} at ${exp.company}\n`;
        text += `${exp.startDate || 'N/A'} - ${exp.endDate || 'Present'}\n`;
        exp.responsibilities.forEach(r => {
          text += `  - ${r}\n`;
        });
        text += "\n";
      });
    }

    if (resume.education.length > 0) {
      text += "EDUCATION\n";
      text += "-".repeat(20) + "\n";
      resume.education.forEach(edu => {
        text += `${edu.degree} - ${edu.institution}\n`;
        if (edu.graduationDate) text += `Graduated: ${edu.graduationDate}\n`;
        if (edu.gpa) text += `GPA: ${edu.gpa}\n`;
        text += "\n";
      });
    }

    if (resume.projects.length > 0) {
      text += "PROJECTS\n";
      text += "-".repeat(20) + "\n";
      resume.projects.forEach(p => {
        text += `${p.name}\n`;
        text += `${p.description}\n`;
        if (p.technologies.length > 0) {
          text += `Technologies: ${p.technologies.join(', ')}\n`;
        }
        text += "\n";
      });
    }

    if (resume.certifications.length > 0) {
      text += "CERTIFICATIONS\n";
      text += "-".repeat(20) + "\n";
      resume.certifications.forEach(c => {
        text += `${c.name} - ${c.issuer}\n`;
      });
      text += "\n";
    }
  }

  text += "-".repeat(50) + "\n";
  text += `Overall Confidence: ${resume.metadata.overallConfidence ? Math.round(resume.metadata.overallConfidence) + '%' : 'N/A'}\n`;

  return text;
}

export async function sendResumeEmail(
  toEmail: string,
  resume: ParsedResume,
  includeFullDetails: boolean = true
): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL || "noreply@brevo.com"; // Default Brevo sender

  if (!apiKey) {
    logger.warn("Brevo API key not configured. Set BREVO_API_KEY environment variable.");
    return {
      success: false,
      error: "Email service not configured. Please set BREVO_API_KEY environment variable.",
    };
  }

  try {
    // Initialize Brevo API instance
    const apiInstance = new brevo.TransactionalEmailsApi();
    
    // Clean the API key to remove any whitespace or newlines (common copy-paste issues)
    // Brevo API keys format: xkeysib-xxxxxxxxxxxxxxxxxxxxx
    const cleanApiKey = apiKey.trim().replace(/[\r\n\t]/g, '');
    
    // Set API key using the correct method
    apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, cleanApiKey);

    const subject = `Resume Analysis Results - ${resume.name}`;
    const htmlContent = formatResumeAsHTML(resume, includeFullDetails);
    const textContent = formatResumeAsText(resume, includeFullDetails);

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.textContent = textContent;
    sendSmtpEmail.sender = { name: "Resume Parser", email: fromEmail };
    sendSmtpEmail.to = [{ email: toEmail }];

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);

    const messageId = (data as any).messageId || (data as any).body?.messageId || "unknown";
    logger.info(`Email sent successfully via Brevo to ${toEmail}, messageId: ${messageId}`);
    return {
      success: true,
      messageId: messageId,
    };
  } catch (error: any) {
    const errorMessage = error?.response?.body?.message || error?.message || String(error);
    logger.error(`Brevo email sending failed:`, { error: errorMessage });
    return {
      success: false,
      error: `Brevo API error: ${errorMessage}`,
    };
  }
}

export function isEmailConfigured(): boolean {
  return !!process.env.BREVO_API_KEY;
}
