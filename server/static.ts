import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In production, the built server is at dist/index.cjs
  // So __dirname will be dist/, and public is at dist/public
  // But we need to handle the case where we're running from different locations
  const possiblePaths = [
    path.resolve(__dirname, "public"), // When running from dist/index.cjs, this is dist/public
    path.resolve(process.cwd(), "dist", "public"), // From project root
    path.join(process.cwd(), "dist", "public"), // Alternative path join
  ];

  let distPath: string | null = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      distPath = possiblePath;
      break;
    }
  }

  if (!distPath) {
    const errorMsg = `❌ Frontend build not found!\n\n` +
      `Tried locations:\n${possiblePaths.map(p => `  - ${p}`).join("\n")}\n\n` +
      `Make sure Railway's Build Command includes: npm run build\n` +
      `This builds the frontend React app to dist/public/\n\n` +
      `Check Railway Settings → Build Command should be: npm install && npm run build`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  console.log(`✅ Serving static files from: ${distPath}`);

  // Serve static files (JS, CSS, images, etc.)
  app.use(express.static(distPath, {
    maxAge: "1y", // Cache static assets for 1 year
    etag: true,
  }));

  // Fall through to index.html for all routes (SPA routing)
  // This must be last, after all API routes
  // Note: Express 5 removed bare "*" wildcard — use regex instead
  app.get(/\/(.*)/, (_req, res) => {
    const indexPath = path.resolve(distPath!, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(500).send(`
        <html>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1>❌ Frontend Build Missing</h1>
            <p>The frontend was not built properly.</p>
            <p>Check Railway build logs to see if <code>npm run build</code> completed successfully.</p>
            <p><strong>Build Command should be:</strong> <code>npm install && npm run build</code></p>
          </body>
        </html>
      `);
    }
  });
}
