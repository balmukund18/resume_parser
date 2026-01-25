import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { createModuleLogger } from "./logger";

const logger = createModuleLogger("AIClient");

type AIProvider = "gemini" | "groq";

// Circuit breaker state for Gemini quota errors
interface CircuitBreakerState {
  lastFailureTime: number | null;
  failureCount: number;
  isOpen: boolean; // true = skip Gemini, false = try Gemini
}

let circuitBreaker: CircuitBreakerState = {
  lastFailureTime: null,
  failureCount: 0,
  isOpen: false,
};

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  COOLDOWN_PERIOD_MS: 60 * 60 * 1000, // 1 hour cooldown
  FAILURE_THRESHOLD: 3, // Open circuit after 3 consecutive failures
  RESET_THRESHOLD: 1, // Reset after 1 successful request
};

interface GenerateContentOptions {
  model?: string;
  contents: string;
  config?: {
    maxOutputTokens?: number;
    temperature?: number;
  };
}

interface AIResponse {
  text: string;
  provider: AIProvider;
}

/**
 * Check if an error is a quota/rate limit error
 * Handles various error formats from Gemini API
 */
function isQuotaError(error: any): boolean {
  if (!error) return false;
  
  // Extract error message from various possible locations
  const errorMessage = (
    error.message?.toLowerCase() ||
    error.error?.message?.toLowerCase() ||
    error.response?.data?.error?.message?.toLowerCase() ||
    error.body?.error?.message?.toLowerCase() ||
    String(error).toLowerCase() ||
    ""
  );
  
  // Extract status/code from various possible locations
  const statusCode = (
    error.status ||
    error.statusCode ||
    error.code ||
    error.response?.status ||
    error.response?.statusCode ||
    error.error?.code ||
    error.error?.status ||
    ""
  );
  
  // Extract error status/type from nested structures
  const errorStatus = (
    error.status ||
    error.error?.status?.toLowerCase() ||
    error.response?.data?.error?.status?.toLowerCase() ||
    ""
  );
  
  // Check for common quota/rate limit indicators in message
  const quotaIndicators = [
    "quota",
    "rate limit",
    "429",
    "resource exhausted",
    "quota exceeded",
    "too many requests",
    "daily limit",
    "per minute limit",
    "requests per day",
    "requests per minute",
    "tokens per minute",
    "rpm",
    "rpd",
    "tpm",
    "resource_exhausted",
  ];
  
  // Check if any indicator is in the error message
  const hasQuotaIndicator = quotaIndicators.some(indicator => 
    errorMessage.includes(indicator)
  );
  
  // Check status codes
  const is429Status = statusCode === 429 || String(statusCode).includes("429");
  
  // Check for RESOURCE_EXHAUSTED status
  const isResourceExhausted = errorStatus === "resource_exhausted" || 
                               errorStatus === "resource exhausted" ||
                               errorMessage.includes("resource_exhausted");
  
  const isQuota = hasQuotaIndicator || is429Status || isResourceExhausted;
  
  if (isQuota) {
    logger.warn(`Detected quota/rate limit error: ${JSON.stringify({
      message: errorMessage.substring(0, 200),
      statusCode,
      errorStatus,
      errorType: error.constructor?.name
    })}`);
  }
  
  return isQuota;
}

/**
 * Initialize Gemini client
 */
function getGeminiClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    apiVersion: "v1"
  });
}

/**
 * Initialize Groq client
 */
function getGroqClient(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY environment variable is required");
  }
  
  return new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
}

/**
 * Generate content using Gemini with timeout
 */
