import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileText, Sparkles, Shield, Zap } from "lucide-react";
import { UploadDropzone } from "@/components/upload-dropzone";
import { ProcessingStatus } from "@/components/processing-status";
import { ResumeResults } from "@/components/resume-results";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { ProcessingJob, ParsedResume, ExportFormat, UploadResponse } from "@shared/schema";

type ViewState = "upload" | "processing" | "results";

export default function Home() {
  const [viewState, setViewState] = useState<ViewState>("upload");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { toast } = useToast();

  // Upload mutation
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

  // Poll for job status
  const { data: jobStatus, refetch: refetchStatus } = useQuery<ProcessingJob>({
    queryKey: ["/api/resumes", currentJobId, "status"],
    enabled: viewState === "processing" && !!currentJobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "completed" || data?.status === "failed") {
        return false;
      }
      return 2000; // Poll every 2 seconds while processing
    },
  });

  // Fetch full resume data when completed
  const { data: resumeData } = useQuery<ParsedResume>({
    queryKey: ["/api/resumes", currentJobId],
    enabled: jobStatus?.status === "completed" && !!currentJobId,
  });

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    uploadMutation.mutate(file);
  }, [uploadMutation]);

  // Handle viewing results
  const handleViewResults = useCallback(() => {
    if (resumeData) {
      setViewState("results");
    }
  }, [resumeData]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setCurrentJobId(null);
    setViewState("upload");
  }, []);

  // Handle back to upload
  const handleBack = useCallback(() => {
    setCurrentJobId(null);
    setViewState("upload");
    queryClient.clear();
  }, []);

  // Handle export
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

  // Auto-transition to results when data is ready
  useEffect(() => {
    if (viewState === "processing" && jobStatus?.status === "completed" && resumeData) {
      const timer = setTimeout(() => setViewState("results"), 500);
      return () => clearTimeout(timer);
    }
  }, [viewState, jobStatus?.status, resumeData]);

  return (
    <div className="min-h-screen">
      {/* Header */}
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {viewState === "upload" && (
          <div className="space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Transform Resumes into
                <span className="text-primary"> Structured Data</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Upload a resume and let AI extract personal info, experience, education, 
                skills, and more with confidence scoring.
              </p>
            </div>

            {/* Upload Zone */}
            <UploadDropzone 
              onFileSelect={handleFileSelect}
              isUploading={uploadMutation.isPending}
            />

            {/* Features */}
            <div className="grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
              <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-lg bg-card border">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">AI-Powered Extraction</h3>
                <p className="text-sm text-muted-foreground">
                  Advanced AI analyzes your resume and extracts structured data accurately.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-lg bg-card border">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Confidence Scores</h3>
                <p className="text-sm text-muted-foreground">
                  Each extracted field includes a confidence score so you know what to review.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-lg bg-card border">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Multiple Formats</h3>
                <p className="text-sm text-muted-foreground">
                  Support for PDF, DOCX, and TXT files. Export results as JSON or CSV.
                </p>
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

      {/* Footer */}
      <footer className="border-t py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Resume Parser - AI-Powered Resume Analysis</p>
          <p className="text-xs mt-1">Files are processed securely and deleted after 24 hours.</p>
        </div>
      </footer>
    </div>
  );
}
