import { useState, useCallback } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
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
        className={`relative p-6 sm:p-8 border-2 border-dashed transition-all duration-200 ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
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
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={disabled || isUploading}
          data-testid="input-file"
        />
        
        <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4 text-center">
          <div className={`p-3 sm:p-4 rounded-full transition-colors ${
            isDragging ? "bg-primary/10" : "bg-muted"
          }`}>
            <Upload className={`h-6 w-6 sm:h-8 sm:w-8 transition-colors ${
              isDragging ? "text-primary" : "text-muted-foreground"
            }`} />
          </div>
          
          <div className="space-y-1 sm:space-y-2">
            <p className="text-base sm:text-lg font-medium">
              {isDragging ? "Drop your resume here" : "Drag and drop your resume"}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              or click to browse files
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary">PDF</Badge>
            <Badge variant="secondary">DOCX</Badge>
            <Badge variant="secondary">TXT</Badge>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Maximum file size: 10MB
          </p>
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-destructive/50 bg-destructive/5" data-testid="error-message">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </Card>
      )}

      {selectedFile && !error && (
        <Card className="p-3 sm:p-4" data-testid="selected-file">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 w-full sm:w-auto">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-md shrink-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm sm:text-base truncate" data-testid="text-filename">
                  {selectedFile.name}
                </p>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  <span className="text-border hidden sm:inline">|</span>
                  <Badge variant="outline" className="text-xs">
                    {getFileExtension(selectedFile.name)}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                disabled={isUploading}
                data-testid="button-remove-file"
                className="h-8 w-8 sm:h-10 sm:w-10"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                data-testid="button-upload"
                size="sm"
                className="text-xs sm:text-sm"
              >
                {isUploading ? (
                  <>
                    <div className="h-3 w-3 sm:h-4 sm:w-4 border-2 border-current border-t-transparent rounded-full animate-spin sm:mr-2" />
                    <span className="hidden sm:inline">Uploading...</span>
                    <span className="sm:hidden">Uploading</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Parse Resume</span>
                    <span className="sm:hidden">Parse</span>
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
