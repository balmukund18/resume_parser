import { useState } from "react";
import { Link } from "wouter";
import {
  FileText, Upload, BarChart3, Shield, Sparkles, Target, Zap, Mail,
  ChevronDown, HelpCircle, ArrowLeft, BookOpen, FileQuestion, MessageSquare,
  Lightbulb,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

function AccordionItem({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden bg-[hsl(var(--card))]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="text-[14px] font-semibold">{title}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0">
          <div className="border-t pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

export default function Help() {
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
            <button className="px-3 py-1.5 text-[13px] font-medium text-primary border-b-2 border-primary -mb-[1px]">
              Help
            </button>
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
                <h1 className="text-xl font-semibold text-foreground">Help Center</h1>
              </div>
              <p className="text-sm text-muted-foreground ml-11">Everything you need to know about using Resume Parser.</p>
            </div>

            <div className="space-y-3">
              {/* Getting Started */}
              <AccordionItem title="Getting Started" icon={BookOpen} defaultOpen>
                <div className="space-y-4">
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Resume Parser uses AI to extract structured data from your resume and provide actionable insights. Here's how to get started:
                  </p>
                  <div className="grid gap-3">
                    {[
                      { step: "1", title: "Upload Your Resume", desc: "Drag and drop or click to browse. We support PDF, DOCX, and TXT files up to 10MB.", color: "bg-[#2da77d]" },
                      { step: "2", title: "AI Analyzes Your Resume", desc: "Our AI extracts contact info, experience, education, skills, projects, certifications, and more with confidence scores.", color: "bg-[#3b82f6]" },
                      { step: "3", title: "Review & Analyze", desc: "View parsed data, run AI analysis tools (scoring, ATS optimization, skills gap), and export results.", color: "bg-[#8b5cf6]" },
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
                        <div className={`w-7 h-7 rounded-full ${item.color} flex items-center justify-center shrink-0`}>
                          <span className="text-[12px] font-bold text-white">{item.step}</span>
                        </div>
                        <div>
                          <h4 className="text-[13px] font-semibold mb-0.5">{item.title}</h4>
                          <p className="text-[12px] text-muted-foreground leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionItem>

              {/* Supported Formats */}
              <AccordionItem title="Supported File Formats" icon={FileQuestion}>
                <div className="space-y-3">
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    We support the most common resume file formats:
                  </p>
                  <div className="grid gap-2">
                    {[
                      { format: "PDF", ext: ".pdf", desc: "Most recommended. Preserves formatting and hyperlinks. Works best with text-based PDFs (not scanned images)." },
                      { format: "DOCX", ext: ".docx", desc: "Microsoft Word documents. Hyperlinks and formatting are extracted accurately." },
                      { format: "TXT", ext: ".txt", desc: "Plain text files. URLs are detected automatically via pattern matching." },
                    ].map((f) => (
                      <div key={f.format} className="flex items-start gap-3 p-3 rounded-lg border">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-bold text-primary">{f.ext}</span>
                        </div>
                        <div>
                          <h4 className="text-[13px] font-semibold">{f.format}</h4>
                          <p className="text-[12px] text-muted-foreground leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-lg bg-[#f59e0b]/5 border border-[#f59e0b]/20">
                    <p className="text-[12px] text-muted-foreground">
                      <span className="font-semibold text-[#f59e0b]">Note:</span> Maximum file size is 10MB. Scanned image PDFs without embedded text may produce lower accuracy results.
                    </p>
                  </div>
                </div>
              </AccordionItem>

              {/* Analysis Tools */}
              <AccordionItem title="AI Analysis Tools" icon={Lightbulb}>
                <div className="space-y-3">
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    After parsing, you get access to 6 AI-powered analysis tools in the right panel:
                  </p>
                  <div className="grid gap-2">
                    {[
                      { icon: BarChart3, name: "Resume Score", desc: "Rates your resume on 7 dimensions: completeness, keywords, formatting, experience, education, skills, and overall score. Each metric shows a progress bar so you know exactly where to improve.", color: "#2da77d" },
                      { icon: Shield, name: "Credibility Check", desc: "Scans for overlapping employment dates, unrealistic timelines, rapid job hopping, and skill-experience mismatches. Flags issues by severity (high, medium, low).", color: "#3b82f6" },
                      { icon: Sparkles, name: "Impact Quantifier", desc: "Identifies weak bullet points and rewrites them with quantified achievements. Shows before/after comparisons with actionable improvement suggestions.", color: "#8b5cf6" },
                      { icon: Target, name: "Skills Gap / Job Match", desc: "Paste a job description to see how well your resume matches. Shows matching skills, missing skills, and recommendations to close the gap.", color: "#f59e0b" },
                      { icon: Zap, name: "ATS Optimization", desc: "Analyzes keyword density for Applicant Tracking Systems. Shows existing keywords, missing keywords, and suggested phrases to improve your ATS pass rate.", color: "#ef4444" },
                      { icon: Mail, name: "Email Report", desc: "Send a formatted summary of your parsed resume data to any email address. Optionally include full experience, education, and project details.", color: "#06b6d4" },
                    ].map((tool) => (
                      <div key={tool.name} className="flex items-start gap-3 p-3 rounded-lg border">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${tool.color}15` }}>
                          <tool.icon className="h-4 w-4" style={{ color: tool.color }} />
                        </div>
                        <div>
                          <h4 className="text-[13px] font-semibold">{tool.name}</h4>
                          <p className="text-[12px] text-muted-foreground leading-relaxed">{tool.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionItem>

              {/* FAQ */}
              <AccordionItem title="Frequently Asked Questions" icon={MessageSquare}>
                <div className="space-y-4">
                  {[
                    { q: "Why is my confidence score low?", a: "Confidence scores reflect how clearly each section was identified by AI. Unconventional formatting, vague language, or missing dates can lower scores. Try using clear section headings and standard date formats." },
                    { q: "What AI model is used for parsing?", a: "We use Google Gemini as the primary AI model with Groq (LLaMA) as a fallback. The system automatically switches if one provider is unavailable, ensuring reliable parsing." },
                    { q: "Is my resume data stored permanently?", a: "Parsed resumes are saved in our database so you can revisit them. You can delete your data anytime from the Settings page. Uploaded files are automatically cleaned up after 24 hours." },
                    { q: "How does ATS scoring work?", a: "ATS scoring analyzes your resume for keywords that Applicant Tracking Systems look for. It compares your content against common industry keywords and, if you provide a job description, against specific requirements for that role." },
                    { q: "Can I parse multiple resumes?", a: "Currently, resumes are processed one at a time. After parsing, you can go back to the dashboard and upload another. All previously parsed resumes are saved and accessible." },
                    { q: "What export formats are available?", a: "You can export parsed resume data as JSON (structured data, great for developers) or CSV (spreadsheet-friendly, works with Excel/Google Sheets)." },
                    { q: "Why did parsing fail?", a: "Common reasons include: corrupted files, image-only PDFs (no selectable text), files exceeding 10MB, or temporary AI service issues. Try re-uploading or converting your file to a different format." },
                  ].map((faq, i) => (
                    <div key={i}>
                      <h4 className="text-[13px] font-semibold mb-1">{faq.q}</h4>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </AccordionItem>

              {/* Contact */}
              <AccordionItem title="Feedback & Support" icon={MessageSquare}>
                <div className="space-y-3">
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    We'd love to hear from you! If you encounter bugs, have feature requests, or want to share feedback:
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="p-4 rounded-lg border text-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <h4 className="text-[13px] font-semibold mb-0.5">Report an Issue</h4>
                      <p className="text-[11px] text-muted-foreground">Found a bug or something isn't working? Let us know so we can fix it.</p>
                    </div>
                    <div className="p-4 rounded-lg border text-center">
                      <div className="w-10 h-10 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center mx-auto mb-2">
                        <Lightbulb className="h-4 w-4 text-[#8b5cf6]" />
                      </div>
                      <h4 className="text-[13px] font-semibold mb-0.5">Feature Request</h4>
                      <p className="text-[11px] text-muted-foreground">Have an idea for a new feature? We're always looking to improve.</p>
                    </div>
                  </div>
                </div>
              </AccordionItem>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
