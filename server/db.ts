import "./config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { createModuleLogger } from "./utils/logger";

const { Pool } = pg;
const logger = createModuleLogger("Database");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection pool for better performance
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Handle pool errors
pool.on("error", (err) => {
  logger.error(`Unexpected database pool error: ${err.message}`);
});

pool.on("connect", () => {
  logger.info("Database connection established");
});

export const db = drizzle(pool, { schema });
