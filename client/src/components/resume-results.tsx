import { useState, useEffect } from "react";
import {
  User, Mail, Phone, MapPin, Linkedin, Github,
  Briefcase, GraduationCap, Wrench, FolderOpen,
  Award, Globe, ChevronDown, ChevronUp, Download,
  ArrowLeft, FileJson, FileSpreadsheet, ExternalLink,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { motion } from "framer-motion";

interface ResumeResultsProps {
  resume: ParsedResume;
  onBack: () => void;
  onExport: (format: ExportFormat) => void;
}

export function ResumeResults({ resume, onBack, onExport }: ResumeResultsProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["personal", "experience", "education", "skills", "projects", "certifications", "languages", "links"])
  );

  // Stagger animation for sections
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const toggleSection = (section: string) => {
    const newOpen = new Set(openSections);
    if (newOpen.has(section)) {
      newOpen.delete(section);
    } else {
      newOpen.add(section);
    }
    setOpenSections(newOpen);
  };

  const Section = ({
    id,
    title,
    icon: Icon,
    children,
    confidenceScore,
    isEmpty = false
  }: {
    id: string;
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    confidenceScore?: number;
    isEmpty?: boolean;
  }) => (
    <motion.div variants={item}>
      <Collapsible open={openSections.has(id)} onOpenChange={() => toggleSection(id)}>
        <Card className={`overflow-hidden transition-all duration-200 border-l-4 ${isEmpty ? "opacity-60 border-l-muted" : "border-l-primary/50"}`}>
          <CollapsibleTrigger asChild>
            <CardHeader className="flex flex-row items-center justify-between gap-2 sm:gap-4 cursor-pointer hover:bg-muted/30 transition-colors py-4 px-6 select-none">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className={`p-2 rounded-lg shrink-0 ${isEmpty ? "bg-muted" : "bg-primary/10"}`}>
                  <Icon className={`h-5 w-5 ${isEmpty ? "text-muted-foreground" : "text-primary"}`} />
                </div>
                <CardTitle className="text-base sm:text-lg font-semibold truncate">{title}</CardTitle>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {confidenceScore !== undefined && <ConfidenceBadge score={confidenceScore} />}
                <div className={`p-1 rounded-full transition-transform duration-200 bg-muted/50 ${openSections.has(id) ? "rotate-180" : ""}`}>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-6 px-6">
              {isEmpty ? (
                <p className="text-sm text-muted-foreground italic pl-11">No data found</p>
              ) : (
                <div className="pl-0 sm:pl-11">
                  {children}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </motion.div>
  );

  const hasContactInfo = resume.contactInfo.email || resume.contactInfo.phone ||
    resume.contactInfo.address || resume.contactInfo.linkedin || resume.contactInfo.github;

  const hasLinks = resume.links && (
    (resume.links.profiles && resume.links.profiles.length > 0) ||
    (resume.links.projects && resume.links.projects.length > 0) ||
    (resume.links.additional && resume.links.additional.length > 0)
  );

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-4xl mx-auto space-y-6 px-4 sm:px-6 pb-20"
      data-testid="resume-results"
    >
      {/* Header */}
      <motion.div variants={item} className="sticky top-20 z-30 bg-background/80 backdrop-blur-md p-4 rounded-xl border shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back" className="shrink-0 hover:bg-primary/10 -ml-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold truncate flex items-center gap-2" data-testid="text-resume-name">
                {resume.name || "Unknown Candidate"}
                <Sparkles className="h-4 w-4 text-amber-400 fill-amber-400" />
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate flex items-center gap-2">
                <span>Parsed from {resume.metadata.originalFilename}</span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span>{new Date().toLocaleDateString()}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {resume.metadata.overallConfidence !== undefined && (
              <div className="flex flex-col items-end mr-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Confidence</span>
                <ConfidenceBadge score={resume.metadata.overallConfidence} />
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="shadow-sm" data-testid="button-export">
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onExport("json")} data-testid="menu-export-json">
                  <FileJson className="h-4 w-4 mr-2 text-orange-500" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport("csv")} data-testid="menu-export-csv">
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      {/* Summary */}
      {resume.summary && (
        <motion.div variants={item}>
          <Card className="bg-gradient-to-br from-card to-secondary/20 border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4" /> Professional Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm sm:text-base leading-relaxed text-foreground/90" data-testid="text-summary">{resume.summary}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Personal Info */}
      <Section id="personal" title="Contact Information" icon={User} isEmpty={!hasContactInfo}>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {resume.contactInfo.email && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group" data-testid="contact-email">
              <div className="p-2 bg-background rounded-full shadow-sm">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium truncate">{resume.contactInfo.email}</span>
            </div>
          )}
          {resume.contactInfo.phone && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group" data-testid="contact-phone">
              <div className="p-2 bg-background rounded-full shadow-sm">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium truncate">{resume.contactInfo.phone}</span>
            </div>
          )}
          {resume.contactInfo.address && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group" data-testid="contact-address">
              <div className="p-2 bg-background rounded-full shadow-sm">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium truncate">{resume.contactInfo.address}</span>
            </div>
          )}
          {resume.contactInfo.linkedin && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group" data-testid="contact-linkedin">
              <div className="p-2 bg-background rounded-full shadow-sm">
                <Linkedin className="h-4 w-4 text-primary" />
              </div>
              <a href={resume.contactInfo.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm font-medium truncate text-primary hover:underline">
                LinkedIn Profile
              </a>
            </div>
          )}
          {resume.contactInfo.github && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group" data-testid="contact-github">
              <div className="p-2 bg-background rounded-full shadow-sm">
                <Github className="h-4 w-4 text-primary" />
              </div>
              <a href={resume.contactInfo.github} target="_blank" rel="noopener noreferrer" className="text-sm font-medium truncate text-primary hover:underline">
                GitHub Profile
              </a>
            </div>
          )}
        </div>
      </Section>

      {/* Experience */}
      <Section
        id="experience"
        title="Work Experience"
        icon={Briefcase}
        isEmpty={resume.experience.length === 0}
      >
        <div className="space-y-8 relative before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted">
          {resume.experience.map((exp, index) => (
            <div key={index} className="relative pl-8 group" data-testid={`experience-${index}`}>
              <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full border-4 border-background bg-primary/20 group-hover:bg-primary transition-colors" />

              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                <div>
                  <h4 className="font-bold text-base sm:text-lg">{exp.position}</h4>
                  <div className="text-primary font-medium">{exp.company}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="text-xs bg-background">
                    {exp.startDate || "N/A"} - {exp.endDate || "Present"}
                  </Badge>
                  <ConfidenceBadge score={exp.confidenceScore} showLabel={false} />
                </div>
              </div>

              {exp.responsibilities.length > 0 && (
                <ul className="space-y-1.5 text-sm text-muted-foreground mt-3">
                  {exp.responsibilities.map((resp, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="block w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{resp}</span>
                    </li>
                  ))}
                </ul>
              )}
              {exp.achievements.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pl-1">
                  {exp.achievements.map((ach, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {ach}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Education */}
      <Section
        id="education"
        title="Education"
        icon={GraduationCap}
        isEmpty={resume.education.length === 0}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {resume.education.map((edu, index) => (
            <div key={index} className="p-4 rounded-xl bg-muted/30 border hover:border-primary/20 transition-all group" data-testid={`education-${index}`}>
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-base">{edu.degree}</h4>
                  <p className="text-sm font-medium text-foreground/80">{edu.institution}</p>
                  {edu.gpa && (
                    <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-1">
                      GPA: {edu.gpa}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {edu.graduationDate && (
                    <Badge variant="secondary" className="mb-2 whitespace-nowrap">
                      {edu.graduationDate}
                    </Badge>
                  )}
                  <div className="flex justify-end">
                    <ConfidenceBadge score={edu.confidenceScore} showLabel={false} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Skills */}
      <Section
        id="skills"
        title="Skills"
        icon={Wrench}
        confidenceScore={resume.skills.confidenceScore}
        isEmpty={resume.skills.technical.length === 0 && resume.skills.soft.length === 0}
      >
        <div className="space-y-6">
          {resume.skills.technical.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Wrench className="h-4 w-4" /> Technical Proficiency
              </h4>
              <div className="flex flex-wrap gap-2">
                {resume.skills.technical.map((skill, i) => (
                  <Badge key={i} className="px-3 py-1 bg-primary/5 text-foreground hover:bg-primary hover:text-primary-foreground border-primary/20 transition-all cursor-default" data-testid={`skill-technical-${i}`}>
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {resume.skills.soft.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <User className="h-4 w-4" /> Soft Skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {resume.skills.soft.map((skill, i) => (
                  <Badge key={i} variant="outline" className="px-3 py-1 border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-default" data-testid={`skill-soft-${i}`}>
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Projects */}
      <Section
        id="projects"
        title="Projects"
        icon={FolderOpen}
        isEmpty={resume.projects.length === 0}
      >
        <div className="grid gap-4">
          {resume.projects.map((project, index) => (
            <div key={index} className="space-y-3 p-4 rounded-xl border bg-card/50 hover:shadow-sm transition-all" data-testid={`project-${index}`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <h4 className="font-bold text-base flex items-center gap-2">
                    {project.name}
                    {project.url && (
                      <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </h4>
                </div>
                <ConfidenceBadge score={project.confidenceScore} showLabel={false} />
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>

              {project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {project.technologies.map((tech, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Rest of the sections - Certifications, Languages, Links using similar pattern */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="col-span-1">
          {/* Certifications */}
          <Section
            id="certifications"
            title="Certifications"
            icon={Award}
            isEmpty={resume.certifications.length === 0}
          >
            <div className="space-y-4">
              {resume.certifications.map((cert, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30" data-testid={`certification-${index}`}>
                  <div className="mt-1 p-1 bg-amber-500/10 rounded-full shrink-0">
                    <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm break-words">{cert.name}</h4>
                    <p className="text-xs text-muted-foreground break-words font-medium">{cert.issuer}</p>
                    {cert.issueDate && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Issued: {cert.issueDate}
                      </p>
                    )}
                  </div>
                  <ConfidenceBadge score={cert.confidenceScore} showLabel={false} />
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="col-span-1">
          {/* Languages */}
          <Section
            id="languages"
            title="Languages"
            icon={Globe}
            isEmpty={resume.languages.length === 0}
          >
            <div className="space-y-3">
              {resume.languages.map((lang, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  data-testid={`language-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-primary/70" />
                    <span className="text-sm font-semibold">{lang.language}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs uppercase tracking-wide text-[10px]">{lang.proficiency}</Badge>
                    <ConfidenceBadge score={lang.confidenceScore} showLabel={false} />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      {hasLinks && (
        <Section
          id="links"
          title="Extracted Links"
          icon={ExternalLink}
          isEmpty={!hasLinks}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resume.links?.profiles && resume.links.profiles.length > 0 && resume.links.profiles.map((link, index) => (
              <a
                key={`p-${index}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all group"
              >
                <div className="p-1.5 bg-background rounded-md shadow-sm group-hover:bg-primary/10 transition-colors">
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile</div>
                  <div className="text-sm truncate font-medium">{link.platform || "Link"}</div>
                </div>
              </a>
            ))}

            {resume.links?.projects && resume.links.projects.length > 0 && resume.links.projects.map((link, index) => (
              <a
                key={`pr-${index}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all group"
              >
                <div className="p-1.5 bg-background rounded-md shadow-sm group-hover:bg-primary/10 transition-colors">
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</div>
                  <div className="text-sm truncate font-medium">{link.projectName || "Project Link"}</div>
                </div>
              </a>
            ))}

            {resume.links?.additional && resume.links.additional.length > 0 && resume.links.additional.map((link, index) => (
              <a
                key={`a-${index}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all group"
              >
                <div className="p-1.5 bg-background rounded-md shadow-sm group-hover:bg-primary/10 transition-colors">
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Other</div>
                  <div className="text-sm truncate font-medium">{link.context || "External Link"}</div>
                </div>
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* Metadata & Analysis */}
      <motion.div variants={item} className="grid sm:grid-cols-3 gap-6">
        <div className="sm:col-span-1">
          <Card className="h-full bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{resume.metadata.fileType.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-medium">{(resume.metadata.fileSize / 1024).toFixed(1)} KB</span>
                </div>
                {resume.metadata.language && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Language:</span>
                    <span className="font-medium">{resume.metadata.language}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="sm:col-span-2">
          <AnalysisPanel resumeId={resume.id} />
        </div>
      </motion.div>
    </motion.div>
  );
}
