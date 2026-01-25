# Railway Frontend Not Loading - Quick Fix

## 🚨 Problem
Server is running but frontend doesn't load. You see errors or blank page.

## ✅ Solution

### The Issue
The frontend needs to be **built** before the server starts. Railway needs to:
1. Build the frontend (React app) → creates `dist/public/`
2. Build the backend (Node.js server) → creates `dist/index.cjs`
3. Start the server → serves files from `dist/public/`

### Quick Fix (2 minutes)

1. **Go to Railway Dashboard**
   - Click on your **web service**

2. **Check Build Command**
   - Go to **"Settings"** tab
   - Scroll to **"Build Command"**
   - Should be: `npm install && npm run build`
   - If it's different, change it to: `npm install && npm run build`

3. **Check Start Command**
   - In **"Settings"** tab
   - Scroll to **"Start Command"**
   - Should be: `npm start`
   - If it's different, change it to: `npm start`

4. **Redeploy**
   - Railway will auto-redeploy when you save
   - OR click **"Deploy"** tab → **"Redeploy"**

5. **Check Build Logs**
   - Go to **"Deploy"** tab → **"View Logs"**
   - You should see:
     ```
     building client...
     building server...
     ✓ built in X seconds
     ```
   - If you see errors, check the logs

### Verify It's Working

1. **Check Build Output**
   - In logs, look for: `Serving static files from: /app/dist/public`
   - This means frontend files were found

2. **Test the App**
   - Visit your Railway URL
   - You should see the resume parser interface
   - If you see "Frontend not built" error, the build didn't complete

### Common Issues

#### Issue 1: Build Command Missing
**Symptom**: Server starts but frontend is blank

**Fix**: 
- Settings → Build Command → Set to: `npm install && npm run build`

#### Issue 2: Build Fails
**Symptom**: Deployment fails during build

**Check**:
- View logs for specific error
- Common causes:
  - Missing dependencies
  - TypeScript errors
  - Build script issues

**Fix**:
- Run `npm run check` locally first
- Fix any TypeScript errors
- Push fixes to GitHub
- Railway will rebuild automatically

#### Issue 3: Static Files Not Found
**Symptom**: Error "Could not find the build directory"

**Fix**:
- Verify build command ran successfully
- Check that `dist/public` directory exists after build
- Rebuild: Settings → Redeploy

### Build Process Explained

When Railway runs `npm run build`:
1. **Vite builds frontend** → Outputs to `dist/public/`
   - React app compiled to static HTML/JS/CSS
   - All assets bundled and optimized

2. **esbuild builds backend** → Outputs to `dist/index.cjs`
   - TypeScript compiled to JavaScript
   - Server code bundled

3. **Server starts** with `npm start`
   - Runs `node dist/index.cjs`
   - Serves static files from `dist/public/`
   - Handles API requests

### Railway Configuration Summary

**Build Command**: `npm install && npm run build`
**Start Command**: `npm start`
**Root Directory**: `/` (empty or `/`)

### Testing Locally First

Before deploying, test the build locally:

```bash
# Build the project
npm run build

# Check if dist/public exists
ls -la dist/public

# Start the server
npm start

# Visit http://localhost:5000
# Should see the app working
```

If it works locally, it will work on Railway (with correct build command).

---

**Still not working?** Check Railway logs - they show exactly what's happening during build and startup.
