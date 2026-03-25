import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  FileText, Briefcase, Plus, Trash2, Loader2, ArrowLeft, X, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/lib/queryClient";

interface JobDescription {
  id: string;
  title: string;
  company: string | null;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  keywords: string[];
  createdAt: string;
}

export default function Jobs() {
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDescription | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetch(`${API_BASE}/api/job-descriptions`)
      .then((res) => res.json())
      .then((data) => setJobs(data))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!title.trim() || !description.trim()) {
      toast({ title: "Missing fields", description: "Title and description are required.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/job-descriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), company: company.trim() || undefined, description: description.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const newJob = await res.json();
      setJobs((prev) => [newJob, ...prev]);
      setTitle("");
      setCompany("");
      setDescription("");
      setShowForm(false);
      toast({ title: "Job description saved", description: `"${newJob.title}" has been added to your library.` });
    } catch {
      toast({ title: "Failed to save", description: "Could not create job description.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }, [title, company, description, toast]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Delete this job description?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/job-descriptions/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setJobs((prev) => prev.filter((j) => j.id !== id));
        if (selectedJob?.id === id) setSelectedJob(null);
        toast({ title: "Deleted", description: "Job description removed." });
      } else {
        toast({ title: "Delete failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Delete failed", description: "Network error.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }, [selectedJob, toast]);

  const filteredJobs = searchQuery.trim()
    ? jobs.filter((j) =>
        j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (j.company || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : jobs;

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
            <button className="px-3 py-1.5 text-[13px] font-medium text-primary border-b-2 border-primary -mb-[1px]">
              Jobs
            </button>
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
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-5xl mx-auto">
            {/* Page heading */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Link href="/">
                  <button className="shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                </Link>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">Job Description Library</h1>
                  <p className="text-sm text-muted-foreground">Save job descriptions and use them for skills gap analysis and job matching.</p>
                </div>
              </div>
              <Button size="sm" onClick={() => setShowForm(!showForm)} className="h-8 text-[12px]">
                {showForm ? <><X className="h-3 w-3 mr-1.5" /> Cancel</> : <><Plus className="h-3 w-3 mr-1.5" /> Add Job</>}
              </Button>
            </div>

            {/* Create form */}
            {showForm && (
              <div className="bg-[hsl(var(--card))] rounded-xl border p-5 mb-6">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  New Job Description
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[12px] mb-1.5 block">Job Title *</Label>
                      <Input placeholder="e.g., Senior Software Engineer" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-[13px]" />
                    </div>
                    <div>
                      <Label className="text-[12px] mb-1.5 block">Company</Label>
                      <Input placeholder="e.g., Google" value={company} onChange={(e) => setCompany(e.target.value)} className="h-9 text-[13px]" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[12px] mb-1.5 block">Job Description *</Label>
                    <Textarea
                      placeholder="Paste the full job description here..."
                      className="min-h-[120px] text-[13px]"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleCreate} disabled={creating || !title.trim() || !description.trim()} size="sm" className="h-8 text-[12px]">
                      {creating ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Saving...</> : "Save Job Description"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Search */}
            {jobs.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by title or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 text-[13px]"
                />
              </div>
            )}

            {/* Job list + detail */}
            <div className="flex gap-6">
              {/* List */}
              <div className={`${selectedJob ? "w-1/2 hidden lg:block" : "w-full"} space-y-2`}>
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-[12px]">Loading job descriptions...</span>
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="bg-[hsl(var(--card))] rounded-xl border p-8 text-center">
                    <Briefcase className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-[13px] text-muted-foreground mb-1">
                      {searchQuery ? "No matching job descriptions." : "No job descriptions saved yet."}
                    </p>
                    {!searchQuery && (
                      <p className="text-[12px] text-muted-foreground">Click "Add Job" to save your first job description.</p>
                    )}
                  </div>
                ) : (
                  filteredJobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selectedJob?.id === job.id
                          ? "bg-primary/5 border-primary/30"
                          : "bg-[hsl(var(--card))] hover:border-primary/20 hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" />
                            <h3 className="text-[13px] font-semibold truncate">{job.title}</h3>
                          </div>
                          {job.company && <p className="text-[12px] text-muted-foreground ml-5.5 pl-[22px]">{job.company}</p>}
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{job.description.substring(0, 150)}...</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-muted-foreground">{new Date(job.createdAt).toLocaleDateString()}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(job.id); }}
                            disabled={deletingId === job.id}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                          >
                            {deletingId === job.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </button>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Detail panel */}
              {selectedJob && (
                <div className="flex-1 min-w-0">
                  <div className="bg-[hsl(var(--card))] rounded-xl border p-5 sticky top-0">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h2 className="text-[15px] font-semibold">{selectedJob.title}</h2>
                        {selectedJob.company && <p className="text-[13px] text-primary">{selectedJob.company}</p>}
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Added {new Date(selectedJob.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedJob(null)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors lg:hidden"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                      <p className="text-[12px] text-foreground/85 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                        {selectedJob.description}
                      </p>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <p className="text-[11px] text-muted-foreground">
                        Use this job description in the analysis panel when viewing a resume — paste it into the "Skills Match" tab to run skills gap analysis or job matching.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 h-7 text-[11px]"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedJob.description);
                          toast({ title: "Copied", description: "Job description copied to clipboard." });
                        }}
                      >
                        Copy Description
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