async function generateWithGemini(options: GenerateContentOptions): Promise<AIResponse> {
  const ai = getGeminiClient();
  const model = options.model || "gemini-2.5-flash";
  const timeout = 120000; // 2 minutes timeout
  
  logger.info(`Attempting to generate content with Gemini (${model})`);
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Gemini request timed out after ${timeout}ms`));
    }, timeout);
  });

  try {
    const requestPromise = ai.models.generateContent({
      model,
      contents: options.contents,
      config: {
        maxOutputTokens: options.config?.maxOutputTokens || 8192,
        temperature: options.config?.temperature || 0.1,
      },
    });

    const response = await Promise.race([requestPromise, timeoutPromise]);
    
    return {
      text: response.text || "",
      provider: "gemini",
    };
  } catch (error: any) {
    // Preserve original error structure for quota detection
    // Re-throw with additional context if needed
    throw error;
  }
}

/**
 * Generate content using Groq (LLaMA-3) with timeout
 */
async function generateWithGroq(options: GenerateContentOptions): Promise<AIResponse> {
  const groq = getGroqClient();
  // Use LLaMA 3.1 8B Instant - fast and reliable (70b-versatile was decommissioned)
  // Alternative models: llama-3.1-70b-instruct (better quality, slower), llama-3.3-70b-versatile (newer)
  // IMPORTANT: Ignore Gemini model names, always use Groq models
  let model = options.model || "llama-3.1-8b-instant";
  
  // If a Gemini model name was passed, override it with Groq default
  if (model.includes("gemini") || model.includes("flash") || model.includes("pro")) {
    logger.warn(`Invalid Groq model name detected (${model}), using default Groq model`);
    model = "llama-3.1-8b-instant";
  }
  
  const timeout = 120000; // 2 minutes timeout
  
  logger.info(`Generating content with Groq (${model})`);
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Groq request timed out after ${timeout}ms`));
    }, timeout);
  });

  try {
    const requestPromise = groq.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: options.contents,
        },
      ],
      max_tokens: options.config?.maxOutputTokens || 8192,
      temperature: options.config?.temperature || 0.1,
    });

    const completion = await Promise.race([requestPromise, timeoutPromise]);
    
    const text = completion.choices[0]?.message?.content || "";
    
    if (!text) {
      throw new Error("Groq returned empty response");
    }
    
    return {
      text,
      provider: "groq",
    };
  } catch (error: any) {
    // Preserve original error structure
    throw error;
  }
}

/**
 * Check if we should skip Gemini (circuit breaker or manual override)
 */
function shouldSkipGemini(): boolean {
  // Manual override: Force Groq
  if (process.env.FORCE_GROQ === "true") {
    logger.info("Skipping Gemini: FORCE_GROQ is enabled");
    return true;
  }
  
  // Manual override: Force Gemini (ignore circuit breaker)
  if (process.env.FORCE_GEMINI === "true") {
    return false;
  }
  
  // Circuit breaker: Check if circuit is open
  if (circuitBreaker.isOpen) {
    const timeSinceFailure = Date.now() - (circuitBreaker.lastFailureTime || 0);
    
    // If cooldown period has passed, try Gemini again
    if (timeSinceFailure > CIRCUIT_BREAKER_CONFIG.COOLDOWN_PERIOD_MS) {
      logger.info("Circuit breaker cooldown expired, resetting and trying Gemini");
      circuitBreaker.isOpen = false;
      circuitBreaker.failureCount = 0;
      return false;
    }
    
    logger.info(`Skipping Gemini: Circuit breaker is open (cooldown for ${Math.round((CIRCUIT_BREAKER_CONFIG.COOLDOWN_PERIOD_MS - timeSinceFailure) / 1000 / 60)} more minutes)`);
    return true;
  }
  
  return false;
}

/**
 * Record successful Gemini request (reset circuit breaker)
 */
function recordGeminiSuccess(): void {
  if (circuitBreaker.failureCount > 0) {
    logger.info("Gemini request succeeded, resetting circuit breaker");
    circuitBreaker.failureCount = 0;
    circuitBreaker.lastFailureTime = null;
    circuitBreaker.isOpen = false;
  }
}

/**
 * Record Gemini quota failure (update circuit breaker)
 */
function recordGeminiQuotaFailure(): void {
  circuitBreaker.failureCount++;
  circuitBreaker.lastFailureTime = Date.now();
  
  if (circuitBreaker.failureCount >= CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD) {
    circuitBreaker.isOpen = true;
    logger.warn(`Circuit breaker opened: ${circuitBreaker.failureCount} consecutive Gemini quota failures`);
  } else {
    logger.warn(`Gemini quota failure ${circuitBreaker.failureCount}/${CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD} (circuit breaker will open after ${CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD})`);
  }
}

