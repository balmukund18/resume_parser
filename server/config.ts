import dotenv from "dotenv";
import { createModuleLogger } from "./utils/logger";

// Load environment variables from .env file
dotenv.config();

const logger = createModuleLogger("Config");

/**
 * Validate required environment variables on startup
 */
export function validateEnvironment(): void {
  const required = [
    "DATABASE_URL",
    "GEMINI_API_KEY",
    "SESSION_SECRET",
  ];

  const optional = [
    "GROQ_API_KEY",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "FRONTEND_URL",    // Vercel frontend URL - required for CORS in production
    "ALLOWED_ORIGINS", // Comma-separated list of allowed CORS origins (alternative to FRONTEND_URL)
    "GOOGLE_CLIENT_ID",     // Google OAuth (optional — Google login won't appear if missing)
    "GOOGLE_CLIENT_SECRET", // Google OAuth
  ];

  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check optional but recommended variables
  if (!process.env.GROQ_API_KEY) {
    warnings.push("GROQ_API_KEY (fallback won't work if Gemini quota is hit)");
  }

  if (missing.length > 0) {
    logger.error("Missing required environment variables:");
    missing.forEach(key => logger.error(`  - ${key}`));

    // Provide helpful deployment-specific error message
    const isProduction = process.env.NODE_ENV === "production";
    const deploymentHint = isProduction
      ? "\n\n🚨 DEPLOYMENT ERROR: Environment variables not set!\n" +
      "For Railway: Go to your service → Variables tab → Add missing variables\n" +
      "For Render: Go to your service → Environment → Add missing variables\n" +
      "For Fly.io: Use 'fly secrets set KEY=value' command\n\n" +
      "Required variables:\n" +
      missing.map(key => `  - ${key}`).join("\n") +
      "\n\nSee RAILWAY_DEPLOYMENT.md for detailed setup instructions."
      : "\n\nPlease check your .env file or environment configuration.";

    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}${deploymentHint}`
    );
  }

  if (warnings.length > 0) {
    logger.warn("Optional environment variables not set:");
    warnings.forEach(msg => logger.warn(`  - ${msg}`));
  }

  // Validate DATABASE_URL format
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("postgresql://")) {
    logger.warn("DATABASE_URL should start with 'postgresql://'");
  }

  // Validate PORT
  const port = parseInt(process.env.PORT || "5000", 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}. Must be between 1 and 65535.`);
  }

  logger.info("Environment validation passed");
  logger.info(`Server will run on port ${port}`);
  logger.info(`Node environment: ${process.env.NODE_ENV || "development"}`);
}