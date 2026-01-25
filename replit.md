# Resume Parser Application

AI-powered resume parsing web application with advanced analysis features. Extracts structured data from PDF, DOCX, and TXT files using Google Gemini AI.

## Overview

This application allows users to upload resume files and uses Google Gemini AI to extract structured information and provide advanced analytics including:
- Personal/Contact Information extraction
- Work Experience parsing
- Education history
- Skills (Technical & Soft)
- Projects and Certifications
- Languages
- Confidence scoring (0-100%) for each section

### Advanced Analysis Features
- **Skills Gap Analysis**: Compare resume skills against job descriptions
- **Resume Scoring**: Rate completeness, keywords, formatting, experience, education, and skills (7 metrics)
- **Job Matching**: Match resumes against job postings with detailed breakdown
- **ATS Keyword Optimization**: Suggest missing keywords for better ATS compatibility
- **Resume Credibility Checker**: Flags overlapping dates, unrealistic timelines, skill-experience mismatches, rapid career progression
- **Impact Quantification Engine**: Transforms weak resume bullets into powerful quantified achievements with strong action verbs
- **LinkedIn Import**: Step-by-step instructions for importing LinkedIn profile data via PDF export
- **Enhanced Link Extraction**: Extracts all URLs, profile links, project repos, and certification credentials from resumes
- **Email Notifications**: Send parsed resume data via email using nodemailer (requires SMTP configuration)

## Tech Stack

- **Frontend**: React 18+, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM (permanent storage)
- **File Uploads**: Multer (10MB limit, PDF/DOCX/TXT support)
- **AI Extraction**: Google Gemini API (supports user's own GEMINI_API_KEY or Replit AI Integrations)
- **PDF Parsing**: pdfjs-dist (Mozilla PDF.js)
- **DOCX Parsing**: mammoth
- **Validation**: Joi
- **Logging**: Winston
- **Email**: Nodemailer
- **State Management**: TanStack Query

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── analysis-panel.tsx      # AI analysis tools UI
│   │   │   ├── confidence-badge.tsx    # Confidence score display
│   │   │   ├── processing-status.tsx   # Job processing status card
│   │   │   ├── resume-results.tsx      # Parsed resume display
│   │   │   ├── theme-toggle.tsx        # Dark/light mode toggle
│   │   │   └── upload-dropzone.tsx     # File upload component
│   │   ├── pages/
│   │   │   ├── home.tsx                # Main page
│   │   │   └── not-found.tsx           # 404 page
│   │   ├── lib/
│   │   │   └── queryClient.ts          # API client setup
│   │   └── App.tsx                     # Root component
├── server/
│   ├── db.ts                           # PostgreSQL connection
│   ├── routes.ts                       # API routes
│   ├── storage.ts                      # Database storage layer
│   └── utils/
│       ├── logger.ts                   # Winston logger
│       ├── resume-parser.ts            # Gemini AI integration + analysis functions
│       ├── text-extractor.ts           # PDF/DOCX/TXT extraction
│       └── validation.ts               # Joi validation schemas
├── shared/
│   └── schema.ts                       # Drizzle models, Zod schemas, TypeScript types
├── migrations/                         # Drizzle migrations
├── uploads/                            # Temporary file storage (24h retention)
└── drizzle.config.ts                   # Drizzle configuration
```

## Database Tables

- **resumes**: Parsed resume data with all extracted fields
- **processing_jobs**: Async processing job tracking
- **job_descriptions**: Stored job postings for matching
- **skills_gap_analysis**: Analysis results comparing resumes to jobs
- **job_matches**: Resume-to-job matching scores
- **resume_scores**: Resume quality scoring results
- **keyword_recommendations**: ATS keyword optimization results
- **email_notifications**: Email notification logs

## API Endpoints

### Resume Operations
- `POST /api/resumes/upload` - Upload a resume file for parsing
- `GET /api/resumes/:id/status` - Get processing status
- `GET /api/resumes/:id` - Get parsed resume data
- `POST /api/resumes/:id/export` - Export as JSON or CSV
- `DELETE /api/resumes/:id` - Delete a resume
- `GET /api/resumes/saved/all` - Get all saved resumes

### Analysis Endpoints
- `POST /api/resumes/:id/skills-gap` - Analyze skills gap against job description
- `POST /api/resumes/:id/score` - Score resume quality (7 metrics)
- `POST /api/resumes/:id/match-job` - Match resume to job description
- `POST /api/resumes/:id/optimize-keywords` - Get ATS keyword recommendations
- `POST /api/resumes/:id/credibility` - Check resume credibility (timeline analysis, flags)
- `POST /api/resumes/:id/impact` - Quantify impact of resume bullets (improve weak bullets)
- `POST /api/resumes/import-linkedin` - LinkedIn import instructions
- `POST /api/resumes/:id/send-email` - Log email notification

### Job Description Endpoints
- `GET /api/job-descriptions` - Get all job descriptions
- `POST /api/job-descriptions` - Create job description

## Environment Variables

- `GEMINI_API_KEY` - User's own Google Gemini API key (preferred for GitHub deployment)
- `AI_INTEGRATIONS_GEMINI_API_KEY` - Replit AI Integrations fallback
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by Replit)
- `SESSION_SECRET` - Session secret for security
- `SMTP_HOST` - SMTP server hostname for email (e.g., smtp.gmail.com)
- `SMTP_PORT` - SMTP server port (default: 587)
- `SMTP_USER` - SMTP username/email
- `SMTP_PASS` - SMTP password or app password

## Features

- Drag-and-drop file upload
- Real-time processing status with progress indicator
- Confidence scoring per section (color-coded)
- Collapsible sections for easy navigation
- Export to JSON or CSV
- Dark/light mode support
- Responsive design
- 24-hour file retention (auto-cleanup)
- Permanent database storage for parsed resumes
- AI-powered analysis tools with tabbed interface

## Running the Application

The application is started with `npm run dev` which runs both the Express backend and Vite frontend on port 5000.

## Recent Changes

- 2025-01-25: Added nodemailer for sending parsed resume data via email
- 2025-01-25: Added Extracted Links section to display parsed URLs
- 2025-01-25: Fixed LinkedIn import UI - now shows clear PDF export instructions
- 2025-01-25: Removed "Powered by Google Gemini AI" branding
- 2025-01-25: Added Resume Credibility Checker (timeline analysis, overlapping dates, skill mismatches)
- 2025-01-25: Added Impact Quantification Engine (transforms weak bullets into strong achievements)
- 2025-01-25: Enhanced resume parser with comprehensive link extraction (profiles, projects, certifications)
- 2025-01-25: Added PostgreSQL database with Drizzle ORM for permanent storage
- 2025-01-25: Added Skills Gap Analysis, Resume Scoring, Job Matching features
- 2025-01-25: Added ATS Keyword Optimization feature
- 2025-01-25: Added AnalysisPanel component with tabbed UI (8 tabs)
- 2025-01-25: Modified Gemini integration to support user's own API key (GEMINI_API_KEY)
- 2025-01-25: Fixed PDF parsing with pdfjs-dist instead of pdf-parse
