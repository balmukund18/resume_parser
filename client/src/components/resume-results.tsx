import { useState, useMemo } from "react";
import {
  User, Mail, Phone, MapPin, Linkedin, Github,
  Briefcase, GraduationCap, Wrench, FolderOpen,
  Award, Globe, ChevronDown, Download, Copy,
  ArrowLeft, FileJson, FileType, ExternalLink,
  Star,
} from "lucide-react";
import { getSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfidenceBadge } from "./confidence-badge";
import { AnalysisPanel } from "./analysis-panel";
import type { ParsedResume, ExportFormat } from "@shared/schema";

interface ResumeResultsProps {
  resume: ParsedResume;
  onBack: () => void;
  onExport: (format: ExportFormat) => void;
}

export function ResumeResults({ resume, onBack, onExport }: ResumeResultsProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["personal", "experience", "education", "skills", "projects", "certifications", "languages", "links"])
  );

  const toggleSection = (section: string) => {
    const newOpen = new Set(openSections);
    if (newOpen.has(section)) newOpen.delete(section);
    else newOpen.add(section);
    setOpenSections(newOpen);
  };

  const hasContactInfo = resume.contactInfo.email || resume.contactInfo.phone ||
    resume.contactInfo.address || resume.contactInfo.linkedin || resume.contactInfo.github;

  const defaultExportFormat = useMemo(() => getSettings().defaultExportFormat, []);

  const hasLinks = resume.links && (
    (resume.links.profiles && resume.links.profiles.length > 0) ||
    (resume.links.projects && resume.links.projects.length > 0) ||
    (resume.links.additional && resume.links.additional.length > 0)
  );

  return (
    <div className="flex h-full" data-testid="resume-results">
      {/* ─── CENTER: Resume content ─── */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        {/* Top bar with name + actions */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold truncate" data-testid="text-resume-name">
                  {resume.name || "Unknown Candidate"}
                </h1>
                <Star className="h-3.5 w-3.5 text-primary fill-primary shrink-0" />
              </div>
              <p className="text-[12px] text-muted-foreground">
                Parsed from {resume.metadata.originalFilename} &middot; {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {resume.metadata.overallConfidence !== undefined && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[hsl(var(--card))] border">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Confidence</span>
                <ConfidenceBadge score={resume.metadata.overallConfidence} />
              </div>
            )}
            <div className="flex items-center">
              <Button
                size="sm"
                onClick={() => onExport(defaultExportFormat)}
                data-testid="button-export"
                className="bg-[#2da77d] hover:bg-[#259268] text-white h-8 text-[12px] rounded-r-none"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export {defaultExportFormat.toUpperCase()}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-[#2da77d] hover:bg-[#259268] text-white h-8 px-1.5 rounded-l-none border-l border-white/20"
                    data-testid="button-export-dropdown"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => onExport("pdf")} data-testid="menu-export-pdf">
                    <FileType className="h-4 w-4 mr-2 text-[#ef4444]" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport("json")} data-testid="menu-export-json">
                    <FileJson className="h-4 w-4 mr-2 text-[#f59e0b]" />
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Resume card */}
        <div className="bg-[hsl(var(--card))] rounded-xl border overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileJson className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Resume</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>Parsed</span>
              <span>{resume.metadata.fileType.toUpperCase()} &middot; {(resume.metadata.fileSize / 1024).toFixed(0)} KB</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Summary */}
            {resume.summary && (
              <div>
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Professional Summary
                </h3>
                <p className="text-[13px] leading-relaxed text-foreground/85" data-testid="text-summary">{resume.summary}</p>
              </div>
            )}

            {/* Contact Information */}
            <SectionBlock
              id="personal"
              title="Contact Information"
              icon={User}
              open={openSections.has("personal")}
              onToggle={() => toggleSection("personal")}
              isEmpty={!hasContactInfo}
            >
              <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2">
                {resume.contactInfo.email && (
                  <ContactCard icon={Mail} label={resume.contactInfo.email} testId="contact-email" copyable />
                )}
                {resume.contactInfo.phone && (
                  <ContactCard icon={Phone} label={resume.contactInfo.phone} testId="contact-phone" />
                )}
                {resume.contactInfo.address && (
                  <ContactCard icon={MapPin} label={resume.contactInfo.address} testId="contact-address" />
                )}
                {resume.contactInfo.linkedin && (
                  <ContactCard icon={Linkedin} label="LinkedIn Profile" href={resume.contactInfo.linkedin} testId="contact-linkedin" iconColor="text-[#0a66c2]" />
                )}
                {resume.contactInfo.github && (
                  <ContactCard icon={Github} label="GitHub Profile" href={resume.contactInfo.github} testId="contact-github" iconColor="text-foreground" />
                )}
              </div>
            </SectionBlock>

            {/* Work Experience */}
            <SectionBlock
              id="experience"
              title="Work Experience"
              icon={Briefcase}
              open={openSections.has("experience")}
              onToggle={() => toggleSection("experience")}
              isEmpty={resume.experience.length === 0}
              badge={`${resume.experience.length}`}
            >
              <div className="space-y-5">
                {resume.experience.map((exp, index) => (
                  <div key={index} className={index > 0 ? "pt-5 border-t" : ""} data-testid={`experience-${index}`}>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                          <h4 className="text-[13px] font-semibold">{exp.position}</h4>
                        </div>
                        <p className="text-[13px] text-primary ml-5.5 pl-[22px]">{exp.company}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {exp.startDate || "N/A"} - {exp.endDate || "Present"}
                        </span>
                        <ConfidenceBadge score={exp.confidenceScore} showLabel={false} />
                      </div>
                    </div>
                    {exp.responsibilities.length > 0 && (
                      <ul className="ml-[22px] space-y-1 mt-2">
                        {exp.responsibilities.map((resp, i) => (
                          <li key={i} className="text-[12px] text-muted-foreground flex gap-2">
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/40 mt-[7px] shrink-0" />
                            <span className="leading-relaxed">{resp}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {exp.achievements.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 ml-[22px]">
                        {exp.achievements.map((ach, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] bg-[#2da77d]/10 text-[#2da77d] dark:bg-[#2da77d]/20 dark:text-[#3dd68c]">
                            {ach}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionBlock>

            {/* Education */}
            <SectionBlock
              id="education"
              title="Education"
              icon={GraduationCap}
              open={openSections.has("education")}
              onToggle={() => toggleSection("education")}
              isEmpty={resume.education.length === 0}
            >
              <div className="space-y-2.5">
                {resume.education.map((edu, index) => (
                  <div key={index} className="flex justify-between items-start p-3 rounded-lg bg-muted/30 border" data-testid={`education-${index}`}>
                    <div>
                      <h4 className="text-[13px] font-semibold">{edu.degree}</h4>
                      <p className="text-[12px] text-muted-foreground">{edu.institution}</p>
                      {edu.gpa && (
                        <span className="text-[11px] font-medium text-[#2da77d] dark:text-[#3dd68c] mt-0.5 inline-block">GPA: {edu.gpa}</span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {edu.graduationDate && <span className="text-[11px] text-muted-foreground">{edu.graduationDate}</span>}
                      <ConfidenceBadge score={edu.confidenceScore} showLabel={false} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionBlock>

            {/* Skills */}
            <SectionBlock
              id="skills"
              title="Skills"
              icon={Wrench}
              open={openSections.has("skills")}
              onToggle={() => toggleSection("skills")}
              isEmpty={resume.skills.technical.length === 0 && resume.skills.soft.length === 0}
              confidenceScore={resume.skills.confidenceScore}
            >
              <div className="space-y-3">
                {resume.skills.technical.length > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Technical</span>
                    <div className="flex flex-wrap gap-1.5">
                      {resume.skills.technical.map((skill, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-[#2da77d]/8 text-[#2da77d] text-[11px] font-medium border border-[#2da77d]/15" data-testid={`skill-technical-${i}`}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {resume.skills.soft.length > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Soft Skills</span>
                    <div className="flex flex-wrap gap-1.5">
                      {resume.skills.soft.map((skill, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-[11px] font-medium border" data-testid={`skill-soft-${i}`}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionBlock>

            {/* Projects */}
            <SectionBlock
              id="projects"
              title="Projects"
              icon={FolderOpen}
              open={openSections.has("projects")}
              onToggle={() => toggleSection("projects")}
              isEmpty={resume.projects.length === 0}
            >
              <div className="space-y-3">
                {resume.projects.map((project, index) => (
                  <div key={index} className="p-3 rounded-lg border bg-muted/20" data-testid={`project-${index}`}>
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h4 className="text-[13px] font-semibold flex items-center gap-1.5">
                        {project.name}
                        {project.url && (
                          <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </h4>
                      <ConfidenceBadge score={project.confidenceScore} showLabel={false} />
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{project.description}</p>
                    {project.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {project.technologies.map((tech, i) => (
                          <span key={i} className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionBlock>

            {/* Certifications & Languages side by side */}
            <div className="grid gap-4 sm:grid-cols-2">
              <SectionBlock
                id="certifications"
                title="Certifications"
                icon={Award}
                open={openSections.has("certifications")}
                onToggle={() => toggleSection("certifications")}
                isEmpty={resume.certifications.length === 0}
              >
                <div className="space-y-2">
                  {resume.certifications.map((cert, index) => (
                    <div key={index} className="flex justify-between items-start gap-2" data-testid={`certification-${index}`}>
                      <div>
                        <h4 className="text-[12px] font-medium">{cert.name}</h4>
                        <p className="text-[11px] text-muted-foreground">{cert.issuer}</p>
                        {cert.issueDate && <p className="text-[10px] text-muted-foreground">Issued: {cert.issueDate}</p>}
                      </div>
                      <ConfidenceBadge score={cert.confidenceScore} showLabel={false} />
                    </div>
                  ))}
                </div>
              </SectionBlock>

              <SectionBlock
                id="languages"
                title="Languages"
                icon={Globe}
                open={openSections.has("languages")}
                onToggle={() => toggleSection("languages")}
                isEmpty={resume.languages.length === 0}
              >
                <div className="space-y-2">
                  {resume.languages.map((lang, index) => (
                    <div key={index} className="flex justify-between items-center" data-testid={`language-${index}`}>
                      <span className="text-[12px] font-medium">{lang.language}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[9px] uppercase">{lang.proficiency}</Badge>
                        <ConfidenceBadge score={lang.confidenceScore} showLabel={false} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionBlock>
            </div>

            {/* Links */}
            {hasLinks && (
              <SectionBlock
                id="links"
                title="Extracted Links"
                icon={ExternalLink}
                open={openSections.has("links")}
                onToggle={() => toggleSection("links")}
                isEmpty={!hasLinks}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {resume.links?.profiles?.map((link, i) => (
                    <a key={`p-${i}`} href={link.url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 p-2 rounded-lg border hover:border-primary/30 transition-colors text-[12px]">
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{link.platform || "Profile"}</span>
                    </a>
                  ))}
                  {resume.links?.projects?.map((link, i) => (
                    <a key={`pr-${i}`} href={link.url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 p-2 rounded-lg border hover:border-primary/30 transition-colors text-[12px]">
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{link.projectName || "Project"}</span>
                    </a>
                  ))}
                  {resume.links?.additional?.map((link, i) => (
                    <a key={`a-${i}`} href={link.url} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-2 p-2 rounded-lg border hover:border-primary/30 transition-colors text-[12px]">
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{link.context || "Link"}</span>
                    </a>
                  ))}
                </div>
              </SectionBlock>
            )}
          </div>
        </div>
      </div>

      {/* ─── RIGHT SIDEBAR: AI Insights ─── */}
      <div className="hidden xl:block w-80 shrink-0 border-l bg-[hsl(var(--card))] overflow-y-auto">
        <div className="p-5">
          <AnalysisPanel resumeId={resume.id} />
        </div>
      </div>

      {/* Mobile: analysis panel below main content (xl hidden) */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-30">
        {/* Could add a slide-up drawer here, but for now the panel is at the bottom of scroll in center column on mobile */}
      </div>
    </div>
  );
}


/* ─── Reusable section block ─── */
function SectionBlock({
  id,
  title,
  icon: Icon,
  children,
  confidenceScore,
  isEmpty = false,
  open,
  onToggle,
  badge,
}: {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  confidenceScore?: number;
  isEmpty?: boolean;
  open: boolean;
  onToggle: () => void;
  badge?: string;
}) {
  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <div className={`${isEmpty ? "opacity-40" : ""}`}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between py-2 group cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px] font-semibold">{title}</span>
              {badge && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{badge}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {confidenceScore !== undefined && <ConfidenceBadge score={confidenceScore} showLabel={false} />}
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pb-2">
            {isEmpty ? (
              <p className="text-[12px] text-muted-foreground italic py-2">No data found</p>
            ) : (
              children
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}


/* ─── Contact card tile ─── */
function ContactCard({
  icon: Icon,
  label,
  href,
  testId,
  iconColor,
  copyable,
}: {
  icon: React.ElementType;
  label: string;
  href?: string;
  testId: string;
  iconColor?: string;
  copyable?: boolean;
}) {
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-[hsl(var(--card))] hover:border-primary/20 hover:shadow-sm transition-all group" data-testid={testId}>
      <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className={`h-4 w-4 ${iconColor || "text-muted-foreground"}`} />
      </div>
      <span className={`text-[12px] font-medium truncate ${href ? "text-primary" : ""}`}>{label}</span>
      {copyable && (
        <Copy className="h-3 w-3 text-muted-foreground/40 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );

  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  return content;
}
