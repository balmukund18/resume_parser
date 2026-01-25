import { Request, Response, NextFunction } from "express";
import { createModuleLogger } from "./logger";

const logger = createModuleLogger("RateLimiter");

// Simple in-memory rate limiter (for production, consider Redis-based solution)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 5 * 60 * 1000);

/**
 * Simple rate limiter middleware
 * For production, consider using express-rate-limit with Redis
 */
export function createRateLimiter(options: {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
}) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip || "unknown",
    skipSuccessfulRequests = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const record = store[key];

    // Reset if window expired
    if (!record || record.resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    // Check limit
    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      res.setHeader("X-RateLimit-Limit", maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("X-RateLimit-Reset", new Date(record.resetTime).toISOString());
      
      logger.warn(`Rate limit exceeded for ${key}: ${record.count}/${maxRequests} requests`);
      
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
        retryAfter,
      });
    }

    // Increment counter
    record.count++;

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
    res.setHeader("X-RateLimit-Remaining", (maxRequests - record.count).toString());
    res.setHeader("X-RateLimit-Reset", new Date(record.resetTime).toISOString());

    // Track response status if needed
    if (skipSuccessfulRequests) {
      res.on("finish", () => {
        if (res.statusCode < 400 && record.count > 0) {
          record.count--;
        }
      });
    }

    next();
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  // General API rate limit: 100 requests per 15 minutes
  general: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  }),

  // Upload endpoint: 10 requests per hour (more restrictive)
  upload: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
  }),

  // Analysis endpoints: 30 requests per hour
  analysis: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 30,
  }),
};
