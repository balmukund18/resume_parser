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
          <CardHeader className="flex flex-row items-center justify-between gap-4 cursor-pointer hover-elevate">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              {confidenceScore !== undefined && <ConfidenceBadge score={confidenceScore} />}
              {openSections.has(id) ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
    <div className="w-full max-w-4xl mx-auto space-y-6" data-testid="resume-results">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-resume-name">{resume.name || "Unknown"}</h1>
            <p className="text-sm text-muted-foreground">
              Parsed from {resume.metadata.originalFilename}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {resume.metadata.overallConfidence !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Overall Confidence:</span>
              <ConfidenceBadge score={resume.metadata.overallConfidence} />
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-testid="button-export">
                <Download className="h-4 w-4 mr-2" />
                Export
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
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed" data-testid="text-summary">{resume.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Personal Info */}
      <Section id="personal" title="Contact Information" icon={User} isEmpty={!hasContactInfo}>
        <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="flex items-center gap-2" data-testid="contact-linkedin">
              <Linkedin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate">{resume.contactInfo.linkedin}</span>
            </div>
          )}
          {resume.contactInfo.github && (
            <div className="flex items-center gap-2" data-testid="contact-github">
              <Github className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate">{resume.contactInfo.github}</span>
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
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h4 className="font-semibold">{exp.position}</h4>
                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {exp.startDate || "N/A"} - {exp.endDate || "Present"}
                  </span>
                  <ConfidenceBadge score={exp.confidenceScore} showLabel={false} />
                </div>
              </div>
              {exp.responsibilities.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground pl-1">
                  {exp.responsibilities.map((resp, i) => (
                    <li key={i}>{resp}</li>
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
            <div key={index} className="flex items-start justify-between gap-4 flex-wrap" data-testid={`education-${index}`}>
              <div>
                <h4 className="font-semibold">{edu.degree}</h4>
                <p className="text-sm text-muted-foreground">{edu.institution}</p>
                {edu.gpa && (
                  <p className="text-xs text-muted-foreground">GPA: {edu.gpa}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {edu.graduationDate && (
                  <span className="text-xs text-muted-foreground">{edu.graduationDate}</span>
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
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h4 className="font-semibold">{project.name}</h4>
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                </div>
                <ConfidenceBadge score={project.confidenceScore} showLabel={false} />
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
                  className="text-xs text-primary hover:underline"
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
            <div key={index} className="flex items-start justify-between gap-4 flex-wrap" data-testid={`certification-${index}`}>
              <div>
                <h4 className="font-semibold text-sm">{cert.name}</h4>
                <p className="text-xs text-muted-foreground">{cert.issuer}</p>
                {cert.issueDate && (
                  <p className="text-xs text-muted-foreground">
                    Issued: {cert.issueDate}
                    {cert.expirationDate && ` | Expires: ${cert.expirationDate}`}
                  </p>
                )}
              </div>
              <ConfidenceBadge score={cert.confidenceScore} showLabel={false} />
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
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
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
