import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { validateEnvironment } from "./config";
import { setupAuth } from "./auth";
import crypto from "crypto";

const app = express();
const httpServer = createServer(app);

// Trust proxy (Render, Vercel, etc.) — required for secure cookies behind HTTPS proxy
app.set("trust proxy", 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Body parsing middleware
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
    limit: "10mb", // Match file upload limit
  }),
);

app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Request ID middleware for better logging and tracing
app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const requestId = (req as any).requestId || "unknown";
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `[${requestId}] ${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Validate environment variables before starting
    try {
      validateEnvironment();
      log("✅ Environment validation passed");
    } catch (error: any) {
      console.error("❌ Environment validation failed:", error.message);
      console.error("\n📋 Missing environment variables must be set in Railway:");
      console.error("   Go to: Railway Dashboard → Your Service → Variables tab");
      console.error("   Add all required variables (DATABASE_URL, GEMINI_API_KEY, SESSION_SECRET)");
      process.exit(1);
    }

    // Setup authentication (session, passport) before routes
    log("🔐 Setting up authentication...");
    setupAuth(app);
    log("✅ Authentication configured");

    log("📦 Registering routes...");
    await registerRoutes(httpServer, app);
    log("✅ Routes registered");

    // Global error handler
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      let message = err.message || "Internal Server Error";
      const requestId = (req as any).requestId || "unknown";

      // Don't expose internal error details in production
      if (process.env.NODE_ENV === "production" && status === 500) {
        message = "An internal server error occurred. Please try again later.";
      }

      // Log full error details with request ID
      console.error(`[${requestId}] Internal Server Error:`, {
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        status,
        path: req.path,
        method: req.method,
      });

      if (res.headersSent) {
        return next(err);
      }

      return res.status(status).json({ 
        message,
        requestId: process.env.NODE_ENV === "development" ? requestId : undefined,
        ...(process.env.NODE_ENV === "development" && { 
          error: err.message,
          stack: err.stack 
        })
      });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "production") {
      log("📁 Setting up static file serving...");
      try {
        serveStatic(app);
        log("✅ Static files configured");
      } catch (error: any) {
        console.error("❌ Failed to setup static files:", error.message);
        console.error("\n🔧 FIX: Make sure Railway Build Command includes: npm run build");
        console.error("   This builds the frontend React app to dist/public/");
        console.error("   Railway Settings → Build Command: npm install && npm run build");
        // Don't exit - let the server start but it will return 500 for frontend routes
        // This way API endpoints might still work
      }
    } else {
      log("⚡ Setting up Vite dev server...");
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
      log("✅ Vite configured");
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "5000", 10);
    
    // Bind to 0.0.0.0 in production (all interfaces) or localhost in development
    const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
    
    httpServer.listen(port, host, () => {
      log(`🚀 Server running on http://${host}:${port}`);
      if (process.env.NODE_ENV === "production") {
        log(`   ✅ Accessible from external networks`);
        log(`   ✅ Ready to accept connections`);
      }
    });

    // Handle server listen errors
    httpServer.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${port} is already in use`);
        process.exit(1);
      } else {
        console.error("❌ Server error:", error);
        process.exit(1);
      }
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      log(`\n${signal} received. Shutting down gracefully...`);
      httpServer.close(() => {
        log("Server closed");
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        log("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ Unhandled Promise Rejection:", reason);
      console.error("Promise:", promise);
      // Don't exit in production - log and continue
      // In development, might want to exit for debugging
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught Exception:", error);
      process.exit(1);
    });

  } catch (error: any) {
    console.error("❌ Fatal error during server startup:", error);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
})();
