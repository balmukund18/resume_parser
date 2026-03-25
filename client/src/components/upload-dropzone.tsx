import { useState, useCallback } from "react";
import { Upload, FileText, X, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/lib/settings";

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
const MAX_SIZE = 10 * 1024 * 1024;

export function UploadDropzone({ onFileSelect, isUploading, disabled }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return "Invalid file type. Please upload PDF, DOCX, or TXT files.";
    if (file.size > MAX_SIZE) return "File too large. Maximum size is 10MB.";
    return null;
  };

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) { setError(validationError); setSelectedFile(null); return; }
    setError(null);
    setSelectedFile(file);
    if (getSettings().autoParseOnUpload) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) handleFile(file); };
  const handleUpload = () => { if (selectedFile) onFileSelect(selectedFile); };
  const handleRemoveFile = () => { setSelectedFile(null); setError(null); };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileExtension = (filename: string) => filename.split(".").pop()?.toUpperCase() || "";

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed transition-all ${
          isDragging ? "border-[#2da77d] bg-[#2da77d]/5" : "border-border hover:border-[#2da77d]/30"
        } ${disabled || isUploading ? "opacity-50 pointer-events-none" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="dropzone-area"
      >
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={disabled || isUploading}
          data-testid="input-file"
        />
        <div className="flex flex-col items-center py-8 px-4 text-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${isDragging ? "bg-[#2da77d]/10" : "bg-muted"}`}>
            <Upload className={`h-5 w-5 ${isDragging ? "text-[#2da77d]" : "text-muted-foreground"}`} />
          </div>
          <p className="text-[13px] font-medium mb-0.5">
            {isDragging ? <span className="text-[#2da77d]">Drop your file here</span> : "Drag and drop your resume"}
          </p>
          <p className="text-[12px] text-muted-foreground">or click to browse &middot; PDF, DOCX, TXT &middot; up to 10MB</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/30" data-testid="error-message">
          <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
          <p className="text-[12px] text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Selected file */}
      {selectedFile && !error && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border" data-testid="selected-file">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-[#2da77d]/10 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-[#2da77d]" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate" data-testid="text-filename">{selectedFile.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatFileSize(selectedFile.size)} &middot; {getFileExtension(selectedFile.name)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button onClick={handleRemoveFile} disabled={isUploading} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors" data-testid="button-remove-file">
              <X className="h-3.5 w-3.5" />
            </button>
            <Button onClick={handleUpload} disabled={isUploading} size="sm" className="h-8 text-[12px]" data-testid="button-upload">
              {isUploading ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Uploading...</> : "Parse Resume"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
