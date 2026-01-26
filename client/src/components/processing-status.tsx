import { CheckCircle, Clock, Loader2, XCircle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
      case "pending":
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      case "processing":
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case "pending":
        return "Waiting to process...";
      case "processing":
        return "Analyzing your resume with AI...";
      case "completed":
        return "Analysis complete";
      case "failed":
        return "Processing failed";
    }
  };

  const getStatusBadge = () => {
    switch (job.status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "processing":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Processing</Badge>;
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const getProgress = () => {
    switch (job.status) {
      case "pending":
        return 10;
      case "processing":
        return 60;
      case "completed":
        return 100;
      case "failed":
        return 100;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto px-4 sm:px-0" data-testid={`card-processing-${job.id}`}>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 space-y-0 pb-4">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full sm:w-auto">
          <div className="p-2 sm:p-3 bg-muted rounded-lg shrink-0">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg truncate" data-testid="text-job-filename">
              {job.filename}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
              <span>{formatFileSize(job.fileSize)}</span>
              <span className="text-border hidden sm:inline">|</span>
              <span>{job.fileType.toUpperCase()}</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 self-start sm:self-center">
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <span className="text-sm font-medium" data-testid="text-status">
            {getStatusText()}
          </span>
        </div>
        
        <Progress 
          value={getProgress()} 
          className={`h-2 ${job.status === "failed" ? "[&>div]:bg-destructive" : ""}`}
          data-testid="progress-bar"
        />
        
        {job.status === "failed" && job.errorMessage && (
          <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive" data-testid="text-error">
              {job.errorMessage}
            </p>
          </div>
        )}
        
        <div className="flex justify-end gap-2 pt-2">
          {job.status === "failed" && onRetry && (
            <Button variant="outline" onClick={onRetry} data-testid="button-retry">
              Retry
            </Button>
          )}
          {job.status === "completed" && onViewResults && (
            <Button onClick={onViewResults} data-testid="button-view-results">
              View Results
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