/**
 * Generate content with automatic fallback: Gemini → Groq
 * Tries Gemini first, falls back to Groq if quota is hit
 * Includes circuit breaker to temporarily skip Gemini after repeated failures
 */
export async function generateContentWithFallback(
  options: GenerateContentOptions
): Promise<AIResponse> {
  // Check if we should skip Gemini (circuit breaker or manual override)
  if (shouldSkipGemini()) {
    logger.info("Skipping Gemini, using Groq directly");
    
    if (!process.env.GROQ_API_KEY) {
      throw new Error("Groq API key not configured and Gemini is skipped");
    }
    
    const groqOptions: GenerateContentOptions = {
      ...options,
      model: undefined,
    };
    
    return await generateWithGroq(groqOptions);
  }
  
  // Try Gemini first
  try {
    const response = await generateWithGemini(options);
    logger.info(`Successfully generated content with Gemini`);
    recordGeminiSuccess(); // Reset circuit breaker on success
    return response;
  } catch (error: any) {
    // Log full error details for debugging
    logger.warn(`Gemini request failed: ${error.message || String(error)}`);
    logger.debug(`Full error object: ${JSON.stringify({
      message: error.message,
      status: error.status,
      code: error.code,
      statusCode: error.statusCode,
      error: error.error,
      response: error.response ? { status: error.response.status, data: error.response.data } : undefined
    }, null, 2)}`);
    
    // Check if it's a quota error
    if (isQuotaError(error)) {
      recordGeminiQuotaFailure(); // Update circuit breaker
      logger.warn(`Gemini quota/rate limit detected, falling back to Groq`);
      
      // Check if Groq is configured
      if (!process.env.GROQ_API_KEY) {
        logger.error(`Groq API key not configured, cannot fallback`);
        throw new Error(
          `Gemini quota exceeded and Groq API key is not configured. Please set GROQ_API_KEY environment variable.`
        );
      }
      
      try {
        // IMPORTANT: Override model to use Groq model, not Gemini model
        // Groq doesn't support Gemini model names
        const groqOptions: GenerateContentOptions = {
          ...options,
          model: undefined, // Let generateWithGroq use its default Groq model
        };
        
        const response = await generateWithGroq(groqOptions);
        logger.info(`Successfully generated content with Groq (fallback)`);
        return response;
      } catch (groqError: any) {
        logger.error(`Both Gemini and Groq failed. Groq error: ${groqError.message || JSON.stringify(groqError)}`);
        throw new Error(
          `AI generation failed: Gemini quota exceeded, Groq also failed: ${groqError.message || JSON.stringify(groqError)}`
        );
      }
    } else {
      // Not a quota error, re-throw with more context
      logger.error(`Gemini error (not quota-related): ${error.message || String(error)}`);
      throw error;
    }
  }
}

/**
 * Check if providers are configured
 */
export function checkAIConfiguration(): { gemini: boolean; groq: boolean } {
  return {
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
  };
}

/**
 * Get circuit breaker status (for monitoring/debugging)
 */
export function getCircuitBreakerStatus(): {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number | null;
  timeUntilRetry: number | null;
} {
  const timeUntilRetry = circuitBreaker.isOpen && circuitBreaker.lastFailureTime
    ? Math.max(0, CIRCUIT_BREAKER_CONFIG.COOLDOWN_PERIOD_MS - (Date.now() - circuitBreaker.lastFailureTime))
    : null;
  
  return {
    isOpen: circuitBreaker.isOpen,
    failureCount: circuitBreaker.failureCount,
    lastFailureTime: circuitBreaker.lastFailureTime,
    timeUntilRetry,
  };
}

/**
 * Reset circuit breaker manually (for testing/admin)
 */
export function resetCircuitBreaker(): void {
  logger.info("Circuit breaker manually reset");
  circuitBreaker = {
    lastFailureTime: null,
    failureCount: 0,
    isOpen: false,
  };
}
