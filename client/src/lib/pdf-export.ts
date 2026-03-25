import jsPDF from "jspdf";
import type { ParsedResume } from "@shared/schema";

const COLORS = {
  primary: [45, 167, 125] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  light: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export function generateResumePDF(resume: ParsedResume): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  function checkPage(needed: number) {
    if (y + needed > doc.internal.pageSize.getHeight() - 16) {
      doc.addPage();
      y = 16;
    }
  }

  function drawSectionHeader(title: string) {
    checkPage(14);
    y += 4;
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, y, contentWidth, 0.6, "F");
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.primary);
    doc.text(title.toUpperCase(), margin, y);
    y += 6;
    doc.setTextColor(...COLORS.text);
  }

  function drawText(text: string, fontSize: number, style: "normal" | "bold" = "normal", color = COLORS.text) {
    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentWidth);
    checkPage(lines.length * (fontSize * 0.45) + 2);
    doc.text(lines, margin, y);
    y += lines.length * (fontSize * 0.45) + 1;
  }

  function drawBullet(text: string) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    const bulletIndent = margin + 4;
    const bulletWidth = contentWidth - 4;
    const lines = doc.splitTextToSize(text, bulletWidth);
    checkPage(lines.length * 4 + 1);
    doc.setTextColor(...COLORS.muted);
    doc.text("•", margin, y);
    doc.setTextColor(...COLORS.text);
    doc.text(lines, bulletIndent, y);
    y += lines.length * 4 + 1;
  }

  // ─── Header: Name + Contact ───
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 38, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.white);
  doc.text(resume.name || "Unknown Candidate", margin, 16);

  // Contact info row
  const contactParts: string[] = [];
  if (resume.contactInfo.email) contactParts.push(resume.contactInfo.email);
  if (resume.contactInfo.phone) contactParts.push(resume.contactInfo.phone);
  if (resume.contactInfo.address) contactParts.push(resume.contactInfo.address);
  if (resume.contactInfo.linkedin) contactParts.push(resume.contactInfo.linkedin);
  if (resume.contactInfo.github) contactParts.push(resume.contactInfo.github);

  if (contactParts.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    const contactLine = contactParts.join("  |  ");
    const lines = doc.splitTextToSize(contactLine, contentWidth);
    doc.text(lines, margin, 24);
  }

  // Confidence badge
  if (resume.metadata.overallConfidence !== undefined) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`${resume.metadata.overallConfidence}% Confidence`, pageWidth - margin, 16, { align: "right" });
  }

  y = 44;

  // ─── Summary ───
  if (resume.summary) {
    drawSectionHeader("Summary");
    drawText(resume.summary, 9.5);
    y += 2;
  }

  // ─── Experience ───
  if (resume.experience.length > 0) {
    drawSectionHeader("Experience");
    for (const exp of resume.experience) {
      checkPage(16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.text);
      doc.text(exp.position, margin, y);

      const dateStr = [exp.startDate, exp.endDate].filter(Boolean).join(" – ") || "";
      if (dateStr) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.muted);
        doc.text(dateStr, pageWidth - margin, y, { align: "right" });
      }
      y += 4.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.primary);
      doc.text(exp.company, margin, y);
      y += 5;

      for (const r of exp.responsibilities) {
        drawBullet(r);
      }
      for (const a of exp.achievements) {
        drawBullet(a);
      }
      y += 2;
    }
  }

  // ─── Education ───
  if (resume.education.length > 0) {
    drawSectionHeader("Education");
    for (const edu of resume.education) {
      checkPage(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.text);
      doc.text(edu.degree, margin, y);

      if (edu.graduationDate) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.muted);
        doc.text(edu.graduationDate, pageWidth - margin, y, { align: "right" });
      }
      y += 4.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.primary);
      doc.text(edu.institution, margin, y);
      if (edu.gpa) {
        doc.setTextColor(...COLORS.muted);
        doc.text(` — GPA: ${edu.gpa}`, margin + doc.getTextWidth(edu.institution), y);
      }
      y += 6;
    }
  }

  // ─── Skills ───
  if (resume.skills.technical.length > 0 || resume.skills.soft.length > 0) {
    drawSectionHeader("Skills");

    if (resume.skills.technical.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.text);
      doc.text("Technical:", margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const techText = resume.skills.technical.join(", ");
      const techLines = doc.splitTextToSize(techText, contentWidth);
      checkPage(techLines.length * 4 + 2);
      doc.text(techLines, margin, y);
      y += techLines.length * 4 + 3;
    }

    if (resume.skills.soft.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.text);
      doc.text("Soft Skills:", margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const softText = resume.skills.soft.join(", ");
      const softLines = doc.splitTextToSize(softText, contentWidth);
      checkPage(softLines.length * 4 + 2);
      doc.text(softLines, margin, y);
      y += softLines.length * 4 + 3;
    }
  }

  // ─── Projects ───
  if (resume.projects.length > 0) {
    drawSectionHeader("Projects");
    for (const proj of resume.projects) {
      checkPage(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.text);
      doc.text(proj.name, margin, y);
      y += 4.5;

      if (proj.description) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.text);
        const descLines = doc.splitTextToSize(proj.description, contentWidth);
        checkPage(descLines.length * 4 + 2);
        doc.text(descLines, margin, y);
        y += descLines.length * 4 + 1;
      }

      if (proj.technologies.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.muted);
        doc.text(`Tech: ${proj.technologies.join(", ")}`, margin, y);
        y += 5;
      }
      y += 2;
    }
  }

  // ─── Certifications ───
  if (resume.certifications.length > 0) {
    drawSectionHeader("Certifications");
    for (const cert of resume.certifications) {
      checkPage(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.text);
      doc.text(cert.name, margin, y);

      if (cert.issueDate) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.muted);
        doc.text(cert.issueDate, pageWidth - margin, y, { align: "right" });
      }
      y += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...COLORS.primary);
      doc.text(cert.issuer, margin, y);
      y += 5;
    }
  }

  // ─── Languages ───
  if (resume.languages.length > 0) {
    drawSectionHeader("Languages");
    const langText = resume.languages.map((l) => `${l.language} (${l.proficiency})`).join(", ");
    drawText(langText, 9);
  }

  // ─── Footer ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `Generated by Resume Parser — ${new Date().toLocaleDateString()}`,
      margin,
      doc.internal.pageSize.getHeight() - 8
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 8,
      { align: "right" }
    );
  }

  // Save
  const filename = (resume.name || "resume").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`${filename}_parsed.pdf`);
}
