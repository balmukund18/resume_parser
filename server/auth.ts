import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import crypto from "crypto";
import { pool } from "./db";
import { storage } from "./storage";
import { createModuleLogger } from "./utils/logger";

const logger = createModuleLogger("Auth");

// ─── Express.User type augmentation ───
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      avatar: string | null;
      googleId: string | null;
    }
  }
}

// ─── One-time OAuth redirect tokens (short-lived, in-memory) ───
const oauthTokens = new Map<string, { user: Express.User; expiresAt: number }>();

function generateOAuthToken(user: Express.User): string {
  const token = crypto.randomBytes(32).toString("hex");
  oauthTokens.set(token, { user, expiresAt: Date.now() + 60_000 });
  return token;
}

function consumeOAuthToken(token: string): Express.User | null {
  const entry = oauthTokens.get(token);
  if (!entry) return null;
  oauthTokens.delete(token);
  if (Date.now() > entry.expiresAt) return null;
  return entry.user;
}

setInterval(() => {
  const now = Date.now();
  oauthTokens.forEach((entry, token) => {
    if (now > entry.expiresAt) oauthTokens.delete(token);
  });
}, 5 * 60_000);

// ─── Long-lived bearer tokens (HMAC-signed, no DB needed) ───
const TOKEN_SECRET = () => process.env.SESSION_SECRET || "resume-parser-secret";
const TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function createBearerToken(userId: string): string {
  const expiry = Math.floor(Date.now() / 1000) + TOKEN_MAX_AGE;
  const payload = `${userId}.${expiry}`;
  const sig = crypto.createHmac("sha256", TOKEN_SECRET()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

function verifyBearerToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(".");
    if (parts.length !== 3) return null;
    const [userId, expiryStr, sig] = parts;
    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || Date.now() / 1000 > expiry) return null;
    const expectedSig = crypto.createHmac("sha256", TOKEN_SECRET()).update(`${userId}.${expiryStr}`).digest("hex");
    if (sig !== expectedSig) return null;
    return userId;
  } catch {
    return null;
  }
}

// ─── Password helpers ───
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString("hex"));
    });
  });
}

// ─── Helper: build user JSON response with bearer token ───
function userWithToken(user: Express.User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    googleId: user.googleId,
    authToken: createBearerToken(user.id),
  };
}

// ─── Auth middleware ───
export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() || req.user) return next();
  res.status(401).json({ message: "Authentication required" });
};

// ─── Setup function ───
export async function setupAuth(app: Express) {
  // Create session table
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      ) WITH (OIDS=FALSE);
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
  } catch (err) {
    logger.error(`Failed to create session table: ${err}`);
  }

  const PgStore = connectPgSimple(session);

  app.use(
    session({
      store: new PgStore({ pool: pool as any }),
      secret: process.env.SESSION_SECRET || "resume-parser-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // ─── Bearer token middleware ───
  // If not authenticated via session cookie, check Authorization header.
  // This makes ALL routes work on mobile / cross-domain where cookies are blocked.
  app.use(async (req, _res, next) => {
    if (req.isAuthenticated()) return next();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

    const userId = verifyBearerToken(authHeader.slice(7));
    if (!userId) return next();

    try {
      const user = await storage.getUserById(userId);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          googleId: user.googleId,
        };
      }
    } catch (err) {
      logger.error(`Bearer token user lookup error: ${err}`);
    }
    next();
  });

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      if (!user) return done(null, false);
      done(null, {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        googleId: user.googleId,
      });
    } catch (err) {
      done(err);
    }
  });

  // ─── Local strategy ───
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) return done(null, false, { message: "Invalid email or password" });
          if (!user.password) return done(null, false, { message: "Please use Google sign-in for this account" });
          const valid = await verifyPassword(password, user.password);
          if (!valid) return done(null, false, { message: "Invalid email or password" });
          done(null, {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            googleId: user.googleId,
          });
        } catch (err) {
          done(err);
        }
      }
    )
  );

  // ─── Google strategy (conditional) ───
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (googleClientId && googleClientSecret) {
    const backendUrl = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || "";
    const callbackURL = backendUrl
      ? `${backendUrl}/api/auth/google/callback`
      : "/api/auth/google/callback";

    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL,
          scope: ["profile", "email"],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            let user = await storage.getUserByGoogleId(profile.id);
            if (user) {
              return done(null, {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                googleId: user.googleId,
              });
            }

            const email = profile.emails?.[0]?.value;
            if (email) {
              user = await storage.getUserByEmail(email);
              if (user) {
                return done(null, {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  avatar: user.avatar,
                  googleId: user.googleId,
                });
              }
            }

            const newUser = await storage.createUser({
              email: email || `${profile.id}@google.oauth`,
              name: profile.displayName || "Google User",
              password: null,
              googleId: profile.id,
              avatar: profile.photos?.[0]?.value || null,
            });

            done(null, {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
              avatar: newUser.avatar,
              googleId: newUser.googleId,
            });
          } catch (err) {
            done(err as Error);
          }
        }
      )
    );

    logger.info("Google OAuth strategy configured");
  } else {
    logger.warn("Google OAuth not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing)");
  }

  // ─── Auth routes ───

  // Register
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ message: "Email, password and name are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const hashed = await hashPassword(password);
      const user = await storage.createUser({
        email,
        name,
        password: hashed,
        googleId: null,
        avatar: null,
      });

      const userObj: Express.User = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        googleId: user.googleId,
      };

      req.login(userObj, (err) => {
        if (err) return next(err);
        logger.info(`User registered: ${user.email}`);
        res.status(201).json(userWithToken(userObj));
      });
    } catch (error) {
      logger.error(`Registration failed: ${error}`);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login failed" });
      req.login(user, (err) => {
        if (err) return next(err);
        logger.info(`User logged in: ${user.email}`);
        res.json(userWithToken(user));
      });
    })(req, res, next);
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    const email = req.user?.email;
    req.logout((err) => {
      if (err) {
        logger.error(`Logout error: ${err}`);
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err) => {
        if (err) logger.error(`Session destroy error: ${err}`);
        res.clearCookie("connect.sid");
        logger.info(`User logged out: ${email}`);
        res.json({ message: "Logged out" });
      });
    });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated() && !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      avatar: req.user!.avatar,
      googleId: req.user!.googleId,
    });
  });

  // Google OAuth routes
  if (googleClientId && googleClientSecret) {
    app.get(
      "/api/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"] })
    );

    app.get(
      "/api/auth/google/callback",
      (req, res, next) => {
        const rawFrontend = (process.env.FRONTEND_URL || "").trim().replace(/\/+$/, "");
        const frontendUrl = rawFrontend || "/";

        passport.authenticate("google", (err: Error | null, user: Express.User | false, info: any) => {
          if (err) {
            logger.error(`Google OAuth error: ${err.message}`);
            return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
          }
          if (!user) {
            logger.warn(`Google OAuth: no user returned. Info: ${JSON.stringify(info)}`);
            return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
          }

          const oauthToken = generateOAuthToken(user);
          logger.info(`Google OAuth success: ${user.email}, redirecting with token`);
          res.redirect(`${frontendUrl}/auth/callback?token=${oauthToken}`);
        })(req, res, next);
      }
    );

    // Exchange one-time OAuth token for bearer token + user data
    app.post("/api/auth/exchange-token", (req, res) => {
      const { token } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Token is required" });
      }

      const user = consumeOAuthToken(token);
      if (!user) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      logger.info(`Token exchange login: ${user.email}`);
      res.json(userWithToken(user));
    });
  }

  logger.info("Auth system initialized");
}
