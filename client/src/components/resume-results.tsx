import { useState } from "react";
import { 
  User, Mail, Phone, MapPin, Linkedin, Github, 
  Briefcase, GraduationCap, Wrench, FolderOpen, 
  Award, Globe, ChevronDown, ChevronUp, Download, 
  ArrowLeft, FileJson, FileSpreadsheet, ExternalLink
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

interface ResumeResultsProps {
  resume: ParsedResume;
  onBack: () => void;
  onExport: (format: ExportFormat) => void;
}

export function ResumeResults({ resume, onBack, onExport }: ResumeResultsProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["personal", "experience", "education", "skills", "projects", "certifications", "languages"])
  );

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
    <Collapsible open={openSections.has(id)} onOpenChange={() => toggleSection(id)}>
      <Card className={isEmpty ? "opacity-60" : ""}>
        <CollapsibleTrigger asChild>
          <CardHeader className="flex flex-row items-center justify-between gap-2 sm:gap-4 cursor-pointer hover-elevate py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-md shrink-0">
                <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              </div>
              <CardTitle className="text-sm sm:text-base truncate">{title}</CardTitle>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {confidenceScore !== undefined && <ConfidenceBadge score={confidenceScore} />}
              {openSections.has(id) ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isEmpty ? (
              <p className="text-sm text-muted-foreground italic">No data found</p>
            ) : (
              children
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  const hasContactInfo = resume.contactInfo.email || resume.contactInfo.phone || 
    resume.contactInfo.address || resume.contactInfo.linkedin || resume.contactInfo.github;

  const hasLinks = resume.links && (
    (resume.links.profiles && resume.links.profiles.length > 0) ||
    (resume.links.projects && resume.links.projects.length > 0) ||
    (resume.links.additional && resume.links.additional.length > 0)
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6" data-testid="resume-results">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate" data-testid="text-resume-name">{resume.name || "Unknown"}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Parsed from {resume.metadata.originalFilename}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {resume.metadata.overallConfidence !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">Overall Confidence:</span>
              <span className="text-xs sm:text-sm text-muted-foreground sm:hidden">Confidence:</span>
              <ConfidenceBadge score={resume.metadata.overallConfidence} />
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="text-xs sm:text-sm" data-testid="button-export">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport("json")} data-testid="menu-export-json">
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("csv")} data-testid="menu-export-csv">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary */}
      {resume.summary && (
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm leading-relaxed break-words" data-testid="text-summary">{resume.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Personal Info */}
      <Section id="personal" title="Contact Information" icon={User} isEmpty={!hasContactInfo}>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {resume.contactInfo.email && (
            <div className="flex items-center gap-2" data-testid="contact-email">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{resume.contactInfo.email}</span>
            </div>
          )}
          {resume.contactInfo.phone && (
            <div className="flex items-center gap-2" data-testid="contact-phone">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{resume.contactInfo.phone}</span>
            </div>
          )}
          {resume.contactInfo.address && (
            <div className="flex items-center gap-2" data-testid="contact-address">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{resume.contactInfo.address}</span>
            </div>
          )}
          {resume.contactInfo.linkedin && (
            <div className="flex items-center gap-2 min-w-0" data-testid="contact-linkedin">
              <Linkedin className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={resume.contactInfo.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm truncate text-primary hover:underline">
                {resume.contactInfo.linkedin}
              </a>
            </div>
          )}
          {resume.contactInfo.github && (
            <div className="flex items-center gap-2 min-w-0" data-testid="contact-github">
              <Github className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={resume.contactInfo.github} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm truncate text-primary hover:underline">
                {resume.contactInfo.github}
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
        <div className="space-y-6">
          {resume.experience.map((exp, index) => (
            <div key={index} className="space-y-2" data-testid={`experience-${index}`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm sm:text-base break-words">{exp.position}</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">{exp.company}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {exp.startDate || "N/A"} - {exp.endDate || "Present"}
                  </span>
                  <ConfidenceBadge score={exp.confidenceScore} showLabel={false} />
                </div>
              </div>
              {exp.responsibilities.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-muted-foreground pl-1">
                  {exp.responsibilities.map((resp, i) => (
                    <li key={i} className="break-words">{resp}</li>
                  ))}
                </ul>
              )}
              {exp.achievements.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {exp.achievements.map((ach, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{ach}</Badge>
                  ))}
                </div>
              )}
              {index < resume.experience.length - 1 && <Separator className="mt-4" />}
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
        <div className="space-y-4">
          {resume.education.map((edu, index) => (
            <div key={index} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4" data-testid={`education-${index}`}>
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-sm sm:text-base break-words">{edu.degree}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground break-words">{edu.institution}</p>
                {edu.gpa && (
                  <p className="text-xs text-muted-foreground">GPA: {edu.gpa}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {edu.graduationDate && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{edu.graduationDate}</span>
                )}
                <ConfidenceBadge score={edu.confidenceScore} showLabel={false} />
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
        <div className="space-y-4">
          {resume.skills.technical.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Technical Skills</h4>
              <div className="flex flex-wrap gap-2">
                {resume.skills.technical.map((skill, i) => (
                  <Badge key={i} variant="secondary" data-testid={`skill-technical-${i}`}>{skill}</Badge>
                ))}
              </div>
            </div>
          )}
          {resume.skills.soft.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Soft Skills</h4>
              <div className="flex flex-wrap gap-2">
                {resume.skills.soft.map((skill, i) => (
                  <Badge key={i} variant="outline" data-testid={`skill-soft-${i}`}>{skill}</Badge>
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
        <div className="space-y-4">
          {resume.projects.map((project, index) => (
            <div key={index} className="space-y-2" data-testid={`project-${index}`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm sm:text-base break-words">{project.name}</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">{project.description}</p>
                </div>
                <div className="shrink-0">
                  <ConfidenceBadge score={project.confidenceScore} showLabel={false} />
                </div>
              </div>
              {project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {project.technologies.map((tech, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{tech}</Badge>
                  ))}
                </div>
              )}
              {project.url && (
                <a 
                  href={project.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline break-all"
                >
                  {project.url}
                </a>
              )}
              {index < resume.projects.length - 1 && <Separator className="mt-3" />}
            </div>
          ))}
        </div>
      </Section>

      {/* Certifications */}
      <Section 
        id="certifications" 
        title="Certifications" 
        icon={Award}
        isEmpty={resume.certifications.length === 0}
      >
        <div className="space-y-3">
          {resume.certifications.map((cert, index) => (
            <div key={index} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4" data-testid={`certification-${index}`}>
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-xs sm:text-sm break-words">{cert.name}</h4>
                <p className="text-xs text-muted-foreground break-words">{cert.issuer}</p>
                {cert.issueDate && (
                  <p className="text-xs text-muted-foreground">
                    Issued: {cert.issueDate}
                    {cert.expirationDate && ` | Expires: ${cert.expirationDate}`}
                  </p>
                )}
              </div>
              <div className="shrink-0">
                <ConfidenceBadge score={cert.confidenceScore} showLabel={false} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Languages */}
      <Section 
        id="languages" 
        title="Languages" 
        icon={Globe}
        isEmpty={resume.languages.length === 0}
      >
        <div className="flex flex-wrap gap-3">
          {resume.languages.map((lang, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md"
              data-testid={`language-${index}`}
            >
              <span className="text-sm font-medium">{lang.language}</span>
              <Badge variant="secondary" className="text-xs">{lang.proficiency}</Badge>
              <ConfidenceBadge score={lang.confidenceScore} showLabel={false} />
            </div>
          ))}
        </div>
      </Section>

      {/* Extracted Links */}
      {hasLinks && (
        <Section
          id="links"
          title="Extracted Links"
          icon={ExternalLink}
          isEmpty={!hasLinks}
        >
          <div className="space-y-4">
            {resume.links?.profiles && resume.links.profiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Profile Links</h4>
                <div className="space-y-1">
                  {resume.links.profiles.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                      data-testid={`link-profile-${index}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>{link.platform || link.anchorText || link.url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {resume.links?.projects && resume.links.projects.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Project Links</h4>
                <div className="space-y-1">
                  {resume.links.projects.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                      data-testid={`link-project-${index}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>{link.projectName || link.anchorText || link.url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {resume.links?.additional && resume.links.additional.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Additional Links</h4>
                <div className="space-y-1">
                  {resume.links.additional.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                      data-testid={`link-additional-${index}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>{link.context || link.anchorText || link.url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Metadata */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-wrap gap-3 sm:gap-6 text-xs text-muted-foreground">
            <div>
              <span className="font-medium">File:</span> {resume.metadata.originalFilename}
            </div>
            <div>
              <span className="font-medium">Type:</span> {resume.metadata.fileType.toUpperCase()}
            </div>
            <div>
              <span className="font-medium">Size:</span> {(resume.metadata.fileSize / 1024).toFixed(1)} KB
            </div>
            {resume.metadata.processingTime && (
              <div>
                <span className="font-medium">Processing Time:</span> {(resume.metadata.processingTime / 1000).toFixed(1)}s
              </div>
            )}
            {resume.metadata.language && (
              <div>
                <span className="font-medium">Language:</span> {resume.metadata.language}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Tools */}
      <AnalysisPanel resumeId={resume.id} />
    </div>
  );
}
