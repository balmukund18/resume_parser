import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  FileText, Sparkles, Shield, Zap, Target, Search, 
  TrendingUp, Mail, BarChart3, CheckCircle2
} from "lucide-react";
import { UploadDropzone } from "@/components/upload-dropzone";
import { ProcessingStatus } from "@/components/processing-status";
import { ResumeResults } from "@/components/resume-results";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { ProcessingJob, ParsedResume, ExportFormat, UploadResponse } from "@shared/schema";

type ViewState = "upload" | "processing" | "results";

export default function Home() {
  const [viewState, setViewState] = useState<ViewState>("upload");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<UploadResponse> => {
      const formData = new FormData();
      formData.append("resume", file);
      
      const res = await fetch("/api/resumes/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(error.message || `Upload failed: ${res.status}`);
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentJobId(data.id);
      setViewState("processing");
      toast({
        title: "Upload successful",
        description: "Your resume is being processed...",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: jobStatus } = useQuery<ProcessingJob>({
    queryKey: ["/api/resumes", currentJobId, "status"],
    enabled: viewState === "processing" && !!currentJobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "completed" || data?.status === "failed") {
        return false;
      }
      return 2000;
    },
  });

  const { data: resumeData } = useQuery<ParsedResume>({
    queryKey: ["/api/resumes", currentJobId],
    enabled: jobStatus?.status === "completed" && !!currentJobId,
  });

  const handleFileSelect = useCallback((file: File) => {
    uploadMutation.mutate(file);
  }, [uploadMutation]);

  const handleViewResults = useCallback(() => {
    if (resumeData) {
      setViewState("results");
    }
  }, [resumeData]);

  const handleRetry = useCallback(() => {
    setCurrentJobId(null);
    setViewState("upload");
  }, []);

  const handleBack = useCallback(() => {
    setCurrentJobId(null);
    setViewState("upload");
    queryClient.clear();
  }, []);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!currentJobId) return;
    
    try {
      const res = await fetch(`/api/resumes/${currentJobId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      
      if (!res.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: `Resume exported as ${format.toUpperCase()}`,
      });
    } catch {
      toast({
        title: "Export failed",
        description: "Failed to export resume",
        variant: "destructive",
      });
    }
  }, [currentJobId, toast]);

  useEffect(() => {
    if (viewState === "processing" && jobStatus?.status === "completed" && resumeData) {
      const timer = setTimeout(() => setViewState("results"), 500);
      return () => clearTimeout(timer);
    }
  }, [viewState, jobStatus?.status, resumeData]);

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Extraction",
      description: "Extract structured data from any resume format using advanced AI.",
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
    {
      icon: Shield,
      title: "Confidence Scores",
      description: "Each field includes a confidence score so you know what to review.",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: TrendingUp,
      title: "Resume Scoring",
      description: "Get comprehensive scores for completeness, keywords, and formatting.",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: Target,
      title: "Skills Gap Analysis",
      description: "Compare your skills against any job description to find gaps.",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      icon: Search,
      title: "Job Matching",
      description: "See how well your resume matches specific job postings.",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      icon: Zap,
      title: "ATS Optimization",
      description: "Get keyword suggestions to pass Applicant Tracking Systems.",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  const additionalFeatures = [
    { icon: Mail, label: "Email Notifications" },
    { icon: BarChart3, label: "7 Score Metrics" },
    { icon: FileText, label: "PDF/DOCX/TXT" },
    { icon: Shield, label: "Credibility Check" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Resume Parser</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Analysis</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        {viewState === "upload" && (
          <div className="space-y-12">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <Badge variant="secondary" className="mb-2" data-testid="badge-powered-by">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered Resume Analysis
              </Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Transform Resumes into
                <span className="text-primary"> Actionable Insights</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Upload a resume and get structured data extraction, skills analysis, 
                job matching, ATS optimization, and more - all powered by AI.
              </p>
            </div>

            <UploadDropzone 
              onFileSelect={handleFileSelect}
              isUploading={uploadMutation.isPending}
            />

            <div className="flex flex-wrap justify-center gap-3" data-testid="additional-features">
              {additionalFeatures.map((feature, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm"
                >
                  <feature.icon className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">{feature.label}</span>
                </div>
              ))}
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto" data-testid="features-grid">
              {features.map((feature, i) => (
                <div 
                  key={i}
                  className="flex flex-col items-start space-y-3 p-6 rounded-lg bg-card border hover-elevate transition-all"
                  data-testid={`feature-card-${i}`}
                >
                  <div className={`p-3 rounded-lg ${feature.bgColor}`}>
                    <feature.icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center space-y-4 pt-8 border-t max-w-2xl mx-auto">
              <h3 className="font-semibold text-lg">How It Works</h3>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <h4 className="font-medium">Upload Resume</h4>
                  <p className="text-sm text-muted-foreground">
                    Drag & drop your PDF, DOCX, or TXT file
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <h4 className="font-medium">AI Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    AI extracts and structures your data
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <h4 className="font-medium">Get Insights</h4>
                  <p className="text-sm text-muted-foreground">
                    View analysis, scores, and recommendations
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {viewState === "processing" && jobStatus && (
          <div className="py-12">
            <ProcessingStatus 
              job={jobStatus}
              onViewResults={handleViewResults}
              onRetry={handleRetry}
            />
          </div>
        )}

        {viewState === "results" && resumeData && (
          <ResumeResults 
            resume={resumeData}
            onBack={handleBack}
            onExport={handleExport}
          />
        )}
      </main>

      <footer className="border-t py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Resume Parser - AI-Powered Resume Analysis</p>
          <p className="text-xs mt-1">Files are processed securely and deleted after 24 hours.</p>
        </div>
      </footer>
    </div>
  );
}
