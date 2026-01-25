# Railway 502 Bad Gateway Error - Fix Guide

## 🚨 Problem
You're seeing **502 Bad Gateway** errors in Railway HTTP logs. This means:
- Railway's proxy can't connect to your Node.js server
- The server is either crashing or not starting properly

## ✅ Quick Diagnosis

### Step 1: Check Deploy Logs (MOST IMPORTANT)
1. Go to Railway Dashboard
2. Click your **web service**
3. Go to **"Deploy Logs"** tab (NOT HTTP Logs)
4. Look for:
   - ❌ Error messages
   - ❌ "Environment validation failed"
   - ❌ "Frontend build not found"
   - ❌ Any stack traces

**This will tell you exactly why the server isn't starting!**

### Step 2: Common Issues & Fixes

#### Issue 1: Environment Variables Missing
**Symptom**: Logs show "Environment validation failed"

**Fix**:
1. Railway Dashboard → Your Service → **"Variables"** tab
2. Add these **required** variables:
   - `DATABASE_URL` (from your PostgreSQL service)
   - `GEMINI_API_KEY` (your Google Gemini API key)
   - `SESSION_SECRET` (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
3. Add **optional** (but recommended):
   - `GROQ_API_KEY` (for fallback)
4. Railway will auto-redeploy

#### Issue 2: Frontend Not Built
**Symptom**: Logs show "Could not find the build directory"

**Fix**:
1. Railway Dashboard → Your Service → **"Settings"** tab
2. Check **"Build Command"**:
   - Should be: `npm install && npm run build`
   - If different/empty, set it to: `npm install && npm run build`
3. Check **"Start Command"**:
   - Should be: `npm start`
4. Redeploy: **"Deploy"** tab → **"Redeploy"**

#### Issue 3: Build Fails
**Symptom**: Build logs show TypeScript errors or build failures

**Fix**:
1. Check build logs for specific error
2. Common causes:
   - TypeScript errors → Run `npm run check` locally, fix errors
   - Missing dependencies → Check `package.json`
   - Build script issues → Verify `script/build.ts` exists
3. Fix locally, push to GitHub, Railway will rebuild

#### Issue 4: Database Connection Fails
**Symptom**: Logs show database connection errors

**Fix**:
1. Verify PostgreSQL service is running
2. Check `DATABASE_URL` is correct:
   - Should be: `postgresql://user:password@host:port/database`
   - Railway auto-generates this for PostgreSQL services
3. Make sure `DATABASE_URL` is set in Variables tab

#### Issue 5: Port Configuration
**Symptom**: Server starts but still 502 errors

**Fix**:
- Railway automatically sets `PORT` environment variable
- Server code already uses `process.env.PORT || "5000"`
- Should work automatically, but verify in Variables tab

## 🔍 How to Read Railway Logs

### Deploy Logs (Startup)
Shows what happens when Railway builds and starts your app:
```
building client...
✓ built in 5s
building server...
✓ built in 3s
✅ Environment validation passed
📦 Registering routes...
✅ Routes registered
📁 Setting up static file serving...
✅ Static files configured
🚀 Server running on http://0.0.0.0:5000
✅ Ready to accept connections
```

**If you see errors here, that's your problem!**

### HTTP Logs (Requests)
Shows incoming requests (what you're seeing now):
- 502 errors = Server not responding
- 200 = Success
- 500 = Server error (server is running but crashed)

## 🛠️ Step-by-Step Fix

1. **Check Deploy Logs First**
   - This tells you the exact error

2. **If Environment Validation Failed**:
   - Add missing variables in Variables tab
   - Redeploy

3. **If Frontend Build Missing**:
   - Set Build Command: `npm install && npm run build`
   - Redeploy

4. **If Build Fails**:
   - Fix errors locally
   - Push to GitHub
   - Railway rebuilds automatically

5. **Verify Server Started**:
   - Deploy logs should end with: `🚀 Server running on http://0.0.0.0:PORT`
   - If you don't see this, server didn't start

## 📋 Railway Configuration Checklist

✅ **Build Command**: `npm install && npm run build`
✅ **Start Command**: `npm start`
✅ **Root Directory**: `/` (or empty)
✅ **Node Version**: Auto-detect or `20`

✅ **Environment Variables**:
- `DATABASE_URL` (from PostgreSQL service)
- `GEMINI_API_KEY`
- `SESSION_SECRET`
- `GROQ_API_KEY` (optional)
- `NODE_ENV=production` (Railway sets this automatically)

## 🧪 Test Locally First

Before deploying, test the build locally:

```bash
# Build the project
npm run build

# Check if dist/public exists
ls -la dist/public

# Check if dist/index.cjs exists
ls -la dist/index.cjs

# Start the server
npm start

# Should see:
# ✅ Environment validation passed
# 📦 Registering routes...
# 🚀 Server running on http://localhost:5000

# Visit http://localhost:5000
# Should see the app working
```

If it works locally, it will work on Railway (with correct config).

## 🆘 Still Not Working?

1. **Share Deploy Logs** (not HTTP logs)
   - These show the actual startup errors

2. **Check Railway Status**
   - Is the service "Active"?
   - Is the database service running?

3. **Verify GitHub Connection**
   - Railway → Settings → Source
   - Make sure it's connected to your repo

4. **Check Resource Limits**
   - Railway free tier has limits
   - Check if you've hit any limits

---

**Most Common Fix**: Check **Deploy Logs** → Find the error → Fix it → Redeploy
