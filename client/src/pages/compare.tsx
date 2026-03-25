import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  FileText, ArrowLeft, GitCompareArrows, Loader2, ChevronDown,
  Briefcase, GraduationCap, Wrench, Star, FolderOpen, Award, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { API_BASE } from "@/lib/queryClient";
import type { ParsedResume } from "@shared/schema";

interface SavedResumeItem {
  id: string;
  name: string | null;
  email: string | null;
  fileType: string;
  fileSize: number;
  overallConfidence: number | null;
  createdAt: string;
}

export default function Compare() {
  const [resumes, setResumes] = useState<SavedResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState<string>("");
  const [selectedB, setSelectedB] = useState<string>("");
  const [resumeA, setResumeA] = useState<ParsedResume | null>(null);
  const [resumeB, setResumeB] = useState<ParsedResume | null>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/resumes/saved/all`)
      .then((res) => res.json())
      .then((data) => setResumes(data))
      .catch(() => setResumes([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCompare = async () => {
    if (!selectedA || !selectedB) return;
    setComparing(true);
    setResumeA(null);
    setResumeB(null);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`${API_BASE}/api/resumes/saved/${selectedA}`).then((r) => r.json()),
        fetch(`${API_BASE}/api/resumes/saved/${selectedB}`).then((r) => r.json()),
      ]);
      setResumeA(resA);
      setResumeB(resB);
    } catch {
      // error handled by empty state
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-12 bg-[hsl(var(--card))] border-b flex items-center justify-between px-4 shrink-0 z-40">
        <div className="flex items-center gap-6">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-semibold text-[15px] tracking-tight text-foreground">Resume Parser</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/">
              <button className="px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </button>
            </Link>
            <button className="px-3 py-1.5 text-[13px] font-medium text-primary border-b-2 border-primary -mb-[1px]">
              Compare
            </button>
            <Link href="/jobs">
              <button className="px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                Jobs
              </button>
            </Link>
            <Link href="/help">
              <button className="px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                Help
              </button>
            </Link>
            <Link href="/settings">
              <button className="px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                Settings
              </button>
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-6xl mx-auto">
            {/* Heading */}
            <div className="flex items-center gap-3 mb-6">
              <Link href="/">
                <button className="shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Compare Resumes</h1>
                <p className="text-sm text-muted-foreground">Select two resumes to compare side by side.</p>
              </div>
            </div>

            {/* Selection controls */}
            <div className="bg-[hsl(var(--card))] rounded-xl border p-5 mb-6">
              {loading ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-[12px]">Loading resumes...</span>
                </div>
              ) : resumes.length < 2 ? (
                <div className="text-center py-4">
                  <GitCompareArrows className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-[13px] text-muted-foreground">You need at least 2 parsed resumes to compare. Upload more from the Dashboard.</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="flex-1 w-full">
                    <Label className="text-[12px] mb-1.5 block">Resume A</Label>
                    <div className="relative">
                      <select
                        value={selectedA}
                        onChange={(e) => setSelectedA(e.target.value)}
                        className="w-full h-9 rounded-lg border bg-transparent px-3 text-[13px] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Select a resume...</option>
                        {resumes.filter((r) => r.id !== selectedB).map((r) => (
                          <option key={r.id} value={r.id}>{r.name || "Unknown"} — {r.fileType?.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex items-center justify-center w-10 h-9">
                    <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="flex-1 w-full">
                    <Label className="text-[12px] mb-1.5 block">Resume B</Label>
                    <div className="relative">
                      <select
                        value={selectedB}
                        onChange={(e) => setSelectedB(e.target.value)}
                        className="w-full h-9 rounded-lg border bg-transparent px-3 text-[13px] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Select a resume...</option>
                        {resumes.filter((r) => r.id !== selectedA).map((r) => (
                          <option key={r.id} value={r.id}>{r.name || "Unknown"} — {r.fileType?.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <Button
                    onClick={handleCompare}
                    disabled={!selectedA || !selectedB || comparing}
                    size="sm"
                    className="h-9 text-[12px] px-5"
                  >
                    {comparing ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Loading...</> : <><GitCompareArrows className="h-3 w-3 mr-1.5" /> Compare</>}
                  </Button>
                </div>
              )}
            </div>

            {/* Comparison view */}
            {resumeA && resumeB && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResumeCard resume={resumeA} label="A" color="bg-[#3b82f6]" />
                <ResumeCard resume={resumeB} label="B" color="bg-[#8b5cf6]" />

                {/* Quick stats comparison */}
                <div className="lg:col-span-2 bg-[hsl(var(--card))] rounded-xl border p-5">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
                    Quick Comparison
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ComparisonStat
                      label="Experience"
                      icon={Briefcase}
                      valueA={`${resumeA.experience.length} roles`}
                      valueB={`${resumeB.experience.length} roles`}
                      winnerA={resumeA.experience.length >= resumeB.experience.length}
                    />
                    <ComparisonStat
                      label="Education"
                      icon={GraduationCap}
                      valueA={`${resumeA.education.length} entries`}
                      valueB={`${resumeB.education.length} entries`}
                      winnerA={resumeA.education.length >= resumeB.education.length}
                    />
                    <ComparisonStat
                      label="Technical Skills"
                      icon={Wrench}
                      valueA={`${resumeA.skills.technical.length} skills`}
                      valueB={`${resumeB.skills.technical.length} skills`}
                      winnerA={resumeA.skills.technical.length >= resumeB.skills.technical.length}
                    />
                    <ComparisonStat
                      label="Confidence"
                      icon={Star}
                      valueA={`${Math.round(resumeA.metadata.overallConfidence || 0)}%`}
                      valueB={`${Math.round(resumeB.metadata.overallConfidence || 0)}%`}
                      winnerA={(resumeA.metadata.overallConfidence || 0) >= (resumeB.metadata.overallConfidence || 0)}
                    />
                  </div>

                  {/* Skills overlap */}
                  <div className="mt-5 border-t pt-4">
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Skills Overlap</h4>
                    <SkillsOverlap skillsA={resumeA.skills.technical} skillsB={resumeB.skills.technical} nameA={resumeA.name} nameB={resumeB.name} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Resume summary card for comparison ─── */
function ResumeCard({ resume, label, color }: { resume: ParsedResume; label: string; color: string }) {
  return (
    <div className="bg-[hsl(var(--card))] rounded-xl border overflow-hidden">
      <div className={`h-1 ${color}`} />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-9 h-9 rounded-full ${color}/10 flex items-center justify-center shrink-0`}>
            <span className="text-[12px] font-bold" style={{ color: color.includes("3b82f6") ? "#3b82f6" : "#8b5cf6" }}>{label}</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold truncate">{resume.name || "Unknown"}</h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {resume.contactInfo.email || "No email"} &middot; {resume.metadata.originalFilename}
            </p>
          </div>
          {resume.metadata.overallConfidence !== undefined && (
            <Badge variant="secondary" className="text-[10px] shrink-0 ml-auto">
              {Math.round(resume.metadata.overallConfidence)}%
            </Badge>
          )}
        </div>

        {/* Summary */}
        {resume.summary && (
          <p className="text-[12px] text-muted-foreground leading-relaxed mb-4 line-clamp-3">{resume.summary}</p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Briefcase} label="Experience" value={resume.experience.length} items={resume.experience.map((e) => e.position).slice(0, 3)} />
          <StatCard icon={GraduationCap} label="Education" value={resume.education.length} items={resume.education.map((e) => e.degree).slice(0, 3)} />
          <StatCard icon={Wrench} label="Skills" value={resume.skills.technical.length + resume.skills.soft.length} items={resume.skills.technical.slice(0, 5)} />
          <StatCard icon={FolderOpen} label="Projects" value={resume.projects.length} items={resume.projects.map((p) => p.name).slice(0, 3)} />
        </div>

        {/* Certifications & Languages */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {resume.certifications.length > 0 && (
            <div className="p-2.5 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-1.5 mb-1">
                <Award className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">{resume.certifications.length} Cert{resume.certifications.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-0.5">
                {resume.certifications.slice(0, 2).map((c, i) => (
                  <p key={i} className="text-[11px] truncate">{c.name}</p>
                ))}
              </div>
            </div>
          )}
          {resume.languages.length > 0 && (
            <div className="p-2.5 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-1.5 mb-1">
                <Globe className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">{resume.languages.length} Language{resume.languages.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {resume.languages.map((l, i) => (
                  <Badge key={i} variant="secondary" className="text-[9px]">{l.language}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, items }: { icon: React.ElementType; label: string; value: number; items: string[] }) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/30 border">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</span>
        </div>
        <span className="text-[12px] font-bold">{value}</span>
      </div>
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <p key={i} className="text-[11px] text-muted-foreground truncate">{item}</p>
        ))}
        {value > items.length && (
          <p className="text-[10px] text-muted-foreground/60">+{value - items.length} more</p>
        )}
      </div>
    </div>
  );
}

