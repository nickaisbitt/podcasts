# 🚀 Railway Deployment Guide

This guide will walk you through deploying your CPTSD Podcast Script Generator to Railway step by step.

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Railway Account** - Sign up at [railway.app](https://railway.app)
2. **Google Cloud Project** - For Google Sheets API access
3. **OpenAI API Key** - For GPT-4 script generation
4. **Node.js 18+** - Installed on your local machine

## 🔧 Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

## 🔐 Step 2: Login to Railway

```bash
railway login
```

Follow the browser prompts to authenticate.

## 📁 Step 3: Prepare Your Environment

### Copy Environment Template

```bash
cp env.example .env
```

### Fill in Your Credentials

Edit `.env` with your actual values:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Google Sheets API Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=11QiYGHX9hbtBpMMrF8e895t5xdGknLsF82CL6xDqUH8
GOOGLE_SHEETS_TAB_NAME=CPTSD Recovery
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----"

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=4000

# Application Configuration
PODCAST_HOST_NAME=Gregory
PODCAST_VOICE_STYLE=Fabel
PODCAST_EMAIL=cptsd@senseofthisshit.com
SUPPORTERS_CLUB_URL=https://www.spreaker.com/podcast/c-ptsd-let-s-make-sense-of-this-sh-t--6331440/support
```

## 🔑 Step 4: Google Sheets API Setup

### 1. Enable Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API
4. Go to "APIs & Services" > "Library"
5. Search for "Google Sheets API" and enable it

### 2. Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in service account details
4. Click "Create and Continue"
5. Skip role assignment (click "Continue")
6. Click "Done"

### 3. Generate Private Key

1. Click on your service account
2. Go to "Keys" tab
3. Click "Add Key" > "Create New Key"
4. Choose "JSON" format
5. Download the JSON file

### 4. Extract Credentials

Open the downloaded JSON file and copy:
- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → `GOOGLE_PRIVATE_KEY`

### 5. Share Your Spreadsheet

1. Open your [CPTSD Recovery spreadsheet](https://docs.google.com/spreadsheets/d/11QiYGHX9hbtBpMMrF8e895t5xdGknLsF82CL6xDqUH8/edit?usp=sharing)
2. Click "Share" button
3. Add your service account email with "Editor" access
4. Make sure it can access the "CPTSD Recovery" tab

## 🤖 Step 5: OpenAI API Setup

### 1. Get API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in or create account
3. Go to "API Keys" section
4. Click "Create new secret key"
5. Copy the key to your `.env` file

### 2. Verify Access

Ensure your account has access to GPT-4 model.

## 🚀 Step 6: Deploy to Railway

### Option A: Automated Deployment (Recommended)

```bash
./deploy.sh
```

This script will:
- Check prerequisites
- Initialize Railway project
- Load environment variables
- Deploy your application

### Option B: Manual Deployment

```bash
# Initialize Railway project
railway init

# Set environment variables
railway variables set GOOGLE_SHEETS_SPREADSHEET_ID=11QiYGHX9hbtBpMMrF8e895t5xdGknLsF82CL6xDqUH8
railway variables set GOOGLE_SHEETS_TAB_NAME="c-ptsd recovery"
railway variables set GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
railway variables set GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----"
railway variables set OPENAI_API_KEY=your-openai-api-key-here
railway variables set PODCAST_HOST_NAME=Gregory
railway variables set PODCAST_VOICE_STYLE=Fabel
railway variables set PODCAST_EMAIL=cptsd@senseofthisshit.com
railway variables set SUPPORTERS_CLUB_URL=https://www.spreaker.com/podcast/c-ptsd-let-s-make-sense-of-this-sh-t--6331440/support

# Deploy
railway up
```

## ✅ Step 7: Verify Deployment

### Check Health Status

```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "environment": "production",
  "version": "1.0.0"
}
```

### Test Script Generation

```bash
curl -X POST https://your-app.railway.app/api/scripts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Test Episode",
    "episodeType": "main",
    "includeSEO": true,
    "includeDescription": true
  }'
```

## 📊 Step 8: Monitor Your Deployment

### View Logs

```bash
railway logs
```

### Check Status

```bash
railway status
```

### Open Dashboard

```bash
railway open
```

## 🔧 Step 9: Test Integration

### Test Google Sheets Connection

```bash
curl https://your-app.railway.app/api/scripts/episodes
```

### Test OpenAI Integration

```bash
curl https://your-app.railway.app/api/scripts/health
```

## 🎯 Step 10: Start Using

Your application is now ready! You can:

1. **Generate scripts manually** using the API endpoints
2. **Pull episodes from Google Sheets** automatically
3. **Generate SEO content** for each episode
4. **Monitor performance** through Railway dashboard

## 🚨 Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Check Railway dashboard > Variables
   - Ensure all required variables are present

2. **Google Sheets Access Denied**
   - Verify service account has access to spreadsheet
   - Check spreadsheet sharing permissions

3. **OpenAI API Errors**
   - Verify API key is correct
   - Check account has sufficient credits
   - Ensure GPT-4 access

4. **Build Failures**
   - Check Railway logs for specific errors
   - Verify Node.js version compatibility

### Debug Mode

Set `NODE_ENV=development` in Railway to get detailed error messages.

### Getting Help

1. Check Railway logs: `railway logs`
2. Verify environment variables: `railway variables`
3. Check application health: `/health` endpoint
4. Review this documentation

## 🎉 Success!

Once deployed, you'll have:

- ✅ **Automated script generation** for your CPTSD podcast
- ✅ **Google Sheets integration** for episode management
- ✅ **AI-powered content** in Gregory's authentic voice
- ✅ **Production-ready API** with monitoring and security
- ✅ **Easy deployment** and scaling on Railway

## 🔗 Next Steps

1. **Test all endpoints** to ensure everything works
2. **Generate your first script** using the API
3. **Integrate with your workflow** for automated content creation
4. **Monitor performance** and adjust as needed
5. **Share feedback** for future improvements

---

**Happy podcasting! 🎙️✨**
