import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  FileText, Sparkles, Shield, Zap, Target, Search,
  TrendingUp, Mail, BarChart3, CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";
import { UploadDropzone } from "@/components/upload-dropzone";
import { ProcessingStatus } from "@/components/processing-status";
import { ResumeResults } from "@/components/resume-results";
import { ThemeToggle } from "@/components/theme-toggle";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, API_BASE } from "@/lib/queryClient";
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

      const res = await fetch(`${API_BASE}/api/resumes/upload`, {
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
      const res = await fetch(`${API_BASE}/api/resumes/${currentJobId}/export`, {
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
      className: "md:col-span-2 lg:col-span-2",
    },
    {
      icon: Shield,
      title: "Confidence Scores",
      description: "Each field includes a confidence score so you know what to review.",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      className: "md:col-span-1 lg:col-span-1",
    },
    {
      icon: TrendingUp,
      title: "Resume Scoring",
      description: "Get comprehensive scores for completeness, keywords, and formatting.",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      className: "md:col-span-1 lg:col-span-1",
    },
    {
      icon: Target,
      title: "Skills Gap Analysis",
      description: "Compare your skills against any job description to find gaps.",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      className: "md:col-span-1 lg:col-span-1",
    },
    {
      icon: Search,
      title: "Job Matching",
      description: "See how well your resume matches specific job postings.",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      className: "md:col-span-1 lg:col-span-1",
    },
    {
      icon: Zap,
      title: "ATS Optimization",
      description: "Get keyword suggestions to pass Applicant Tracking Systems.",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      className: "md:col-span-2 lg:col-span-2",
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
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg truncate">Resume Parser</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">AI-Powered Analysis</p>
            </div>
          </div>
          <div className="shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
        {viewState === "upload" && (
          <div className="space-y-12 pb-12 relative z-10">
            <div className="text-center pt-8 sm:pt-12 mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6 max-w-4xl mx-auto flex flex-col items-center"
              >
                <Badge variant="secondary" className="mb-2 px-4 py-1.5 text-sm backdrop-blur-sm bg-background/50 border shadow-sm" data-testid="badge-powered-by">
                  <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                  AI-Powered Resume Analysis
                </Badge>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.15]">
                  Transform Resumes into <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-600 to-indigo-600 animate-gradient-x bg-[length:200%_auto]">
                    Actionable Insights
                  </span>
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
                  Upload a resume and get structured data extraction, skills analysis,
                  job matching, and ATS optimization — all powered by advanced AI.
                </p>
              </motion.div>

            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative max-w-2xl mx-auto mt-12 mb-16"
            >
              <div className="relative overflow-hidden rounded-xl bg-card border shadow-xl">
                <motion.div
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-0.5 bg-primary blur-[2px] shadow-[0_0_20px_rgba(var(--primary),0.8)] z-10"
                />

                <UploadDropzone
                  onFileSelect={handleFileSelect}
                  isUploading={uploadMutation.isPending}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap justify-center gap-4"
              data-testid="additional-features"
            >
              {additionalFeatures.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 pl-3 pr-4 py-2 bg-card/50 backdrop-blur-sm border rounded-full text-sm font-medium shadow-sm hover:bg-card/80 transition-colors"
                >
                  <feature.icon className="h-4 w-4 text-primary" />
                  <span className="text-foreground/80">{feature.label}</span>
                </div>
              ))}
            </motion.div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto px-4 pt-8" data-testid="features-grid">
              {features.map((feature, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * i + 0.5 }}
                  key={i}
                  className={feature.className}
                  data-testid={`feature-card-${i}`}
                >
                  <SpotlightCard className="h-full p-6 rounded-3xl bg-card/40 backdrop-blur-sm border shadow-sm hover:shadow-xl transition-all duration-300">
                    <div className={`p-3.5 rounded-2xl ${feature.bgColor} w-fit mb-4 ring-1 ring-inset ring-black/5 dark:ring-white/10`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-bold text-lg tracking-tight">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </SpotlightCard>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center space-y-8 pt-12 sm:pt-16 max-w-4xl mx-auto px-4"
            >
              <h3 className="font-bold text-2xl">How It Works</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative">
                {/* Connector Line (Desktop) */}
                <div className="hidden sm:block absolute top-5 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -z-10" />

                <div className="space-y-4 relative bg-background/5 p-4 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-lg font-bold shadow-lg shadow-primary/20">
                    1
                  </div>
                  <h4 className="font-bold text-lg">Upload Resume</h4>
                  <p className="text-muted-foreground">
                    Drag & drop your PDF, DOCX, or TXT file instantly
                  </p>
                </div>
                <div className="space-y-4 relative bg-background/5 p-4 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-lg font-bold shadow-lg shadow-primary/20">
                    2
                  </div>
                  <h4 className="font-bold text-lg">AI Processing</h4>
                  <p className="text-muted-foreground">
                    Our advanced AI extracts and structures every detail
                  </p>
                </div>
                <div className="space-y-4 relative bg-background/5 p-4 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-lg font-bold shadow-lg shadow-primary/20">
                    3
                  </div>
                  <h4 className="font-bold text-lg">Get Insights</h4>
                  <p className="text-muted-foreground">
                    View comprehensive scores and actionable feedback
                  </p>
                </div>
              </div>
            </motion.div>

          </div>
        )
        }

        {
          viewState === "processing" && jobStatus && (
            <div className="py-12">
              <ProcessingStatus
                job={jobStatus}
                onViewResults={handleViewResults}
                onRetry={handleRetry}
              />
            </div>
          )
        }

        {
          viewState === "results" && resumeData && (
            <ResumeResults
              resume={resumeData}
              onBack={handleBack}
              onExport={handleExport}
            />
          )
        }
      </main >

      <footer className="border-t py-4 sm:py-6 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 text-center text-xs sm:text-sm text-muted-foreground">
          <p>Resume Parser - AI-Powered Resume Analysis</p>
          <p className="text-xs mt-1">Files are processed securely and deleted after 24 hours.</p>
        </div>
      </footer>
    </div >
  );
}
