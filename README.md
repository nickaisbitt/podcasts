# CPTSD Podcast Script Generator - Model 2.0.0

An automated, AI-powered podcast script generator for the CPTSD Recovery podcast "Let's Make Sense Of This Sh*t" hosted by Gregory. This application integrates with Google Sheets to fetch episode topics and generates complete, structured scripts using OpenAI's GPT-4.

## 🎯 Features

- **Automated Script Generation**: Generate complete podcast scripts in Gregory's authentic voice
- **Smart Google Sheets Integration**: Automatically detects your actual sheet structure and adapts
- **Dual Episode Types**: Support for both Main Podcast (~9,500 words) and Friday Healing (~3,200 words) episodes
- **AI-Powered Content**: Uses OpenAI GPT-4 to create compassionate, research-backed content
- **SEO Optimization**: Automatically generate episode titles, descriptions, and tags
- **Automatic Scheduling**: Runs daily at 6 AM EST to find episodes within next 2 months
- **Sheet Updates**: Automatically marks processed episodes in your Google Sheets
- **Production Ready**: Built with security, logging, and monitoring for production deployment

## 🏗️ Architecture

- **Node.js/Express**: Robust backend API with comprehensive error handling
- **Google Sheets API**: Integration with your CPTSD Recovery spreadsheet
- **OpenAI GPT-4**: AI-powered script generation following your exact rules
- **Production Security**: Rate limiting, CORS, helmet, and comprehensive logging
- **Railway Ready**: Optimized for easy deployment on Railway.app

## 📋 Prerequisites

Before setting up this application, you'll need:

1. **Google Cloud Project** with Google Sheets API enabled
2. **Google Service Account** with access to your spreadsheet
3. **OpenAI API Key** for GPT-4 access
4. **Railway Account** for deployment

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd cptsd-podcast-script-generator
npm install
```

### 2. Environment Setup

Copy the environment template and fill in your credentials:

```bash
cp env.example .env
```

Fill in your `.env` file with:

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

### 3. Google Sheets Setup

1. **Enable Google Sheets API** in your Google Cloud Console
2. **Create a Service Account** and download the JSON credentials
3. **Share your spreadsheet** with the service account email
4. **Copy the credentials** to your `.env` file

### 4. OpenAI Setup

1. **Get your API key** from [OpenAI Platform](https://platform.openai.com/)
2. **Add it to your `.env` file**

### 5. Test Locally

```bash
npm run dev
```

Visit `http://localhost:3000/health` to check if everything is working.

## 🚀 Railway Deployment

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login to Railway

```bash
railway login
```

### 3. Initialize Project

```bash
railway init
```

### 4. Set Environment Variables

```bash
railway variables set GOOGLE_SHEETS_SPREADSHEET_ID=11QiYGHX9hbtBpMMrF8e895t5xdGknLsF82CL6xDqUH8
railway variables set GOOGLE_SHEETS_TAB_NAME="CPTSD Recovery"
railway variables set GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
railway variables set GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----"
railway variables set OPENAI_API_KEY=your-openai-api-key-here
railway variables set PODCAST_HOST_NAME=Gregory
railway variables set PODCAST_VOICE_STYLE=Fabel
railway variables set PODCAST_EMAIL=cptsd@senseofthisshit.com
railway variables set SUPPORTERS_CLUB_URL=https://www.spreaker.com/podcast/c-ptsd-let-s-make-sense-of-this-sh-t--6331440/support
```

### 5. Deploy

```bash
railway up
```

## 📚 API Endpoints

### Health & Status
- `GET /health` - Basic health check
- `GET /api/health/detailed` - Detailed health with dependency status
- `GET /api/health/ready` - Readiness probe for Railway
- `GET /api/health/live` - Liveness probe

### Script Generation
- `POST /api/scripts/generate` - Generate script from topic
- `POST /api/scripts/generate/from-sheets` - Generate from Google Sheets episode
- `POST /api/scripts/generate/batch` - Generate multiple scripts
- `GET /api/scripts/templates` - Get script structure templates

