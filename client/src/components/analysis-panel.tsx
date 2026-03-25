import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  BarChart3, Target, Search, Zap, TrendingUp,
  AlertCircle, CheckCircle2, Loader2, Info,
  Mail, Shield, Sparkles,
  Clock, ArrowRight, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getSettings } from "@/lib/settings";
import type {
  SkillsGapResult,
  ResumeScoreResult,
  JobMatchResult,
  KeywordOptimization,
  CredibilityResult,
  ImpactQuantificationResult
} from "@shared/schema";

interface AnalysisPanelProps {
  resumeId: string;
}

/* ─── SVG donut score ─── */
function ScoreDonut({ score, label, sublabel, size = 100 }: { score: number; label?: string; sublabel?: string; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#2da77d" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-700 ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{Math.round(score)}</span>
          {label && <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>}
        </div>
      </div>
      {sublabel && <span className="text-[11px] text-muted-foreground mt-1">{sublabel}</span>}
    </div>
  );
}

/* ─── Mini donut for grid ─── */
function MiniDonut({ score, label }: { score: number; label: string }) {
  const size = 48;
  const sw = 4;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (score / 100) * circ;
  const color = score >= 80 ? "#2da77d" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={sw} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" className="transition-all duration-500" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold" style={{ color }}>{Math.round(score)}</span>
        </div>
      </div>
      <span className="text-[9px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

/* ─── Progress bar metric ─── */
function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// Helper to cache/restore analysis results per resume
function getCachedAnalysis<T>(resumeId: string, key: string): T | null {
  try {
    const raw = sessionStorage.getItem(`analysis-${resumeId}-${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function setCachedAnalysis(resumeId: string, key: string, data: unknown) {
  try { sessionStorage.setItem(`analysis-${resumeId}-${key}`, JSON.stringify(data)); } catch { /* ignore */ }
}

export function AnalysisPanel({ resumeId }: AnalysisPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("score");
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [skillsGapResult, setSkillsGapResult] = useState<SkillsGapResult | null>(() => getCachedAnalysis(resumeId, "skillsGap"));
  const [resumeScore, setResumeScore] = useState<ResumeScoreResult | null>(() => getCachedAnalysis(resumeId, "score"));
  const [jobMatchResult, setJobMatchResult] = useState<JobMatchResult | null>(() => getCachedAnalysis(resumeId, "jobMatch"));
  const [keywordResult, setKeywordResult] = useState<KeywordOptimization | null>(() => getCachedAnalysis(resumeId, "keywords"));
  const [credibilityResult, setCredibilityResult] = useState<CredibilityResult | null>(() => getCachedAnalysis(resumeId, "credibility"));
  const [impactResult, setImpactResult] = useState<ImpactQuantificationResult | null>(() => getCachedAnalysis(resumeId, "impact"));
  const [emailAddress, setEmailAddress] = useState("");
  const [includeFullDetails, setIncludeFullDetails] = useState(true);

  // Load email defaults from settings
  useEffect(() => {
    const s = getSettings();
    if (s.defaultEmail) setEmailAddress(s.defaultEmail);
    setIncludeFullDetails(s.emailIncludeFullDetails);
  }, []);

  // Sync analysis state when resumeId changes (handles resume switching without unmount)
  useEffect(() => {
    setSkillsGapResult(getCachedAnalysis(resumeId, "skillsGap"));
    setResumeScore(getCachedAnalysis(resumeId, "score"));
    setJobMatchResult(getCachedAnalysis(resumeId, "jobMatch"));
    setKeywordResult(getCachedAnalysis(resumeId, "keywords"));
    setCredibilityResult(getCachedAnalysis(resumeId, "credibility"));
    setImpactResult(getCachedAnalysis(resumeId, "impact"));
  }, [resumeId]);

  const scoreMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", `/api/resumes/${resumeId}/score`, {}); return res.json(); },
    onSuccess: (data) => { setResumeScore(data); setCachedAnalysis(resumeId, "score", data); toast({ title: "Resume scored", description: `Overall score: ${Math.round(data.overallScore)}%` }); },
    onError: (error: Error) => { toast({ title: "Scoring failed", description: error.message, variant: "destructive" }); },
  });

  const skillsGapMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", `/api/resumes/${resumeId}/skills-gap`, { title: jobTitle, company: jobCompany, description: jobDescription }); return res.json(); },
    onSuccess: (data) => { setSkillsGapResult(data); setCachedAnalysis(resumeId, "skillsGap", data); toast({ title: "Skills gap analysis complete", description: `Match score: ${Math.round(data.matchScore)}%` }); },
    onError: (error: Error) => { toast({ title: "Analysis failed", description: error.message, variant: "destructive" }); },
  });

  const jobMatchMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", `/api/resumes/${resumeId}/match-job`, { title: jobTitle, company: jobCompany, description: jobDescription }); return res.json(); },
    onSuccess: (data) => { setJobMatchResult(data); setCachedAnalysis(resumeId, "jobMatch", data); toast({ title: "Job matching complete", description: `Match score: ${Math.round(data.matchScore)}%` }); },
    onError: (error: Error) => { toast({ title: "Matching failed", description: error.message, variant: "destructive" }); },
  });

  const keywordMutation = useMutation({
    mutationFn: async () => { const body = jobTitle && jobDescription ? { title: jobTitle, description: jobDescription } : {}; const res = await apiRequest("POST", `/api/resumes/${resumeId}/optimize-keywords`, body); return res.json(); },
    onSuccess: (data) => { setKeywordResult(data); setCachedAnalysis(resumeId, "keywords", data); toast({ title: "Keyword analysis complete", description: `ATS score: ${Math.round(data.atsScore)}%` }); },
    onError: (error: Error) => { toast({ title: "Optimization failed", description: error.message, variant: "destructive" }); },
  });

  const credibilityMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", `/api/resumes/${resumeId}/credibility`, {}); return res.json(); },
    onSuccess: (data) => { setCredibilityResult(data); setCachedAnalysis(resumeId, "credibility", data); toast({ title: "Credibility check complete", description: `Score: ${Math.round(data.credibilityScore)}%` }); },
    onError: (error: Error) => { toast({ title: "Credibility check failed", description: error.message, variant: "destructive" }); },
  });

  const impactMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", `/api/resumes/${resumeId}/impact`, {}); return res.json(); },
    onSuccess: (data) => { setImpactResult(data); setCachedAnalysis(resumeId, "impact", data); toast({ title: "Impact analysis complete", description: `Found ${data.weakBulletsCount} bullets to improve` }); },
    onError: (error: Error) => { toast({ title: "Impact analysis failed", description: error.message, variant: "destructive" }); },
  });

  const emailMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", `/api/resumes/${resumeId}/send-email`, { email: emailAddress, includeAnalysis: includeFullDetails }); return res.json(); },
    onSuccess: (data) => { toast({ title: "Email Notification", description: data.status || "Notification queued" }); },
    onError: (error: Error) => { toast({ title: "Email failed", description: error.message, variant: "destructive" }); },
  });

  const hasJobInfo = jobTitle.trim() && jobDescription.trim();

  const tabs = [
    { id: "score", label: "Score", icon: TrendingUp },
    { id: "credibility", label: "Verify", icon: Shield },
    { id: "impact", label: "Impact", icon: Sparkles },
    { id: "skills", label: "Match", icon: Target },
    { id: "keywords", label: "ATS", icon: Zap },
    { id: "email", label: "Email", icon: Mail },
  ];

  return (
    <div>
      {/* Header */}
      <h2 className="text-sm font-semibold mb-4">AI Insights</h2>

      {/* Score summary — shows active tab's score */}
      {(() => {
        // Determine which score + label to show based on active tab
        let score: number | null = null;
        let label = "";
        let secondaryLabel = "";
        let secondaryValue: number | null = null;

        switch (activeTab) {
          case "score":
            score = resumeScore?.overallScore ?? null;
            label = "SCORE";
            if (keywordResult) { secondaryLabel = "ATS Score"; secondaryValue = keywordResult.atsScore; }
            break;
          case "credibility":
            score = credibilityResult?.credibilityScore ?? null;
            label = "CREDIBILITY";
            break;
          case "impact":
            score = impactResult?.overallImpactScore ?? null;
            label = "IMPACT";
            break;
          case "skills":
            score = skillsGapResult?.matchScore ?? jobMatchResult?.matchScore ?? null;
            label = "MATCH";
            break;
          case "keywords":
            score = keywordResult?.atsScore ?? null;
            label = "ATS";
            if (resumeScore) { secondaryLabel = "Resume Score"; secondaryValue = resumeScore.overallScore; }
            break;
          default:
            score = resumeScore?.overallScore ?? null;
            label = "SCORE";
        }

        return score !== null ? (
          <div className="flex items-center gap-4 mb-5">
            <ScoreDonut score={score} label={label} size={90} />
            {secondaryValue !== null && (
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block">{secondaryLabel}</span>
                <span className="text-xl font-bold text-[#2da77d]">{Math.round(secondaryValue)}%</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center mb-5">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full border-[6px] border-muted flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-muted-foreground">?</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Run analysis to see insights</p>
            </div>
          </div>
        );
      })()}

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 mb-4 p-1 bg-muted/50 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-[hsl(var(--card))] text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}

      {/* Score */}
      {activeTab === "score" && (
        <div className="space-y-4">
          <Button onClick={() => scoreMutation.mutate()} disabled={scoreMutation.isPending} size="sm" className="w-full h-8 text-[12px]" data-testid="button-score-resume">
            {scoreMutation.isPending ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Analyzing...</> : <><TrendingUp className="h-3 w-3 mr-1.5" /> Score My Resume</>}
          </Button>
          {resumeScore && (
            <div className="space-y-4" data-testid="score-results">
              {/* Metric bars */}
              <div className="space-y-2.5">
                <MetricBar label="Completeness" value={resumeScore.completenessScore} color="bg-[#3b82f6]" />
                <MetricBar label="Keyword Match" value={resumeScore.keywordScore} color="bg-[#2da77d]" />
                <MetricBar label="Formatting" value={resumeScore.formattingScore} color="bg-[#8b5cf6]" />
                <MetricBar label="Experience" value={resumeScore.experienceScore} color="bg-[#f59e0b]" />
                <MetricBar label="Education" value={resumeScore.educationScore} color="bg-[#ef4444]" />
                <MetricBar label="Skills" value={resumeScore.skillsScore} color="bg-[#06b6d4]" />
              </div>
              {/* Suggestions */}
              {resumeScore.suggestions.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Improvement Impact</h4>
                  <div className="space-y-1.5">
                    {resumeScore.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40 text-[11px]">
                        <AlertCircle className="h-3 w-3 text-[#f59e0b] shrink-0 mt-0.5" />
                        <span className="text-muted-foreground leading-relaxed">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Credibility */}
      {activeTab === "credibility" && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground p-2 bg-[#2da77d]/5 dark:bg-[#2da77d]/10 rounded-lg border border-[#2da77d]/20 dark:border-[#2da77d]/20">
            Analyze for overlapping dates, unrealistic timelines, and skill-experience mismatches.
          </p>
          <Button onClick={() => credibilityMutation.mutate()} disabled={credibilityMutation.isPending} size="sm" className="w-full h-8 text-[12px]" data-testid="button-check-credibility">
            {credibilityMutation.isPending ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Analyzing...</> : <><Shield className="h-3 w-3 mr-1.5" /> Check Credibility</>}
          </Button>
          {credibilityResult && (
            <div className="space-y-3" data-testid="credibility-results">
              <div className="flex justify-center py-1">
                <ScoreDonut score={credibilityResult.credibilityScore} label="Score" size={80} />
              </div>
              <div className="p-2.5 bg-muted/40 rounded-lg space-y-2">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1"><Clock className="h-3 w-3" /> Timeline</h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-muted-foreground block">Experience</span><span className="font-medium">{credibilityResult.timelineAnalysis.totalYearsExperience} yrs</span></div>
                  <div><span className="text-muted-foreground block">Avg. Tenure</span><span className="font-medium">{Math.round(credibilityResult.timelineAnalysis.averageTenure)} mo</span></div>
                </div>
                {credibilityResult.timelineAnalysis.gaps.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {credibilityResult.timelineAnalysis.gaps.map((gap, i) => (
                      <Badge key={i} variant="outline" className="text-[9px]">{gap.start}-{gap.end} ({gap.durationMonths}mo)</Badge>
                    ))}
                  </div>
                )}
              </div>
              {credibilityResult.flags.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider">Flags ({credibilityResult.flags.length})</h4>
                  {credibilityResult.flags.map((flag, i) => (
                    <div key={i} className={`p-2 rounded-lg border text-[11px] ${flag.severity === 'high' ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/30' : flag.severity === 'medium' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/30' : 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/30'}`}>
                      <div className="flex items-start gap-1.5">
                        <Badge variant="outline" className={`text-[8px] shrink-0 ${flag.severity === 'high' ? 'border-red-400 text-red-700' : flag.severity === 'medium' ? 'border-amber-400 text-amber-700' : 'border-blue-400 text-blue-700'}`}>{flag.severity}</Badge>
                        <div><p className="font-medium">{flag.message}</p>{flag.details && <p className="text-muted-foreground mt-0.5">{flag.details}</p>}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="p-2.5 bg-muted/40 rounded-lg">
                <p className="text-[11px] text-muted-foreground">{credibilityResult.overallAssessment}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Impact */}
      {activeTab === "impact" && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground p-2 bg-[#8b5cf6]/5 dark:bg-[#8b5cf6]/10 rounded-lg border border-[#8b5cf6]/20 dark:border-[#8b5cf6]/20">
            Transform weak bullet points into powerful, quantified achievements.
          </p>
          <Button onClick={() => impactMutation.mutate()} disabled={impactMutation.isPending} size="sm" className="w-full h-8 text-[12px]" data-testid="button-quantify-impact">
            {impactMutation.isPending ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Analyzing...</> : <><Sparkles className="h-3 w-3 mr-1.5" /> Quantify Impact</>}
          </Button>
          {impactResult && (
            <div className="space-y-3" data-testid="impact-results">
              <div className="flex items-center justify-center gap-4 py-1">
                <ScoreDonut score={impactResult.overallImpactScore} label="Impact" size={70} />
                <div className="text-center">
                  <span className="text-xl font-bold text-[#8b5cf6]">{impactResult.weakBulletsCount}</span>
                  <span className="text-[10px] text-muted-foreground block">Improved</span>
                </div>
              </div>
              {impactResult.improvedBullets.length > 0 && (
                <div className="space-y-2">
                  {impactResult.improvedBullets.map((b, i) => (
                    <div key={i} className="p-2 bg-muted/40 rounded-lg text-[11px] space-y-1.5">
                      <div><Badge variant="outline" className="text-[8px] border-[#ef4444]/30 text-[#ef4444] mr-1">Before</Badge><span className="text-[#ef4444] dark:text-[#f87171] line-through">{b.original}</span></div>
                      <div className="flex justify-center"><ArrowRight className="h-3 w-3 text-muted-foreground" /></div>
                      <div><Badge variant="outline" className="text-[8px] border-[#2da77d]/30 text-[#2da77d] mr-1">After</Badge><span className="text-[#2da77d] dark:text-[#3dd68c] font-medium">{b.improved}</span></div>
                    </div>
                  ))}
                </div>
              )}
              {impactResult.suggestions.length > 0 && (
                <div className="space-y-1">
                  {impactResult.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-[#2da77d] shrink-0 mt-0.5" />{s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Skills / Job Match */}
      {activeTab === "skills" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <div><Label className="text-[11px]">Job Title</Label><Input placeholder="e.g., Software Engineer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="h-7 text-[12px]" data-testid="input-job-title" /></div>
            <div><Label className="text-[11px]">Company (optional)</Label><Input placeholder="e.g., Google" value={jobCompany} onChange={(e) => setJobCompany(e.target.value)} className="h-7 text-[12px]" data-testid="input-job-company" /></div>
            <div><Label className="text-[11px]">Job Description</Label><Textarea placeholder="Paste job description..." className="min-h-[60px] text-[12px]" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} data-testid="input-job-description" /></div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => skillsGapMutation.mutate()} disabled={skillsGapMutation.isPending || !hasJobInfo} size="sm" className="h-7 text-[11px]" data-testid="button-analyze-skills">
                {skillsGapMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Target className="h-3 w-3 mr-1" />Skills Gap</>}
              </Button>
              <Button onClick={() => jobMatchMutation.mutate()} disabled={jobMatchMutation.isPending || !hasJobInfo} size="sm" variant="outline" className="h-7 text-[11px]" data-testid="button-match-job">
                {jobMatchMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Search className="h-3 w-3 mr-1" />Match</>}
              </Button>
            </div>
          </div>
          {jobMatchResult && (
            <div data-testid="job-match-results" className="space-y-3">
              <div className="flex justify-center py-1"><ScoreDonut score={jobMatchResult.matchScore} label="Match" size={70} /></div>
              <div className="space-y-2">
                <MetricBar label="Skills" value={jobMatchResult.skillsMatch} color="bg-[#3b82f6]" />
                <MetricBar label="Experience" value={jobMatchResult.experienceMatch} color="bg-[#2da77d]" />
                <MetricBar label="Education" value={jobMatchResult.educationMatch} color="bg-[#8b5cf6]" />
              </div>
              {jobMatchResult.reasons.length > 0 && (
                <div className="space-y-1">{jobMatchResult.reasons.map((r, i) => <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground"><Info className="h-3 w-3 text-primary shrink-0 mt-0.5" />{r}</div>)}</div>
              )}
            </div>
          )}
          {skillsGapResult && (
            <div data-testid="skills-gap-results" className="space-y-3">
              {!jobMatchResult && <div className="flex justify-center py-1"><ScoreDonut score={skillsGapResult.matchScore} label="Match" size={70} /></div>}
              <div>
                <h4 className="text-[10px] font-medium text-[#2da77d] flex items-center gap-1 mb-1"><CheckCircle2 className="h-3 w-3" /> Matching ({skillsGapResult.matchingSkills.length})</h4>
                <div className="flex flex-wrap gap-1">{skillsGapResult.matchingSkills.map((s, i) => <Badge key={i} variant="secondary" className="text-[9px] bg-[#2da77d]/10 text-[#2da77d] dark:bg-[#2da77d]/20 dark:text-[#3dd68c]">{s}</Badge>)}</div>
              </div>
              <div>
                <h4 className="text-[10px] font-medium text-[#ef4444] flex items-center gap-1 mb-1"><AlertCircle className="h-3 w-3" /> Missing ({skillsGapResult.missingSkills.length})</h4>
                <div className="flex flex-wrap gap-1">{skillsGapResult.missingSkills.map((s, i) => <Badge key={i} variant="outline" className="text-[9px] border-[#ef4444]/30 text-[#ef4444] dark:border-[#ef4444]/40 dark:text-[#f87171]">{s}</Badge>)}</div>
              </div>
              {skillsGapResult.recommendations.length > 0 && (
                <div className="space-y-1">{skillsGapResult.recommendations.map((r, i) => <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground"><Zap className="h-3 w-3 text-[#f59e0b] shrink-0 mt-0.5" />{r}</div>)}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ATS/Keywords */}
      {activeTab === "keywords" && (
        <div className="space-y-3">
          <p className="text-[11px] text-muted-foreground">Optimize for ATS. Get keyword suggestions to improve pass rates.</p>
          <Button onClick={() => keywordMutation.mutate()} disabled={keywordMutation.isPending} size="sm" className="w-full h-8 text-[12px]" data-testid="button-optimize-keywords">
            {keywordMutation.isPending ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Analyzing...</> : <><Zap className="h-3 w-3 mr-1.5" /> Optimize Keywords</>}
          </Button>
          {keywordResult && (
            <div className="space-y-3" data-testid="keyword-results">
              <div className="flex justify-center py-1"><ScoreDonut score={keywordResult.atsScore} label="ATS" size={70} /></div>
              <div>
                <h4 className="text-[10px] font-medium text-[#2da77d] mb-1">Existing Keywords</h4>
                <div className="flex flex-wrap gap-1">{keywordResult.existingKeywords.map((k, i) => <Badge key={i} variant="secondary" className="text-[9px]">{k}</Badge>)}</div>
              </div>
              <div>
                <h4 className="text-[10px] font-medium text-[#f59e0b] mb-1">Missing Keywords</h4>
                <div className="flex flex-wrap gap-1">{keywordResult.missingKeywords.map((k, i) => <Badge key={i} variant="outline" className="text-[9px] border-[#f59e0b]/30 text-[#f59e0b]">{k}</Badge>)}</div>
              </div>
              {keywordResult.suggestedPhrases.length > 0 && (
                <div className="space-y-1">{keywordResult.suggestedPhrases.map((p, i) => <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground"><CheckCircle2 className="h-3 w-3 text-[#2da77d] shrink-0 mt-0.5" />"{p}"</div>)}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Email */}
      {activeTab === "email" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <div><Label className="text-[11px]">Email Address</Label><Input type="email" placeholder="your@email.com" value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} className="h-7 text-[12px]" data-testid="input-email-address" /></div>
            <div className="flex items-center space-x-2">
              <Checkbox id="include-full-details" checked={includeFullDetails} onCheckedChange={(c) => setIncludeFullDetails(c === true)} data-testid="checkbox-include-full-details" />
              <Label htmlFor="include-full-details" className="text-[11px] font-normal">Include full details</Label>
            </div>
            <Button onClick={() => emailMutation.mutate()} disabled={emailMutation.isPending || !emailAddress.includes("@")} size="sm" className="w-full h-8 text-[12px]" data-testid="button-send-email">
              {emailMutation.isPending ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Sending...</> : <><Mail className="h-3 w-3 mr-1.5" /> Send Report</>}
            </Button>
          </div>
          <div className="p-2.5 bg-muted/40 rounded-lg">
            <h4 className="text-[10px] font-semibold mb-1">Includes:</h4>
            <div className="space-y-0.5 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-[#2da77d]" /> Contact info & skills</div>
              {includeFullDetails && <>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-[#2da77d]" /> Work experience</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-[#2da77d]" /> Education & projects</div>
              </>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
