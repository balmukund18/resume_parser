import { CheckCircle, Clock, Loader2, XCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProcessingJob } from "@shared/schema";

interface ProcessingStatusProps {
  job: ProcessingJob;
  onViewResults?: () => void;
  onRetry?: () => void;
}

export function ProcessingStatus({ job, onViewResults, onRetry }: ProcessingStatusProps) {
  const getStatusIcon = () => {
    switch (job.status) {
      case "pending": return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "processing": return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "completed": return <CheckCircle className="h-4 w-4 text-[#2da77d]" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case "pending": return "Waiting to process...";
      case "processing": return "Analyzing your resume...";
      case "completed": return "Analysis complete";
      case "failed": return "Processing failed";
    }
  };

  const getStatusBadge = () => {
    switch (job.status) {
      case "pending": return <Badge variant="secondary" className="text-[10px]">Pending</Badge>;
      case "processing": return <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Processing</Badge>;
      case "completed": return <Badge className="bg-[#2da77d]/10 text-[#2da77d] dark:bg-[#2da77d]/20 dark:text-[#3dd68c] border-0 text-[10px]">Completed</Badge>;
      case "failed": return <Badge variant="destructive" className="text-[10px]">Failed</Badge>;
    }
  };

  const getProgress = () => {
    switch (job.status) {
      case "pending": return 10;
      case "processing": return 60;
      case "completed": return 100;
      case "failed": return 100;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-[hsl(var(--card))] rounded-xl border p-5" data-testid={`card-processing-${job.id}`}>
      {/* File info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium truncate" data-testid="text-job-filename">{job.filename}</p>
            <p className="text-[11px] text-muted-foreground">{formatFileSize(job.fileSize)} &middot; {job.fileType.toUpperCase()}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Progress */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-[12px] text-muted-foreground" data-testid="text-status">{getStatusText()}</span>
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">{getProgress()}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${job.status === "failed" ? "bg-red-500" : "bg-primary"}`}
            style={{ width: `${getProgress()}%` }}
            data-testid="progress-bar"
          />
        </div>
      </div>

      {/* Error */}
      {job.status === "failed" && job.errorMessage && (
        <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/30 rounded-lg mb-4">
          <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-700 dark:text-red-300" data-testid="text-error">{job.errorMessage}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {job.status === "failed" && onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="h-8 text-[12px]" data-testid="button-retry">Try Again</Button>
        )}
        {job.status === "completed" && onViewResults && (
          <Button size="sm" onClick={onViewResults} className="h-8 text-[12px]" data-testid="button-view-results">View Results</Button>
        )}
      </div>
    </div>
  );
}
