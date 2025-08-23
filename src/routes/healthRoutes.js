const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Basic health check
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});

// Detailed health check with dependency status
router.get('/detailed', asyncHandler(async (req, res) => {
  const healthChecks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    dependencies: {}
  };

  // Check OpenAI API
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Simple API test
    await openai.models.list();
    healthChecks.dependencies.openai = { status: 'healthy', message: 'API accessible' };
  } catch (error) {
    healthChecks.dependencies.openai = { 
      status: 'unhealthy', 
      message: error.message,
      error: error.code || 'unknown'
    };
    healthChecks.status = 'degraded';
  }

  // Check Google Sheets API
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID
    });
    
    healthChecks.dependencies.googleSheets = { status: 'healthy', message: 'API accessible' };
  } catch (error) {
    healthChecks.dependencies.googleSheets = { 
      status: 'unhealthy', 
      message: error.message,
      error: error.code || 'unknown'
    };
    healthChecks.status = 'degraded';
  }

  // Check environment variables
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'GOOGLE_SHEETS_SPREADSHEET_ID',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_PRIVATE_KEY'
  ];

  healthChecks.dependencies.environment = {
    status: 'healthy',
    missing: []
  };

  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      healthChecks.dependencies.environment.missing.push(envVar);
      healthChecks.dependencies.environment.status = 'unhealthy';
      healthChecks.status = 'degraded';
    }
  });

  if (healthChecks.dependencies.environment.missing.length === 0) {
    healthChecks.dependencies.environment.message = 'All required environment variables are set';
  } else {
    healthChecks.dependencies.environment.message = `Missing: ${healthChecks.dependencies.environment.missing.join(', ')}`;
  }

  // Set appropriate HTTP status
  const statusCode = healthChecks.status === 'healthy' ? 200 : 
                    healthChecks.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(healthChecks);
}));

// Readiness probe for Kubernetes/Railway
router.get('/ready', (req, res) => {
  // Check if all critical dependencies are available
  const isReady = process.env.OPENAI_API_KEY && 
                  process.env.GOOGLE_SHEETS_SPREADSHEET_ID &&
                  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
                  process.env.GOOGLE_PRIVATE_KEY;

  if (isReady) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      message: 'Application is not ready to serve requests'
    });
  }
});

// Liveness probe
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
