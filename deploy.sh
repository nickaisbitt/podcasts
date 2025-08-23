#!/bin/bash

# CPTSD Podcast Script Generator - Railway Deployment Script
# This script automates the deployment process to Railway

set -e

echo "🚀 CPTSD Podcast Script Generator - Railway Deployment"
echo "=================================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed."
    echo "Please install it first: npm install -g @railway/cli"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "🔐 Please log in to Railway first:"
    echo "railway login"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Logged in to Railway"
echo ""

# Check if project is initialized
if [ ! -f ".railway/project.json" ]; then
    echo "🚂 Initializing Railway project..."
    railway init
    echo ""
fi

echo "✅ Railway project initialized"
echo ""

# Check environment variables
echo "🔍 Checking environment variables..."
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✅ .env file found"
    echo "📝 Loading environment variables to Railway..."
    
    # Load environment variables from .env file
    while IFS= read -r line; do
        # Skip empty lines and comments
        if [[ -n "$line" && ! "$line" =~ ^[[:space:]]*# ]]; then
            # Extract key and value
            key=$(echo "$line" | cut -d'=' -f1)
            value=$(echo "$line" | cut -d'=' -f2-)
            
            # Remove quotes from value
            value=$(echo "$value" | sed 's/^"//;s/"$//')
            
            if [ -n "$key" ] && [ -n "$value" ]; then
                echo "Setting $key..."
                railway variables set "$key"="$value"
            fi
        fi
    done < .env
    
    echo ""
    echo "✅ Environment variables loaded"
else
    echo "⚠️  .env file not found"
    echo "Please create a .env file with your configuration first."
    echo "You can copy from env.example and fill in your values."
    echo ""
    echo "Required variables:"
    echo "- GOOGLE_SHEETS_SPREADSHEET_ID"
    echo "- GOOGLE_SERVICE_ACCOUNT_EMAIL"
    echo "- GOOGLE_PRIVATE_KEY"
    echo "- OPENAI_API_KEY"
    echo "- PODCAST_HOST_NAME"
    echo "- PODCAST_VOICE_STYLE"
    echo ""
    echo "After creating .env, run this script again."
    exit 1
fi

echo ""
echo "🚀 Deploying to Railway..."
echo ""

# Deploy the application
railway up

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📊 Your application should now be running on Railway."
echo "🔗 Check the Railway dashboard for your deployment URL."
echo ""
echo "🧪 Test your deployment:"
echo "curl https://your-app.railway.app/health"
echo ""
echo "📚 API Documentation:"
echo "https://your-app.railway.app/"
echo ""
echo "🔍 Monitor your deployment:"
echo "railway logs"
echo ""
echo "✨ Happy podcasting!"
