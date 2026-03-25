import { useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  FileText, Upload, ChevronRight, Star, Clock, Eye, Loader2,
} from "lucide-react";
import { UploadDropzone } from "@/components/upload-dropzone";
import { ProcessingStatus } from "@/components/processing-status";
import { ResumeResults } from "@/components/resume-results";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, API_BASE } from "@/lib/queryClient";
import { generateResumePDF } from "@/lib/pdf-export";
import type { ProcessingJob, ParsedResume, ExportFormat, UploadResponse } from "@shared/schema";

type ViewState = "upload" | "processing" | "results";

function restoreSession() {
  try {
    const saved = sessionStorage.getItem("resume-parser-session");
    if (saved) return JSON.parse(saved) as { viewState: ViewState; currentJobId: string | null; currentResumeId?: string | null };
  } catch { /* ignore */ }
  return null;
}

function saveSession(viewState: ViewState, currentJobId: string | null, currentResumeId?: string | null) {
  sessionStorage.setItem("resume-parser-session", JSON.stringify({ viewState, currentJobId, currentResumeId }));
}

export default function Home() {
  const session = restoreSession();
  const [viewState, setViewState] = useState<ViewState>(session?.viewState || "upload");
  const [currentJobId, setCurrentJobId] = useState<string | null>(session?.currentJobId || null);
  const [currentResumeId, setCurrentResumeId] = useState<string | null>(session?.currentResumeId || null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { toast } = useToast();

  // Persist state changes to sessionStorage
  useEffect(() => {
    saveSession(viewState, currentJobId, currentResumeId);
  }, [viewState, currentJobId, currentResumeId]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<UploadResponse> => {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch(`${API_BASE}/api/resumes/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(error.message || `Upload failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentJobId(data.id);
      setCurrentResumeId(null);
      setViewState("processing");
      toast({ title: "Upload successful", description: "Your resume is being processed..." });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const { data: jobStatus } = useQuery<ProcessingJob>({
    queryKey: ["/api/resumes", currentJobId, "status"],
    enabled: viewState === "processing" && !!currentJobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "completed" || data?.status === "failed") return false;
      return 2000;
    },
  });

  // Fetch resume data either from job ID (fresh upload) or resume ID (history)
  const { data: resumeDataFromJob } = useQuery<ParsedResume>({
    queryKey: ["/api/resumes", currentJobId],
    enabled: !currentResumeId && (jobStatus?.status === "completed" || viewState === "results") && !!currentJobId,
  });

  const { data: resumeDataFromSaved } = useQuery<ParsedResume>({
    queryKey: ["/api/resumes/saved", currentResumeId],
    enabled: !!currentResumeId && viewState === "results",
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/resumes/saved/${currentResumeId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load resume");
      return res.json();
    },
  });

  const resumeData = currentResumeId ? resumeDataFromSaved : resumeDataFromJob;

  const handleFileSelect = useCallback((file: File) => {
    uploadMutation.mutate(file);
  }, [uploadMutation]);

  const handleViewResults = useCallback(() => {
    if (resumeData) setViewState("results");
  }, [resumeData]);

  const handleRetry = useCallback(() => {
    setCurrentJobId(null);
    setCurrentResumeId(null);
    setViewState("upload");
  }, []);

  const handleBack = useCallback(() => {
    setCurrentJobId(null);
    setCurrentResumeId(null);
    setViewState("upload");
    queryClient.clear();
  }, []);

  const handleLoadSavedResume = useCallback((resumeId: string) => {
    setCurrentResumeId(resumeId);
    setCurrentJobId(null);
    setViewState("results");
  }, []);

  const handleExport = useCallback(async (format: ExportFormat) => {
    const exportId = currentResumeId || currentJobId;
    if (!exportId) return;
    try {
      if (format === "pdf") {
        if (!resumeData) throw new Error("No resume data available");
        generateResumePDF(resumeData);
        toast({ title: "Export successful", description: "Resume exported as PDF" });
        return;
      }
      const res = await fetch(`${API_BASE}/api/resumes/${exportId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Export successful", description: `Resume exported as ${format.toUpperCase()}` });
    } catch {
      toast({ title: "Export failed", description: "Failed to export resume", variant: "destructive" });
    }
  }, [currentJobId, currentResumeId, resumeData, toast]);

  useEffect(() => {
    if (viewState === "processing" && jobStatus?.status === "completed" && resumeData) {
      const timer = setTimeout(() => setViewState("results"), 500);
      return () => clearTimeout(timer);
    }
  }, [viewState, jobStatus?.status, resumeData]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ─── TOP HEADER BAR ─── */}
      <header className="h-12 bg-[hsl(var(--card))] border-b flex items-center justify-between px-4 shrink-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight text-foreground">Resume Parser</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <button className="px-3 py-1.5 text-[13px] font-medium text-primary border-b-2 border-primary -mb-[1px]">
              Dashboard
            </button>
            <Link href="/compare">
              <button className="px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                Compare
              </button>
            </Link>
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
        {/* ─── LEFT SIDEBAR ─── */}
        <aside className={`${sidebarOpen ? "w-56" : "w-0"} hidden lg:block shrink-0 bg-[hsl(var(--card))] border-r overflow-y-auto transition-all`}>
          <div className="pt-3" />

          {/* Resume preview section */}
          <div className="px-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Resume Preview</span>
            </div>

            {viewState === "results" && resumeData ? (
              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {(resumeData.name || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">{resumeData.name || "Unknown"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {resumeData.metadata.originalFilename}
                    </p>
                  </div>
                </div>
                {resumeData.metadata.overallConfidence !== undefined && (
                  <div className="mt-2 flex items-center gap-2">
                    <Star className="h-3 w-3 text-primary fill-primary" />
                    <span className="text-[11px] text-muted-foreground">
                      {resumeData.metadata.overallConfidence}% confidence
                    </span>
                  </div>
                )}
              </div>
            ) : viewState === "processing" ? (
              <div className="p-2.5 rounded-lg bg-muted/50 border">
                <p className="text-[12px] text-muted-foreground">Processing...</p>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-muted/50 border border-dashed">
                <p className="text-[12px] text-muted-foreground">No resume uploaded yet</p>
              </div>
            )}
          </div>

          <div className="border-t mx-3 my-3" />

          {/* Supported formats */}
          <div className="px-3 pb-4">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Supported Formats
            </span>
            <div className="space-y-1.5">
              {["PDF Documents", "DOCX Files", "Plain Text"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ─── MAIN CONTENT ─── */}
        <main className="flex-1 overflow-y-auto">
          {viewState === "upload" && (
            <UploadView
              onFileSelect={handleFileSelect}
              isUploading={uploadMutation.isPending}
              onLoadResume={handleLoadSavedResume}
            />
          )}

          {viewState === "processing" && jobStatus && (
            <div className="p-6 max-w-xl mx-auto">
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
      </div>
    </div>
  );
}


/* ─── UPLOAD VIEW (Dashboard home) ─── */
function UploadView({ onFileSelect, isUploading, onLoadResume }: {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  onLoadResume: (resumeId: string) => void;
}) {
  interface SavedResumeItem {
    id: string;
    name: string | null;
    email: string | null;
    fileType: string;
    fileSize: number;
    overallConfidence: number | null;
    createdAt: string;
  }

  const [savedResumes, setSavedResumes] = useState<SavedResumeItem[]>([]);
  const [resumesLoading, setResumesLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/resumes/saved/all`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setSavedResumes(data))
      .catch(() => setSavedResumes([]))
      .finally(() => setResumesLoading(false));
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Upload a resume to extract data and get AI-powered analysis.</p>
      </div>

      {/* Upload card */}
      <div className="bg-[hsl(var(--card))] rounded-xl border p-6 mb-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Upload className="h-4 w-4 text-muted-foreground" />
          Upload Resume
        </h2>
        <UploadDropzone onFileSelect={onFileSelect} isUploading={isUploading} />
      </div>

      {/* ─── Resume History ─── */}
      <div className="bg-[hsl(var(--card))] rounded-xl border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recent Resumes
          </h2>
          {!resumesLoading && savedResumes.length > 0 && (
            <span className="text-[11px] text-muted-foreground">{savedResumes.length} resume{savedResumes.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {resumesLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-[12px]">Loading resumes...</span>
          </div>
        ) : savedResumes.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">No resumes parsed yet. Upload one above to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedResumes.slice(0, 10).map((resume) => (
              <button
                key={resume.id}
                onClick={() => onLoadResume(resume.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg border bg-muted/10 hover:bg-muted/30 hover:border-primary/20 transition-all group text-left"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[12px] font-semibold text-primary">
                      {(resume.name || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">{resume.name || "Unknown"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {resume.fileType?.toUpperCase()} &middot; {formatFileSize(resume.fileSize || 0)}
                      {resume.overallConfidence != null && <> &middot; {Math.round(resume.overallConfidence)}% confidence</>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] text-muted-foreground hidden sm:block">
                    {new Date(resume.createdAt).toLocaleDateString()}
                  </span>
                  <Eye className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            title: "AI Extraction",
            desc: "Extract structured data from any resume format using advanced AI",
            color: "bg-[#2da77d]",
            iconBg: "bg-[#2da77d]/10",
          },
          {
            title: "Resume Scoring",
            desc: "Get scores for completeness, keywords, formatting and content",
            color: "bg-[#3b82f6]",
            iconBg: "bg-[#3b82f6]/10",
          },
          {
            title: "Skills Gap Analysis",
            desc: "Compare skills against job descriptions and find gaps",
            color: "bg-[#8b5cf6]",
            iconBg: "bg-[#8b5cf6]/10",
          },
          {
            title: "Job Matching",
            desc: "See how well a resume matches specific job postings",
            color: "bg-[#f59e0b]",
            iconBg: "bg-[#f59e0b]/10",
          },
          {
            title: "ATS Optimization",
            desc: "Keyword suggestions to pass Applicant Tracking Systems",
            color: "bg-[#ef4444]",
            iconBg: "bg-[#ef4444]/10",
          },
          {
            title: "Credibility Check",
            desc: "Detect overlapping dates, timeline issues and mismatches",
            color: "bg-[#06b6d4]",
            iconBg: "bg-[#06b6d4]/10",
          },
        ].map((f, i) => (
          <div key={i} className="bg-[hsl(var(--card))] rounded-xl border p-4 group hover:border-primary/30 hover:shadow-sm transition-all">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg ${f.iconBg} flex items-center justify-center shrink-0`}>
                <div className={`w-2.5 h-2.5 rounded-full ${f.color}`} />
              </div>
              <div>
                <h3 className="text-[13px] font-semibold mb-0.5">{f.title}</h3>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
