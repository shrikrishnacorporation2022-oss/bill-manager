# Bill Manager - Deployment Guide

## ✅ Email Agent is Now Active!

The agent will **automatically** check your connected Gmail accounts every 6 hours and:
- Forward emails based on sender or keywords
- Send Telegram reminders for due bills

## How to Deploy to Vercel

### 1. Push to GitHub

```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit - Bill Manager"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/bill-manager.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js
5. Click **"Deploy"**

### 3. Add Environment Variables in Vercel

Go to **Settings** → **Environment Variables** and add:

```
MONGODB_URI=mongodb+srv://murugan:kk5020786kk@murugan.iwhg7hy.mongodb.net/?appName=murugan
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=zw132cbbdnzDf+CccvZR3Nt4LBwVcJmWJQ5yfkPQJbE=
GOOGLE_CLIENT_ID=82481068130-qis3f81ulqg129ki9po7r51h7abb4dam.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
ADMIN_EMAIL=your-email@gmail.com
TELEGRAM_BOT_TOKEN=8365048817:AAH7aQQKottY1xldl5kycBxDb-u1cmo-Lv0
TELEGRAM_CHAT_ID=252739385
CRON_SECRET=my_cron_secret
```

### 4. Update Google OAuth Redirect URIs

Add these in Google Cloud Console:

```
https://your-app-name.vercel.app/api/auth/callback/google
https://your-app-name.vercel.app/api/gmail/callback
```

### 5. Verify Cron Job

Visit: `https://your-app-name.vercel.app/api/cron`
(Add header: `Authorization: Bearer my_cron_secret`)

## How to Use

1. **Login** with your whitelisted Gmail
2. **Categories**: Add custom categories (Rent, DTH, etc.)
3. **Email Manager**: 
   - Click "Connect Gmail Account"
   - Select emails, enter forwarding address
   - Click "Create Forwarding Rule"
4. **Agent runs every 6 hours automatically!**

## Cron Schedule

Current: `0 */6 * * *` (every 6 hours)

To change, edit `vercel.json`:
- Every hour: `0 * * * *`
- Every day at 9 AM: `0 9 * * *`
