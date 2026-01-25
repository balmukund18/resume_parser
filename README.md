# Resume Parser Application

AI-powered resume parsing web application with advanced analysis features. Extracts structured data from PDF, DOCX, and TXT files using Google Gemini AI.

## Overview

This application allows users to upload resume files and uses AI to extract structured information and provide advanced analytics including:
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
- **Enhanced Link Extraction**: Extracts all URLs, profile links, project repos, and certification credentials from resumes
- **Email Notifications**: Send parsed resume data via email using nodemailer (requires SMTP configuration)

## Tech Stack

- **Frontend**: React 18+, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM (permanent storage)
- **File Uploads**: Multer (10MB limit, PDF/DOCX/TXT support)
- **AI Extraction**: Google Gemini API
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
- `POST /api/resumes/:id/send-email` - Log email notification

### Job Description Endpoints
- `GET /api/job-descriptions` - Get all job descriptions
- `POST /api/job-descriptions` - Create job description

## Environment Variables

- `GEMINI_API_KEY` - Google Gemini API key (required)
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session secret for security
- `SMTP_HOST` - SMTP server hostname for email (e.g., smtp.gmail.com)
- `SMTP_PORT` - SMTP server port (default: 587)
- `SMTP_USER` - SMTP username/email
- `SMTP_PASS` - SMTP password or app password

## Google Gemini API Setup

1. **Get API Key**:
   - Go to [Google AI Studio](https://ai.google.dev/)
   - Click "Get API Key"
   - Create a new project or select existing one
   - Copy the API key

2. **Free Tier Limits**:
   - **gemini-1.5-flash**: 15 requests per minute, 1 million tokens per minute, 1500 requests per day
   - **gemini-2.5-flash**: 20 requests per day (very limited)

3. **For Production Use**:
   - Consider enabling billing for higher quotas
   - Paid tier: 1 million+ requests per day with much higher rate limits

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

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set up Environment Variables**:
   Create a `.env` file in the root directory:
   ```bash
   GEMINI_API_KEY=your_google_gemini_api_key
   DATABASE_URL=postgresql://username:password@localhost:5432/resume_parser
   SESSION_SECRET=your_session_secret
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   ```

3. **Set up Database**:
   ```bash
   npm run db:push
   ```

4. **Start the Application**:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
