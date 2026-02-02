import { CheckCircle, Clock, Loader2, XCircle, FileText, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProcessingJob } from "@shared/schema";
import { motion } from "framer-motion";

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
        return <Badge className="bg-primary/10 text-primary border-primary/20 animate-pulse">Processing</Badge>;
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto px-4 sm:px-0"
    >
      <Card className="w-full shadow-lg border-primary/10 overflow-hidden relative" data-testid={`card-processing-${job.id}`}>
        {job.status === "processing" && (
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" style={{ backgroundSize: "200% 100%" }} />
          </div>
        )}

        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 space-y-0 pb-4 relative z-10">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full sm:w-auto">
            <div className={`p-3 rounded-xl shrink-0 transition-colors duration-500 ${job.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
              }`}>
              <FileText className="h-6 w-6" />
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

        <CardContent className="space-y-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="text-sm font-medium" data-testid="text-status">
                  {getStatusText()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">{getProgress()}%</span>
            </div>

            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${job.status === "failed" ? "bg-destructive" : "bg-primary"}`}
                initial={{ width: 0 }}
                animate={{ width: `${getProgress()}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                data-testid="progress-bar"
              />
            </div>
          </div>

          {job.status === "processing" && (
            <div className="flex justify-center py-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="p-2 bg-primary/10 rounded-full"
              >
                <Sparkles className="h-5 w-5 text-primary" />
              </motion.div>
            </div>
          )}

          {job.status === "failed" && job.errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg"
            >
              <div className="flex gap-3">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive" data-testid="text-error">
                  {job.errorMessage}
                </p>
              </div>
            </motion.div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            {job.status === "failed" && onRetry && (
              <Button variant="outline" onClick={onRetry} data-testid="button-retry">
                Retry
              </Button>
            )}
            {job.status === "completed" && onViewResults && (
              <Button onClick={onViewResults} data-testid="button-view-results" className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                View Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
