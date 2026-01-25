import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}] ${stack || message}`;
});

// Create Winston logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        errors({ stack: true }),
        logFormat
      ),
    }),
  ],
});

// Create a child logger for specific modules
export function createModuleLogger(module: string) {
  return {
    info: (message: string, meta?: object) => 
      logger.info(`[${module}] ${message}`, meta),
    warn: (message: string, meta?: object) => 
      logger.warn(`[${module}] ${message}`, meta),
    error: (message: string, meta?: object) => 
      logger.error(`[${module}] ${message}`, meta),
    debug: (message: string, meta?: object) => 
      logger.debug(`[${module}] ${message}`, meta),
  };
}
