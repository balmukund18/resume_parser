# Resume Parser Application

AI-powered resume parsing web application that extracts structured data from PDF, DOCX, and TXT files.

## Overview

This application allows users to upload resume files and uses Google Gemini AI to extract structured information including:
- Personal/Contact Information
- Work Experience
- Education
- Skills (Technical & Soft)
- Projects
- Certifications
- Languages

Each extracted section includes a confidence score (0-100%) to indicate parsing accuracy.

## Tech Stack

- **Frontend**: React 18+, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Express.js, TypeScript
- **File Uploads**: Multer (10MB limit, PDF/DOCX/TXT support)
- **AI Extraction**: Google Gemini API (via Replit AI Integrations)
- **Validation**: Joi
- **Logging**: Winston
- **State Management**: TanStack Query

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/
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
│   ├── routes.ts                       # API routes
│   ├── storage.ts                      # In-memory storage
│   └── utils/
│       ├── logger.ts                   # Winston logger
│       ├── resume-parser.ts            # Gemini AI integration
│       ├── text-extractor.ts           # PDF/DOCX/TXT extraction
│       └── validation.ts               # Joi validation schemas
├── shared/
│   └── schema.ts                       # TypeScript types & Zod schemas
└── uploads/                            # Temporary file storage (24h retention)
```

## API Endpoints

### POST /api/resumes/upload
Upload a resume file for parsing. Returns processing job ID.

### GET /api/resumes/:id/status
Get the current processing status of a job.

### GET /api/resumes/:id
Get the parsed resume data (only available when status is "completed").

### POST /api/resumes/:id/export
Export parsed resume in JSON or CSV format.

### DELETE /api/resumes/:id
Delete a resume and its associated data.

## Features

- Drag-and-drop file upload
- Real-time processing status with progress indicator
- Confidence scoring per section (color-coded)
- Collapsible sections for easy navigation
- Export to JSON or CSV
- Dark/light mode support
- Responsive design
- 24-hour file retention (auto-cleanup)

## Running the Application

The application is started with `npm run dev` which runs both the Express backend and Vite frontend on port 5000.
