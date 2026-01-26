import nodemailer from "nodemailer";
import type { ParsedResume } from "@shared/schema";
import { createModuleLogger } from "./logger";

const logger = createModuleLogger("Email");

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port: parseInt(port || "587", 10),
    secure: port === "465",
    auth: { user, pass },
  };
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
  const config = getEmailConfig();

  if (!config) {
    logger.warn("SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.");
    return {
      success: false,
      error: "Email service not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS.",
    };
  }

  try {
    // Create transporter with proper timeout and TLS settings
    const transporterOptions: any = {
      host: config.host,
      port: config.port,
      secure: config.secure, // true for 465, false for other ports
      auth: config.auth,
      // Timeout settings (in milliseconds)
      connectionTimeout: 10000, // 10 seconds to establish connection
      socketTimeout: 10000, // 10 seconds for socket inactivity
      greetingTimeout: 10000, // 10 seconds for SMTP greeting
      // TLS/SSL settings
      requireTLS: !config.secure && config.port === 587, // Require TLS for port 587
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates (for some SMTP servers)
      },
    };

    const transporter = nodemailer.createTransport(transporterOptions);

    // Verify connection before sending (optional but helpful for debugging)
    try {
      await transporter.verify();
      logger.info(`SMTP connection verified for ${config.host}:${config.port}`);
    } catch (verifyError) {
      logger.warn(`SMTP verification failed (continuing anyway): ${verifyError}`);
      // Continue anyway - some servers don't support verify
    }

    const subject = `Resume Analysis Results - ${resume.name}`;
    const htmlContent = formatResumeAsHTML(resume, includeFullDetails);
    const textContent = formatResumeAsText(resume, includeFullDetails);

    // Send email with timeout wrapper
    const sendPromise = transporter.sendMail({
      from: `"Resume Parser" <${config.auth.user}>`, // Better from format
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    // Add overall timeout (15 seconds total)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("Email sending timeout: Request took longer than 15 seconds"));
      }, 15000);
    });

    const info = await Promise.race([sendPromise, timeoutPromise]);

    logger.info(`Email sent successfully to ${toEmail}, messageId: ${info.messageId}`);

    // Close the transporter connection
    transporter.close();

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? {
      name: error.name,
      code: (error as any).code,
      command: (error as any).command,
      response: (error as any).response,
      responseCode: (error as any).responseCode,
    } : {};

    logger.error(`Failed to send email to ${toEmail}:`, {
      error: errorMessage,
      details: errorDetails,
      smtpHost: config.host,
      smtpPort: config.port,
    });

    // Provide more helpful error messages
    let userFriendlyError = errorMessage;
    if (errorMessage.includes("timeout")) {
      userFriendlyError = "Connection timeout: The email server did not respond in time. Please check your SMTP settings.";
    } else if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ENOTFOUND")) {
      userFriendlyError = `Cannot connect to SMTP server ${config.host}:${config.port}. Please verify your SMTP_HOST and SMTP_PORT settings.`;
    } else if (errorMessage.includes("EAUTH") || errorMessage.includes("authentication")) {
      userFriendlyError = "SMTP authentication failed. Please verify your SMTP_USER and SMTP_PASS credentials.";
    } else if (errorMessage.includes("ETIMEDOUT")) {
      userFriendlyError = "Connection timed out. The SMTP server may be unreachable or blocking the connection.";
    }

    return {
      success: false,
      error: userFriendlyError,
    };
  }
}

export function isEmailConfigured(): boolean {
  return getEmailConfig() !== null;
}
