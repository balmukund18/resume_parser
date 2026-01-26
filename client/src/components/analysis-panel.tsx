import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  BarChart3, Target, Search, Zap, TrendingUp, 
  AlertCircle, CheckCircle2, Loader2, Info,
  Mail, Copy, Shield, Sparkles,
  Clock, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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

function ScoreCircle({ score, label, size = "md" }: { score: number; label: string; size?: "sm" | "md" | "lg" }) {
  const getColor = (s: number) => {
    if (s >= 80) return "text-green-500";
    if (s >= 60) return "text-yellow-500";
    return "text-red-500";
  };
  
  const sizes = {
    sm: "w-16 h-16 text-lg",
    md: "w-20 h-20 text-xl",
    lg: "w-24 h-24 text-2xl",
  };
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${sizes[size]} rounded-full border-4 flex items-center justify-center ${getColor(score)} border-current`}>
        <span className="font-bold">{Math.round(score)}</span>
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}

export function AnalysisPanel({ resumeId }: AnalysisPanelProps) {
  const { toast } = useToast();
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [skillsGapResult, setSkillsGapResult] = useState<SkillsGapResult | null>(null);
  const [resumeScore, setResumeScore] = useState<ResumeScoreResult | null>(null);
  const [jobMatchResult, setJobMatchResult] = useState<JobMatchResult | null>(null);
  const [keywordResult, setKeywordResult] = useState<KeywordOptimization | null>(null);
  const [credibilityResult, setCredibilityResult] = useState<CredibilityResult | null>(null);
  const [impactResult, setImpactResult] = useState<ImpactQuantificationResult | null>(null);
  const [emailAddress, setEmailAddress] = useState("");
  const [includeFullDetails, setIncludeFullDetails] = useState(true);

  const scoreMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/resumes/${resumeId}/score`, {});
      return res.json();
    },
    onSuccess: (data) => {
      setResumeScore(data);
      toast({ title: "Resume scored", description: `Overall score: ${Math.round(data.overallScore)}%` });
    },
    onError: (error: Error) => {
      toast({ title: "Scoring failed", description: error.message, variant: "destructive" });
    },
  });

  const skillsGapMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/resumes/${resumeId}/skills-gap`, {
        title: jobTitle,
        company: jobCompany,
        description: jobDescription,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setSkillsGapResult(data);
      toast({ title: "Skills gap analysis complete", description: `Match score: ${Math.round(data.matchScore)}%` });
    },
    onError: (error: Error) => {
      toast({ title: "Analysis failed", description: error.message, variant: "destructive" });
    },
  });

  const jobMatchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/resumes/${resumeId}/match-job`, {
        title: jobTitle,
        company: jobCompany,
        description: jobDescription,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setJobMatchResult(data);
      toast({ title: "Job matching complete", description: `Match score: ${Math.round(data.matchScore)}%` });
    },
    onError: (error: Error) => {
      toast({ title: "Matching failed", description: error.message, variant: "destructive" });
    },
  });

  const keywordMutation = useMutation({
    mutationFn: async () => {
      const body = jobTitle && jobDescription 
        ? { title: jobTitle, description: jobDescription }
        : {};
      const res = await apiRequest("POST", `/api/resumes/${resumeId}/optimize-keywords`, body);
      return res.json();
    },
    onSuccess: (data) => {
      setKeywordResult(data);
      toast({ title: "Keyword analysis complete", description: `ATS score: ${Math.round(data.atsScore)}%` });
    },
    onError: (error: Error) => {
      toast({ title: "Optimization failed", description: error.message, variant: "destructive" });
    },
  });

  const credibilityMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/resumes/${resumeId}/credibility`, {});
      return res.json();
    },
    onSuccess: (data) => {
      setCredibilityResult(data);
      toast({ title: "Credibility check complete", description: `Score: ${Math.round(data.credibilityScore)}%` });
    },
    onError: (error: Error) => {
      toast({ title: "Credibility check failed", description: error.message, variant: "destructive" });
    },
  });

  const impactMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/resumes/${resumeId}/impact`, {});
      return res.json();
    },
    onSuccess: (data) => {
      setImpactResult(data);
      toast({ title: "Impact analysis complete", description: `Found ${data.weakBulletsCount} bullets to improve` });
    },
    onError: (error: Error) => {
      toast({ title: "Impact analysis failed", description: error.message, variant: "destructive" });
    },
  });

  const emailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/resumes/${resumeId}/send-email`, {
        email: emailAddress,
        includeAnalysis: includeFullDetails,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Email Notification", 
        description: data.status || "Notification queued" 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Email failed", description: error.message, variant: "destructive" });
    },
  });

  const hasJobInfo = jobTitle.trim() && jobDescription.trim();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          AI Analysis Tools
        </CardTitle>
        <CardDescription>
          Get insights and recommendations to improve your resume
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="score" className="w-full">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 mb-4 sm:mb-6 h-auto overflow-x-auto">
            <TabsTrigger value="score" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 sm:py-2 min-w-0" data-testid="tab-score">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Score</span>
            </TabsTrigger>
            <TabsTrigger value="credibility" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 sm:py-2 min-w-0" data-testid="tab-credibility">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Verify</span>
            </TabsTrigger>
            <TabsTrigger value="impact" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 sm:py-2 min-w-0" data-testid="tab-impact">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Impact</span>
            </TabsTrigger>
            <TabsTrigger value="skills" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 sm:py-2 min-w-0" data-testid="tab-skills">
              <Target className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Job Match</span>
            </TabsTrigger>
            <TabsTrigger value="keywords" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 sm:py-2 min-w-0" data-testid="tab-keywords">
              <Zap className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">ATS</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1.5 sm:py-2 min-w-0" data-testid="tab-email">
              <Mail className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="score" className="space-y-4">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Get a comprehensive score for your resume based on completeness, keywords, formatting, and content quality.
              </p>
              <Button 
                onClick={() => scoreMutation.mutate()} 
                disabled={scoreMutation.isPending}
                data-testid="button-score-resume"
              >
                {scoreMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
                ) : (
                  <><TrendingUp className="h-4 w-4 mr-2" /> Score My Resume</>
                )}
              </Button>
            </div>
            
            {resumeScore && (
              <div className="space-y-6 mt-6" data-testid="score-results">
                <div className="flex justify-center">
                  <ScoreCircle score={resumeScore.overallScore} label="Overall Score" size="lg" />
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  <ScoreCircle score={resumeScore.completenessScore} label="Completeness" size="sm" />
                  <ScoreCircle score={resumeScore.keywordScore} label="Keywords" size="sm" />
                  <ScoreCircle score={resumeScore.formattingScore} label="Formatting" size="sm" />
                  <ScoreCircle score={resumeScore.experienceScore} label="Experience" size="sm" />
                  <ScoreCircle score={resumeScore.educationScore} label="Education" size="sm" />
                  <ScoreCircle score={resumeScore.skillsScore} label="Skills" size="sm" />
                </div>
                
                {resumeScore.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      Suggestions for Improvement
                    </h4>
                    <ul className="space-y-2">
                      {resumeScore.suggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="credibility" className="space-y-4">
            <div className="text-center space-y-4">
              <div className="p-3 sm:p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-left min-w-0">
                    <h4 className="font-semibold text-xs sm:text-sm text-amber-900 dark:text-amber-100">Resume Credibility Checker</h4>
                    <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 break-words">
                      Analyze for overlapping dates, unrealistic timelines, skill-experience mismatches, and rapid career progression.
                    </p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => credibilityMutation.mutate()} 
                disabled={credibilityMutation.isPending}
                data-testid="button-check-credibility"
              >
                {credibilityMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
                ) : (
                  <><Shield className="h-4 w-4 mr-2" /> Check Credibility</>
                )}
              </Button>
            </div>
            
            {credibilityResult && (
              <div className="space-y-6 mt-6" data-testid="credibility-results">
                <div className="flex justify-center">
                  <ScoreCircle score={credibilityResult.credibilityScore} label="Credibility Score" size="lg" />
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timeline Analysis
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <span className="text-muted-foreground block">Total Experience</span>
                      <p className="font-medium">{credibilityResult.timelineAnalysis.totalYearsExperience} years</p>
                    </div>
                    {credibilityResult.timelineAnalysis.careerStartYear && (
                      <div>
                        <span className="text-muted-foreground block">Career Started</span>
                        <p className="font-medium">{credibilityResult.timelineAnalysis.careerStartYear}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground block">Avg. Tenure</span>
                      <p className="font-medium">{Math.round(credibilityResult.timelineAnalysis.averageTenure)} months</p>
                    </div>
                  </div>
                  {credibilityResult.timelineAnalysis.gaps.length > 0 && (
                    <div className="mt-3">
                      <span className="text-sm text-muted-foreground">Employment Gaps:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {credibilityResult.timelineAnalysis.gaps.map((gap, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {gap.start} - {gap.end} ({gap.durationMonths} mo)
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {credibilityResult.flags.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Flags for Review ({credibilityResult.flags.length})
                    </h4>
                    <div className="space-y-2">
                      {credibilityResult.flags.map((flag, i) => (
                        <div 
                          key={i} 
                          className={`p-3 rounded-lg border ${
                            flag.severity === 'high' ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800' :
                            flag.severity === 'medium' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800' :
                            'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className={`text-xs shrink-0 ${
                              flag.severity === 'high' ? 'border-red-400 text-red-700' :
                              flag.severity === 'medium' ? 'border-amber-400 text-amber-700' :
                              'border-blue-400 text-blue-700'
                            }`}>
                              {flag.severity}
                            </Badge>
                            <div>
                              <p className="font-medium text-sm">{flag.message}</p>
                              {flag.details && (
                                <p className="text-xs text-muted-foreground mt-1">{flag.details}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Overall Assessment</h4>
                  <p className="text-sm text-muted-foreground">{credibilityResult.overallAssessment}</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="impact" className="space-y-4">
            <div className="text-center space-y-4">
              <div className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 shrink-0 mt-0.5" />
                  <div className="text-left min-w-0">
                    <h4 className="font-semibold text-xs sm:text-sm text-purple-900 dark:text-purple-100">Impact Quantification Engine</h4>
                    <p className="text-xs sm:text-sm text-purple-800 dark:text-purple-200 break-words">
                      Transform weak bullet points into powerful, quantified achievements with strong action verbs.
                    </p>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => impactMutation.mutate()} 
                disabled={impactMutation.isPending}
                data-testid="button-quantify-impact"
              >
                {impactMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Quantify Impact</>
                )}
              </Button>
            </div>
            
            {impactResult && (
              <div className="space-y-6 mt-6" data-testid="impact-results">
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
                  <ScoreCircle score={impactResult.overallImpactScore} label="Impact Score" size="lg" />
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-2xl sm:text-3xl font-bold text-purple-600">{impactResult.weakBulletsCount}</span>
                    <span className="text-xs text-muted-foreground">Bullets Improved</span>
                  </div>
                </div>
                
                {impactResult.improvedBullets.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Before & After Improvements
                    </h4>
                    <div className="space-y-4">
                      {impactResult.improvedBullets.map((bullet, i) => (
                        <div key={i} className="p-3 sm:p-4 bg-muted rounded-lg space-y-2 sm:space-y-3">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs border-red-300 text-red-600">Before</Badge>
                                <span className="text-xs text-muted-foreground">{Math.round(bullet.confidenceScore)}% confidence</span>
                              </div>
                              <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 line-through break-words">{bullet.original}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-center">
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs border-green-300 text-green-600">After</Badge>
                                <Badge variant="secondary" className="text-xs">{bullet.improvementType.replace(/_/g, ' ')}</Badge>
                              </div>
                              <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 font-medium break-words">{bullet.improved}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {impactResult.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      General Tips
                    </h4>
                    <ul className="space-y-2">
                      {impactResult.suggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="skills" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-title-skills">Job Title</Label>
                <Input 
                  id="job-title-skills"
                  placeholder="e.g., Senior Software Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  data-testid="input-job-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-company-skills">Company (optional)</Label>
                <Input 
                  id="job-company-skills"
                  placeholder="e.g., Google"
                  value={jobCompany}
                  onChange={(e) => setJobCompany(e.target.value)}
                  data-testid="input-job-company"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-desc-skills">Job Description</Label>
                <Textarea 
                  id="job-desc-skills"
                  placeholder="Paste the job description here..."
                  className="min-h-[120px]"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  data-testid="input-job-description"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={() => skillsGapMutation.mutate()}
                  disabled={skillsGapMutation.isPending || !hasJobInfo}
                  data-testid="button-analyze-skills"
                  className="flex-1"
                >
                  {skillsGapMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Target className="h-4 w-4 mr-2" /> Analyze Skills Gap</>
                  )}
                </Button>
                <Button 
                  onClick={() => jobMatchMutation.mutate()}
                  disabled={jobMatchMutation.isPending || !hasJobInfo}
                  data-testid="button-match-job"
                  variant="outline"
                  className="flex-1"
                >
                  {jobMatchMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Matching...</>
                  ) : (
                    <><Search className="h-4 w-4 mr-2" /> Match to Job</>
                  )}
                </Button>
              </div>
            </div>
            
            {(skillsGapResult || jobMatchResult) && (
              <div className="space-y-6 mt-6">
                {/* Comprehensive Job Match Results */}
                {jobMatchResult && (
                  <div className="space-y-4" data-testid="job-match-results">
                    <div className="flex justify-center">
                      <ScoreCircle score={jobMatchResult.matchScore} label="Overall Match" size="lg" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <span className="text-xs text-muted-foreground block text-center">Skills</span>
                        <Progress value={jobMatchResult.skillsMatch} className="h-2" />
                        <span className="text-xs font-medium block text-center">{Math.round(jobMatchResult.skillsMatch)}%</span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs text-muted-foreground block text-center">Experience</span>
                        <Progress value={jobMatchResult.experienceMatch} className="h-2" />
                        <span className="text-xs font-medium block text-center">{Math.round(jobMatchResult.experienceMatch)}%</span>
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs text-muted-foreground block text-center">Education</span>
                        <Progress value={jobMatchResult.educationMatch} className="h-2" />
                        <span className="text-xs font-medium block text-center">{Math.round(jobMatchResult.educationMatch)}%</span>
                      </div>
                    </div>
                    
                    {jobMatchResult.reasons.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm sm:text-base">Match Analysis</h4>
                        <ul className="space-y-1">
                          {jobMatchResult.reasons.map((reason, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Skills Gap Details */}
                {skillsGapResult && (
                  <div className="space-y-4" data-testid="skills-gap-results">
                    {!jobMatchResult && (
                      <div className="flex justify-center">
                        <ScoreCircle score={skillsGapResult.matchScore} label="Skills Match Score" size="lg" />
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm sm:text-base text-green-600 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          Matching Skills ({skillsGapResult.matchingSkills.length})
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {skillsGapResult.matchingSkills.map((skill, i) => (
                            <Badge key={i} variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs break-words">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm sm:text-base text-red-600 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          Missing Skills ({skillsGapResult.missingSkills.length})
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {skillsGapResult.missingSkills.map((skill, i) => (
                            <Badge key={i} variant="outline" className="border-red-300 text-red-700 dark:border-red-700 dark:text-red-300 text-xs break-words whitespace-normal">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {skillsGapResult.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm sm:text-base">Recommendations</h4>
                        <ul className="space-y-1">
                          {skillsGapResult.recommendations.map((rec, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <Zap className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="keywords" className="space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Optimize your resume for Applicant Tracking Systems (ATS). Get keyword suggestions to improve your chances of passing automated screening.
              </p>
              <Button 
                onClick={() => keywordMutation.mutate()}
                disabled={keywordMutation.isPending}
                data-testid="button-optimize-keywords"
              >
                {keywordMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
                ) : (
                  <><Zap className="h-4 w-4 mr-2" /> Optimize Keywords</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                {hasJobInfo ? "Will optimize for the job description entered in Job Match tab." : "General ATS optimization - add job details in Job Match tab for targeted optimization."}
              </p>
            </div>
            
            {keywordResult && (
              <div className="space-y-4 mt-6" data-testid="keyword-results">
                <div className="flex justify-center">
                  <ScoreCircle score={keywordResult.atsScore} label="ATS Score" size="lg" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm sm:text-base text-green-600">Existing Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                      {keywordResult.existingKeywords.map((keyword, i) => (
                        <Badge key={i} variant="secondary" className="text-xs break-words">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm sm:text-base text-orange-600">Missing Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                      {keywordResult.missingKeywords.map((keyword, i) => (
                        <Badge key={i} variant="outline" className="border-orange-300 text-xs break-words">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                {keywordResult.suggestedPhrases.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Suggested Phrases to Add</h4>
                    <ul className="space-y-1">
                      {keywordResult.suggestedPhrases.map((phrase, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          "{phrase}"
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-address">Email Address</Label>
                  <Input 
                    id="email-address"
                    type="email"
                    placeholder="your@email.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    data-testid="input-email-address"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-full-details" 
                    checked={includeFullDetails}
                    onCheckedChange={(checked) => setIncludeFullDetails(checked === true)}
                    data-testid="checkbox-include-full-details"
                  />
                  <Label htmlFor="include-full-details" className="text-sm font-normal">
                    Include full details (experience, education, projects)
                  </Label>
                </div>
                
                <Button 
                  onClick={() => emailMutation.mutate()}
                  disabled={emailMutation.isPending || !emailAddress.includes("@")}
                  data-testid="button-send-email"
                >
                  {emailMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Mail className="h-4 w-4 mr-2" /> Send Email Notification</>
                  )}
                </Button>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">What gets included:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Contact information
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Skills summary
                  </li>
                  {includeFullDetails && (
                    <>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Work experience details
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Education history
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Projects and certifications
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