function ComparisonStat({ label, icon: Icon, valueA, valueB, winnerA }: {
  label: string; icon: React.ElementType; valueA: string; valueB: string; winnerA: boolean;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className={`text-center p-1.5 rounded ${winnerA ? "bg-[#3b82f6]/10" : ""}`}>
          <span className="text-[10px] text-muted-foreground block">A</span>
          <span className={`text-[13px] font-semibold ${winnerA ? "text-[#3b82f6]" : ""}`}>{valueA}</span>
        </div>
        <div className={`text-center p-1.5 rounded ${!winnerA ? "bg-[#8b5cf6]/10" : ""}`}>
          <span className="text-[10px] text-muted-foreground block">B</span>
          <span className={`text-[13px] font-semibold ${!winnerA ? "text-[#8b5cf6]" : ""}`}>{valueB}</span>
        </div>
      </div>
    </div>
  );
}

function SkillsOverlap({ skillsA, skillsB, nameA, nameB }: {
  skillsA: string[]; skillsB: string[]; nameA: string; nameB: string;
}) {
  const setA = new Set(skillsA.map((s) => s.toLowerCase()));
  const setB = new Set(skillsB.map((s) => s.toLowerCase()));

  const shared = skillsA.filter((s) => setB.has(s.toLowerCase()));
  const onlyA = skillsA.filter((s) => !setB.has(s.toLowerCase()));
  const onlyB = skillsB.filter((s) => !setA.has(s.toLowerCase()));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <h5 className="text-[10px] font-semibold text-[#3b82f6] mb-1.5">Only {nameA || "A"} ({onlyA.length})</h5>
        <div className="flex flex-wrap gap-1">
          {onlyA.map((s, i) => (
            <Badge key={i} variant="outline" className="text-[9px] border-[#3b82f6]/30 text-[#3b82f6]">{s}</Badge>
          ))}
          {onlyA.length === 0 && <span className="text-[11px] text-muted-foreground italic">None</span>}
        </div>
      </div>
      <div>
        <h5 className="text-[10px] font-semibold text-[#2da77d] mb-1.5">Shared ({shared.length})</h5>
        <div className="flex flex-wrap gap-1">
          {shared.map((s, i) => (
            <Badge key={i} variant="secondary" className="text-[9px] bg-[#2da77d]/10 text-[#2da77d]">{s}</Badge>
          ))}
          {shared.length === 0 && <span className="text-[11px] text-muted-foreground italic">None</span>}
        </div>
      </div>
      <div>
        <h5 className="text-[10px] font-semibold text-[#8b5cf6] mb-1.5">Only {nameB || "B"} ({onlyB.length})</h5>
        <div className="flex flex-wrap gap-1">
          {onlyB.map((s, i) => (
            <Badge key={i} variant="outline" className="text-[9px] border-[#8b5cf6]/30 text-[#8b5cf6]">{s}</Badge>
          ))}
          {onlyB.length === 0 && <span className="text-[11px] text-muted-foreground italic">None</span>}
        </div>
      </div>
    </div>
  );
}
