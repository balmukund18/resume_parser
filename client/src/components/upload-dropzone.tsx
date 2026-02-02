import { useState, useCallback } from "react";
import { Upload, FileText, X, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadDropzone({ onFileSelect, isUploading, disabled }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload PDF, DOCX, or TXT files.";
    }
    if (file.size > MAX_SIZE) {
      return "File too large. Maximum size is 10MB.";
    }
    return null;
  };

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileExtension = (filename: string) => {
    return filename.split(".").pop()?.toUpperCase() || "";
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 px-4 sm:px-0">
      <Card
        className={`relative p-8 sm:p-12 border-2 border-dashed transition-all duration-300 overflow-hidden ${isDragging
          ? "border-primary bg-primary/5 shadow-[0_0_30px_-5px_rgba(var(--primary),0.3)] scale-[1.02]"
          : "border-border/50 hover:border-primary/50 hover:bg-muted/50"
          } ${disabled || isUploading ? "opacity-60 pointer-events-none" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="dropzone-area"
      >
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          disabled={disabled || isUploading}
          data-testid="input-file"
        />

        {/* Decorative background elements */}
        {isDragging && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/10 rounded-full blur-2xl animate-pulse" />
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center justify-center space-y-4 text-center">
          <div className={`p-5 rounded-full transition-all duration-300 ${isDragging ? "bg-primary/20 scale-110 rotate-12" : "bg-primary/5 group-hover:bg-primary/10"
            }`}>
            <Upload className={`h-10 w-10 sm:h-12 sm:w-12 transition-colors duration-300 ${isDragging ? "text-primary" : "text-muted-foreground group-hover:text-primary"
              }`} />
          </div>

          <div className="space-y-2 max-w-xs mx-auto">
            <p className="text-lg sm:text-xl font-semibold transition-colors duration-300">
              {isDragging ? <span className="text-primary">Drop it like it's hot!</span> : "Drag and drop your resume"}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse files
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Badge variant="secondary" className="px-3 py-1 bg-background/50 backdrop-blur-sm border shadow-sm">PDF</Badge>
            <Badge variant="secondary" className="px-3 py-1 bg-background/50 backdrop-blur-sm border shadow-sm">DOCX</Badge>
            <Badge variant="secondary" className="px-3 py-1 bg-background/50 backdrop-blur-sm border shadow-sm">TXT</Badge>
          </div>

          <p className="text-xs text-muted-foreground pt-2 opacity-70">
            Maximum file size: 10MB
          </p>
        </div>
      </Card>

      {error && (
        <div className="p-4 border-l-4 border-destructive bg-destructive/5 rounded-r-lg animate-in slide-in-from-top-2" data-testid="error-message">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        </div>
      )}

      {selectedFile && !error && (
        <Card className="p-4 sm:p-5 overflow-hidden border-primary/20 shadow-md animate-in fade-in zoom-in-95 duration-200" data-testid="selected-file">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1 w-full sm:w-auto">
              <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold text-base truncate" data-testid="text-filename">
                  {selectedFile.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span className="font-medium text-foreground/70">{formatFileSize(selectedFile.size)}</span>
                  <span className="text-border hidden sm:inline">|</span>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase font-bold tracking-wider">
                    {getFileExtension(selectedFile.name)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                disabled={isUploading}
                data-testid="button-remove-file"
                className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                data-testid="button-upload"
                className="shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Uploading...</span>
                    <span className="sm:hidden">Uploading</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Parse Resume</span>
                    <span className="sm:hidden">Parse</span>
                    <Sparkles className="h-4 w-4 ml-2 opacity-70" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
