import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  FileText, Settings as SettingsIcon, Sun, Moon, Monitor,
  ArrowLeft, Download, Mail, Upload, Info, Check,
  Trash2, Database, Loader2,
  X, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/lib/queryClient";
import { getSettings, saveSetting, resetSettings } from "@/lib/settings";
import type { AppSettings } from "@/lib/settings";

function SettingCard({ title, description, icon: Icon, children }: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[hsl(var(--card))] rounded-xl border p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold">{title}</h3>
          <p className="text-[12px] text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

interface SavedResume {
  id: string;
  name: string | null;
  email: string | null;
  fileType: string;
  fileSize: number;
  overallConfidence: number | null;
  createdAt: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  const [saved, setSaved] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{ status: string; database?: string } | null>(null);
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const { toast } = useToast();

  // Load health status and saved resumes on mount
  useEffect(() => {
    fetch(`${API_BASE}/health`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setHealthStatus({
        status: data.status || "unknown",
        database: data.services?.database,
      }))
      .catch(() => setHealthStatus({ status: "unreachable" }));

    fetch(`${API_BASE}/api/resumes/saved/all`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setSavedResumes(data))
      .catch(() => setSavedResumes([]))
      .finally(() => setResumesLoading(false));
  }, []);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = saveSetting(key, value);
    setSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const applyTheme = useCallback((mode: AppSettings["theme"]) => {
    updateSetting("theme", mode);
    if (mode === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", prefersDark);
      localStorage.setItem("theme", prefersDark ? "dark" : "light");
    } else {
      document.documentElement.classList.toggle("dark", mode === "dark");
      localStorage.setItem("theme", mode);
    }
  }, [updateSetting]);

  const handleClearData = useCallback(async () => {
    if (!window.confirm("Are you sure you want to clear all locally saved preferences? This won't delete your resumes from the server.")) return;
    resetSettings();
    localStorage.removeItem("theme");
    document.documentElement.classList.remove("dark");
    setSettings(getSettings());
    toast({ title: "Preferences cleared", description: "All local settings have been reset to defaults." });
  }, [toast]);

  const handleDeleteResume = useCallback(async (id: string) => {
    if (!window.confirm("Delete this resume permanently from the server?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/resumes/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setSavedResumes((prev) => prev.filter((r) => r.id !== id));
        toast({ title: "Resume deleted", description: "Resume has been permanently removed." });
      } else {
        toast({ title: "Delete failed", description: "Could not delete resume.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Delete failed", description: "Network error.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }, [toast]);

  const handleDeleteAllResumes = useCallback(async () => {
    if (!window.confirm(`Delete all ${savedResumes.length} resumes permanently? This cannot be undone.`)) return;
    setDeletingAll(true);
    try {
      const res = await fetch(`${API_BASE}/api/resumes/all`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSavedResumes([]);
        sessionStorage.removeItem("resume-parser-session");
        toast({ title: "All resumes deleted", description: `${data.deleted} resume(s) removed from server.` });
      } else {
        toast({ title: "Delete failed", description: "Could not delete resumes.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Delete failed", description: "Network error.", variant: "destructive" });
    } finally {
      setDeletingAll(false);
    }
  }, [savedResumes.length, toast]);

  const handleClearSession = useCallback(() => {
    sessionStorage.removeItem("resume-parser-session");
    toast({ title: "Session cleared", description: "Current upload/processing state has been reset." });
  }, [toast]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const themeOptions: { value: AppSettings["theme"]; label: string; icon: React.ElementType }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-12 bg-[hsl(var(--card))] border-b flex items-center justify-between px-4 shrink-0 z-40">
        <div className="flex items-center gap-6">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-semibold text-[15px] tracking-tight text-foreground">Resume Parser</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/">
              <button className="px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </button>
            </Link>
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
            <button className="px-3 py-1.5 text-[13px] font-medium text-primary border-b-2 border-primary -mb-[1px]">
              Settings
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-3xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-1">
                <Link href="/">
                  <button className="shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                </Link>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-foreground">Settings</h1>
                  {saved && (
                    <span className="flex items-center gap-1 text-[11px] text-[#2da77d] font-medium">
                      <Check className="h-3 w-3" /> Saved
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground ml-11">Customize your Resume Parser experience. All settings are saved locally.</p>
            </div>

            <div className="space-y-4">
              {/* Theme */}
              <SettingCard title="Appearance" description="Choose your preferred color theme." icon={Sun}>
                <div className="grid grid-cols-3 gap-2">
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => applyTheme(opt.value)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        settings.theme === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        settings.theme === opt.value ? "bg-primary/10" : "bg-muted"
                      }`}>
                        <opt.icon className={`h-4 w-4 ${settings.theme === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <span className={`text-[12px] font-medium ${settings.theme === opt.value ? "text-primary" : "text-muted-foreground"}`}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </SettingCard>

              {/* Default Export */}
              <SettingCard title="Default Export Format" description="Choose the default format when exporting parsed resumes." icon={Download}>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "pdf" as AppSettings["defaultExportFormat"], label: "PDF", desc: "Professional document" },
                    { value: "json" as AppSettings["defaultExportFormat"], label: "JSON", desc: "Structured data format" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateSetting("defaultExportFormat", opt.value)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                        settings.defaultExportFormat === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        settings.defaultExportFormat === opt.value ? "bg-primary/10" : "bg-muted"
                      }`}>
                        <span className={`text-[11px] font-bold ${settings.defaultExportFormat === opt.value ? "text-primary" : "text-muted-foreground"}`}>
                          .{opt.value}
                        </span>
                      </div>
                      <div>
                        <span className={`text-[13px] font-semibold block ${settings.defaultExportFormat === opt.value ? "text-primary" : ""}`}>
                          {opt.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{opt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </SettingCard>

              {/* Email Preferences */}
              <SettingCard title="Email Preferences" description="Set defaults for the email report feature." icon={Mail}>
                <div className="space-y-3">
                  <div>
                    <Label className="text-[12px] mb-1.5 block">Default Email Address</Label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={settings.defaultEmail}
                      onChange={(e) => updateSetting("defaultEmail", e.target.value)}
                      className="h-9 text-[13px]"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Pre-fills the email field when sending reports.</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="email-full-details"
                      checked={settings.emailIncludeFullDetails}
                      onCheckedChange={(c) => updateSetting("emailIncludeFullDetails", c === true)}
                    />
                    <Label htmlFor="email-full-details" className="text-[12px] font-normal">
                      Include full details (experience, education, projects) by default
                    </Label>
                  </div>
                </div>
              </SettingCard>

              {/* Upload Behavior */}
              <SettingCard title="Upload Behavior" description="Control how file uploads are handled." icon={Upload}>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-parse"
                    checked={settings.autoParseOnUpload}
                    onCheckedChange={(c) => updateSetting("autoParseOnUpload", c === true)}
                  />
                  <Label htmlFor="auto-parse" className="text-[12px] font-normal">
                    Automatically start parsing after file upload
                  </Label>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  When enabled, resume parsing begins immediately after you select a file. Disable to review the file before parsing.
                </p>
              </SettingCard>

              {/* Data Management */}
              <SettingCard title="Data Management" description="Manage saved resumes and local preferences." icon={Database}>
                <div className="space-y-4">
                  {/* Saved Resumes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Saved Resumes {!resumesLoading && `(${savedResumes.length})`}
                      </h4>
                      {savedResumes.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDeleteAllResumes}
                          disabled={deletingAll}
                          className="h-7 text-[11px] text-[#ef4444] border-[#ef4444]/30 hover:bg-[#ef4444]/5"
                        >
                          {deletingAll ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                          Delete All
                        </Button>
                      )}
                    </div>

                    {resumesLoading ? (
                      <div className="flex items-center justify-center py-6 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-[12px]">Loading resumes...</span>
                      </div>
                    ) : savedResumes.length === 0 ? (
                      <div className="p-4 rounded-lg border border-dashed text-center">
                        <p className="text-[12px] text-muted-foreground">No resumes saved on server.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {savedResumes.map((resume) => (
                          <div key={resume.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <FileText className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium truncate">{resume.name || "Unknown"}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {resume.fileType?.toUpperCase()} &middot; {formatFileSize(resume.fileSize || 0)}
                                  {resume.overallConfidence != null && <> &middot; {resume.overallConfidence}% confidence</>}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-[10px] text-muted-foreground hidden sm:block">
                                {new Date(resume.createdAt).toLocaleDateString()}
                              </span>
                              <button
                                onClick={() => handleDeleteResume(resume.id)}
                                disabled={deletingId === resume.id}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                              >
                                {deletingId === resume.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-3 space-y-2">
                    {/* Clear Session */}
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-[13px] font-medium flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            Clear Current Session
                          </h4>
                          <p className="text-[11px] text-muted-foreground ml-5">Reset the current upload/processing state on the dashboard.</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearSession}
                          className="h-7 text-[11px]"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    {/* Clear Preferences */}
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-[13px] font-medium flex items-center gap-1.5">
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            Reset Local Preferences
                          </h4>
                          <p className="text-[11px] text-muted-foreground ml-5">Reset theme, export format, and email settings to defaults.</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearData}
                          className="h-7 text-[11px] text-[#ef4444] border-[#ef4444]/30 hover:bg-[#ef4444]/5"
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </SettingCard>

              {/* About / System */}
              <SettingCard title="About" description="System information and service status." icon={Info}>
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-0.5">App</span>
                      <span className="text-[13px] font-medium">Resume Parser</span>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-0.5">Version</span>
                      <span className="text-[13px] font-medium">1.0.0</span>
                    </div>
                  </div>

                  {healthStatus && (
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Service Status</span>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-muted-foreground">API Server</span>
                          <span className={`flex items-center gap-1.5 font-medium ${healthStatus.status === "ok" ? "text-[#2da77d]" : "text-[#ef4444]"}`}>
                            <span className={`w-2 h-2 rounded-full ${healthStatus.status === "ok" ? "bg-[#2da77d]" : "bg-[#ef4444]"}`} />
                            {healthStatus.status === "ok" ? "Connected" : "Unreachable"}
                          </span>
                        </div>
                        {healthStatus.database && (
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="text-muted-foreground">Database</span>
                            <span className={`flex items-center gap-1.5 font-medium ${healthStatus.database === "connected" ? "text-[#2da77d]" : "text-[#ef4444]"}`}>
                              <span className={`w-2 h-2 rounded-full ${healthStatus.database === "connected" ? "bg-[#2da77d]" : "bg-[#ef4444]"}`} />
                              {healthStatus.database === "connected" ? "Connected" : "Disconnected"}
                            </span>
                          </div>
                        )}

                      </div>
                    </div>
                  )}
                </div>
              </SettingCard>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