### Episode Management
- `GET /api/scripts/episodes` - Get all episodes from Google Sheets
- `GET /api/scripts/episodes/upcoming` - Get upcoming episodes
- `GET /api/scripts/episodes/:topic` - Get episode by topic
- `GET /api/scripts/statistics` - Get episode statistics

## 🔧 Usage Examples

### Generate a Main Episode Script

```bash
curl -X POST https://your-app.railway.app/api/scripts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Healing Childhood Trauma",
    "episodeType": "main",
    "includeSEO": true,
    "includeDescription": true
  }'
```

### Generate from Google Sheets

```bash
curl -X POST https://your-app.railway.app/api/scripts/generate/from-sheets \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Anxiety Management"
  }'
```

### Get Upcoming Episodes

```bash
curl https://your-app.railway.app/api/scripts/episodes/upcoming?limit=5
```

## 🎭 Script Structure

### Main Podcast Episode (~9,500 words)
1. **Opening & Welcome** (500 words) - Warm opening with episode preview
2. **Topic Introduction** (1,000 words) - Personal story and topic setup
3. **Deep Dive Part 1** (1,200 words) - Core concepts and experiences
4. **Research & Evidence** (1,500 words) - Studies, citations, scientific backing
5. **Deep Dive Part 2** (1,200 words) - Advanced concepts and nuances
6. **Listener Stories** (1,500 words) - Community experiences and validation
7. **Practical Tools Part 1** (1,000 words) - Techniques and exercises
8. **Practical Tools Part 2** (1,000 words) - More tools and real-world application
9. **Integration & Wrap-up** (600 words) - Bringing it all together and closing

### Friday Healing Episode (~3,200 words)
1. **Opening & Welcome** (400 words) - Warm Friday healing opening
2. **Topic Exploration** (800 words) - Core topic with personal stories
3. **Research & Evidence** (600 words) - Supporting studies and citations
4. **Community Focus** (700 words) - Listener stories and shared experiences
5. **Practical Tools** (400 words) - Healing techniques and exercises
6. **Closing & Preview** (300 words) - Gentle wrap-up and next episode preview

## 🎨 Voice & Style

The AI generates content in **Gregory's authentic voice**:
- **Warm and compassionate** - Like talking to a trusted friend
- **Personal and vulnerable** - Sharing real experiences and stories
- **Knowledgeable and accessible** - Making complex concepts understandable
- **Community-focused** - Validating shared struggles and experiences
- **Hopeful and encouraging** - Always ending with connection and hope

## 🔒 Security Features

- **Rate Limiting** - Prevents abuse and ensures fair usage
- **CORS Protection** - Secure cross-origin requests
- **Helmet Security** - Comprehensive security headers
- **Input Validation** - Joi schema validation for all inputs
- **Error Handling** - Secure error responses without exposing internals
- **Logging** - Comprehensive audit trail for all operations

## 📊 Monitoring & Logging

- **Health Checks** - Real-time service status monitoring
- **Structured Logging** - Winston-based logging with multiple levels
- **Performance Metrics** - Response times and error rates
- **Dependency Monitoring** - Google Sheets and OpenAI API status

## 🚨 Troubleshooting

### Common Issues

1. **Google Sheets Access Denied**
   - Ensure service account has access to the spreadsheet
   - Check that the spreadsheet ID is correct

2. **OpenAI API Errors**
   - Verify your API key is valid
   - Check your OpenAI account has sufficient credits

3. **Environment Variables**
   - Ensure all required variables are set in Railway
   - Check for typos in variable names

### Debug Mode

Set `NODE_ENV=development` in Railway to get detailed error messages and logs.

## 🤝 Contributing

This application is specifically designed for the CPTSD Recovery podcast. If you have suggestions for improvements or encounter issues, please reach out to the development team.

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **Gregory** - For his authentic voice and compassionate approach to CPTSD recovery
- **CPTSD Community** - For their ongoing support and feedback
- **OpenAI** - For providing the AI capabilities that make this automation possible

---

**Ready to automate your podcast script generation? Deploy this to Railway and start creating high-quality CPTSD content automatically! 🚀**
