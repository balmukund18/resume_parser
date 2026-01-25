import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  BarChart3, Target, Search, Zap, TrendingUp, 
  AlertCircle, CheckCircle2, Loader2, Info,
  Linkedin, Mail, ExternalLink, Copy
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
  KeywordOptimization 
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
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [includeAnalysis, setIncludeAnalysis] = useState(true);

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

  const linkedinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/resumes/import-linkedin`, {
        linkedinUrl,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "LinkedIn Import", description: data.message });
    },
    onError: (error: Error) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  const emailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/resumes/${resumeId}/send-email`, {
        email: emailAddress,
        includeAnalysis,
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
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-6 h-auto">
            <TabsTrigger value="score" className="text-xs px-2 py-2" data-testid="tab-score">
              <TrendingUp className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Score</span>
            </TabsTrigger>
            <TabsTrigger value="skills" className="text-xs px-2 py-2" data-testid="tab-skills">
              <Target className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Skills</span>
            </TabsTrigger>
            <TabsTrigger value="match" className="text-xs px-2 py-2" data-testid="tab-match">
              <Search className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Match</span>
            </TabsTrigger>
            <TabsTrigger value="keywords" className="text-xs px-2 py-2" data-testid="tab-keywords">
              <Zap className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">ATS</span>
            </TabsTrigger>
            <TabsTrigger value="linkedin" className="text-xs px-2 py-2" data-testid="tab-linkedin">
              <Linkedin className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">LinkedIn</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="text-xs px-2 py-2" data-testid="tab-email">
              <Mail className="h-4 w-4 sm:mr-1" />
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
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
              <Button 
                onClick={() => skillsGapMutation.mutate()}
                disabled={skillsGapMutation.isPending || !hasJobInfo}
                data-testid="button-analyze-skills"
              >
                {skillsGapMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
                ) : (
                  <><Target className="h-4 w-4 mr-2" /> Analyze Skills Gap</>
                )}
              </Button>
            </div>
            
            {skillsGapResult && (
              <div className="space-y-4 mt-6" data-testid="skills-gap-results">
                <div className="flex justify-center">
                  <ScoreCircle score={skillsGapResult.matchScore} label="Match Score" size="lg" />
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-green-600 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Matching Skills ({skillsGapResult.matchingSkills.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {skillsGapResult.matchingSkills.map((skill, i) => (
                        <Badge key={i} variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-600 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Missing Skills ({skillsGapResult.missingSkills.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {skillsGapResult.missingSkills.map((skill, i) => (
                        <Badge key={i} variant="outline" className="border-red-300 text-red-700 dark:border-red-700 dark:text-red-300">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                {skillsGapResult.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Recommendations</h4>
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
          </TabsContent>

          <TabsContent value="match" className="space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                See how well your resume matches a specific job posting. Uses the job details entered in the Skills Gap tab.
              </p>
              <Button 
                onClick={() => jobMatchMutation.mutate()}
                disabled={jobMatchMutation.isPending || !hasJobInfo}
                data-testid="button-match-job"
              >
                {jobMatchMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Matching...</>
                ) : (
                  <><Search className="h-4 w-4 mr-2" /> Match to Job</>
                )}
              </Button>
              {!hasJobInfo && (
                <p className="text-xs text-muted-foreground">
                  Enter job details in the Skills Gap tab first
                </p>
              )}
            </div>
            
            {jobMatchResult && (
              <div className="space-y-4 mt-6" data-testid="job-match-results">
                <div className="flex justify-center">
                  <ScoreCircle score={jobMatchResult.matchScore} label="Overall Match" size="lg" />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
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
                    <h4 className="font-semibold">Analysis</h4>
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
                {hasJobInfo ? "Will optimize for the job description entered in Skills Gap tab." : "General ATS optimization - add job details in Skills Gap tab for targeted optimization."}
              </p>
            </div>
            
            {keywordResult && (
              <div className="space-y-4 mt-6" data-testid="keyword-results">
                <div className="flex justify-center">
                  <ScoreCircle score={keywordResult.atsScore} label="ATS Score" size="lg" />
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-green-600">Existing Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                      {keywordResult.existingKeywords.map((keyword, i) => (
                        <Badge key={i} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-orange-600">Missing Keywords</h4>
                    <div className="flex flex-wrap gap-1">
                      {keywordResult.missingKeywords.map((keyword, i) => (
                        <Badge key={i} variant="outline" className="border-orange-300">{keyword}</Badge>
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

          <TabsContent value="linkedin" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Linkedin className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Import from LinkedIn</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      For best results, download your LinkedIn profile as PDF and upload it directly.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin-url">LinkedIn Profile URL</Label>
                <Input 
                  id="linkedin-url"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  data-testid="input-linkedin-url"
                />
              </div>
              
              <Button 
                onClick={() => linkedinMutation.mutate()}
                disabled={linkedinMutation.isPending || !linkedinUrl.includes("linkedin.com")}
                data-testid="button-import-linkedin"
              >
                {linkedinMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
                ) : (
                  <><Linkedin className="h-4 w-4 mr-2" /> Get Import Instructions</>
                )}
              </Button>

              <div className="mt-6 space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  How to Export LinkedIn Profile as PDF
                </h4>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li className="flex items-start gap-2">
                    <span>1.</span>
                    <span>Go to your LinkedIn profile page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>2.</span>
                    <span>Click the "More" button (three dots) near your profile photo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>3.</span>
                    <span>Select "Save to PDF" from the dropdown menu</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>4.</span>
                    <span>Upload the downloaded PDF file to this parser</span>
                  </li>
                </ol>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => window.open("https://linkedin.com", "_blank")}
                  data-testid="button-open-linkedin"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open LinkedIn
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100">Email Service Setup Required</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Email notifications require an email service (SendGrid, Resend, etc.) to be configured. Currently, emails are logged but not sent.
                    </p>
                  </div>
                </div>
              </div>

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
                    id="include-analysis" 
                    checked={includeAnalysis}
                    onCheckedChange={(checked) => setIncludeAnalysis(checked === true)}
                    data-testid="checkbox-include-analysis"
                  />
                  <Label htmlFor="include-analysis" className="text-sm font-normal">
                    Include analysis results (scores, skills gap, etc.)
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
                    Parsed resume data (contact info, experience, education)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Skills summary
                  </li>
                  {includeAnalysis && (
                    <>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Resume score and breakdown
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        Skills gap analysis results
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ATS optimization suggestions
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
