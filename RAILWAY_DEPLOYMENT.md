# Railway Deployment Guide - Step by Step

## 🚨 Common Issue: App Crashes on Startup

If your app crashes with "Environment validation failed", it means **environment variables are not set in Railway**.

## ✅ Quick Fix Steps

### 1. Set Environment Variables in Railway

1. Go to your Railway project dashboard
2. Click on your **service** (the web service, not the database)
3. Go to **"Variables"** tab
4. Click **"+ New Variable"**
5. Add each variable:

#### Required Variables:
```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
SESSION_SECRET=generate_a_random_string_here
PORT=${{PORT}}
```

#### Optional Variables:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
ALLOWED_ORIGINS=https://your-frontend.com
```

### 2. Important Notes:

- **DATABASE_URL**: Use `${{Postgres.DATABASE_URL}}` - Railway automatically provides this if you added a PostgreSQL database
- **PORT**: Use `${{PORT}}` - Railway provides this automatically
- **SESSION_SECRET**: Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3. After Setting Variables:

1. Railway will **automatically redeploy** when you add variables
2. Wait for deployment to complete
3. Check logs to verify it's running

## 📋 Complete Railway Setup

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Authorize Railway to access your repositories

### Step 2: Create Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your `resume_parser` repository
4. Railway will auto-detect it's a Node.js project

### Step 3: Add PostgreSQL Database
1. In your project, click **"+ New"**
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Railway will create a PostgreSQL database
5. Note: The `DATABASE_URL` is automatically available as `${{Postgres.DATABASE_URL}}`

### Step 4: Configure Web Service
1. Click on your **web service** (not the database)
2. Go to **"Settings"** tab
3. **CRITICAL - Set these correctly**:
   - **Build Command**: `npm install && npm run build`
     - This builds BOTH frontend and backend
   - **Start Command**: `npm start`
     - This runs the production server
   - **Root Directory**: `/` (root - leave empty or set to `/`)
   - **Node Version**: `20` (or let Railway auto-detect)

### Step 5: Set Environment Variables
Go to **"Variables"** tab and add:

```env
# Server Configuration
NODE_ENV=production
PORT=${{PORT}}

# Database (Auto-provided by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# AI APIs (REQUIRED)
GEMINI_API_KEY=AIzaSy...your_actual_key
GROQ_API_KEY=gsk_...your_actual_key

# Session Secret (REQUIRED - generate a random string)
SESSION_SECRET=your_random_32_character_string_here

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### Step 6: Generate SESSION_SECRET
Run this locally to generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and use it as `SESSION_SECRET`

### Step 7: Run Database Migrations
1. Go to your **web service**
2. Click **"Deploy"** tab
3. Click **"..."** (three dots) → **"Run Command"**
4. Enter: `npm run db:push`
5. Click **"Run"**
6. Wait for it to complete

### Step 8: Verify Deployment
1. Go to **"Settings"** tab
2. Find your **public URL** (e.g., `https://your-app.up.railway.app`)
3. Visit the URL
4. Test `/health` endpoint: `https://your-app.up.railway.app/health`

## 🔍 Troubleshooting

### App Crashes Immediately

**Error**: "Environment validation failed" or "Missing required environment variables"

**Solution**:
1. Check **Variables** tab - are all required variables set?
2. Verify `DATABASE_URL` uses `${{Postgres.DATABASE_URL}}`
3. Verify `PORT` uses `${{PORT}}`
4. Check variable names are **exactly** as shown (case-sensitive)
5. Make sure there are no extra spaces in variable values

### Database Connection Error

**Error**: "DATABASE_URL must be set" or connection timeout

**Solution**:
1. Verify PostgreSQL database is created in Railway
2. Check `DATABASE_URL` is set to `${{Postgres.DATABASE_URL}}`
3. Wait a few minutes after creating database (takes time to provision)
4. Check database is in the same project as your web service

### Build Fails

**Error**: Build command fails

**Solution**:
1. Check **Deploy** tab → **Logs** for specific error
2. Verify Node.js version (Railway auto-detects, but you can set `NODE_VERSION=20` in variables)
3. Check `package.json` has correct build script
4. Verify all dependencies are in `package.json`

### App Starts But Returns 500 Errors

**Solution**:
1. Check **Deploy** tab → **Logs** for error details
2. Verify database migrations ran: `npm run db:push`
3. Check all environment variables are set correctly
4. Verify API keys are valid

## 📝 Railway-Specific Tips

1. **Auto-Deploy**: Railway automatically deploys on every git push
2. **Logs**: View real-time logs in **Deploy** tab → **View Logs**
3. **Custom Domain**: Add in **Settings** → **Domains**
4. **Metrics**: View usage in **Metrics** tab
5. **Variables**: Can reference other services with `${{ServiceName.VARIABLE}}`

## ✅ Deployment Checklist

- [ ] Railway account created
- [ ] Project created from GitHub repo
- [ ] PostgreSQL database added
- [ ] All environment variables set
- [ ] SESSION_SECRET generated and set
- [ ] Database migrations run (`npm run db:push`)
- [ ] App is running (check logs)
- [ ] Health endpoint works (`/health`)
- [ ] Test file upload works

## 🎯 Quick Reference

**Railway Dashboard**: https://railway.app/dashboard

**Required Variables**:
- `NODE_ENV=production`
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `GEMINI_API_KEY=...`
- `GROQ_API_KEY=...`
- `SESSION_SECRET=...`
- `PORT=${{PORT}}`

**Common Commands**:
- Run migrations: `npm run db:push`
- View logs: Railway dashboard → Deploy → View Logs
- Restart service: Settings → Restart

---

**Need Help?** Check Railway logs in the dashboard - they show exactly what's failing!
