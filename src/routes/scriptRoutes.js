const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const GoogleSheetsService = require('../services/googleSheetsService');
const OpenAIService = require('../services/openaiService');
const SchedulerService = require('../services/schedulerService');

// Initialize services
const googleSheetsService = new GoogleSheetsService();
const openaiService = new OpenAIService();
const schedulerService = new SchedulerService();

// Validation schemas
const generateScriptSchema = Joi.object({
  topic: Joi.string().required().min(3).max(200),
  episodeType: Joi.string().valid('main', 'friday').required(),
  includeSEO: Joi.boolean().default(true),
  includeDescription: Joi.boolean().default(true)
});

const episodeTopicSchema = Joi.object({
  topic: Joi.string().required().min(3).max(200)
});

// Initialize services on startup
(async () => {
  try {
    await googleSheetsService.initialize();
    await schedulerService.initialize();
    logger.info('Services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services', { error: error.message });
  }
})();

// GET /api/scripts/health - Check script generation service health
router.get('/health', asyncHandler(async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {}
  };

  // Check Google Sheets service
  try {
    await googleSheetsService.testConnection();
    healthStatus.services.googleSheets = { status: 'healthy' };
  } catch (error) {
    healthStatus.services.googleSheets = { 
      status: 'unhealthy', 
      error: error.message 
    };
    healthStatus.status = 'degraded';
  }

  // Check OpenAI service
  try {
    await openaiService.testConnection();
    healthStatus.services.openai = { status: 'healthy' };
  } catch (error) {
    healthStatus.services.openai = { 
      status: 'unhealthy', 
      error: error.message 
    };
    healthStatus.status = 'degraded';
  }

  const statusCode = healthStatus.status === 'healthy' ? 200 : 200;
  res.status(statusCode).json(healthStatus);
}));

// GET /api/scripts/episodes - Get all episodes from Google Sheets
router.get('/episodes', asyncHandler(async (req, res) => {
  const { limit = 50, search } = req.query;
  
  let episodes;
  if (search) {
    episodes = await googleSheetsService.searchEpisodes(search);
  } else {
    episodes = await googleSheetsService.getCPTSDRecoveryData();
  }

  res.json({
    success: true,
    data: episodes
  });
}));

// GET /api/scripts/episodes/upcoming - Get upcoming episodes
router.get('/episodes/upcoming', asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;
  const upcomingEpisodes = await googleSheetsService.getUpcomingEpisodes(parseInt(limit));
  
  res.json({
    success: true,
    data: upcomingEpisodes
  });
}));

// GET /api/scripts/episodes/:topic - Get episode by topic
router.get('/episodes/:topic', asyncHandler(async (req, res) => {
  const { topic } = req.params;
  const episode = await googleSheetsService.getEpisodeByTopic(topic);
  
  res.json({
    success: true,
    data: episode
  });
}));

// GET /api/scripts/statistics - Get episode statistics
router.get('/statistics', asyncHandler(async (req, res) => {
  const stats = await googleSheetsService.getEpisodeStatistics();
  
  res.json({
    success: true,
    data: stats
  }));
}));

// GET /api/scripts/sheet-structure - Get the actual structure of your Google Sheets
router.get('/sheet-structure', asyncHandler(async (req, res) => {
  const data = await googleSheetsService.getCPTSDRecoveryData();
  
  res.json({
    success: true,
    data: {
      headers: data.headers,
      columnMap: data.columnMap,
      sampleEpisode: data.episodes[0] || null,
      totalEpisodes: data.totalEpisodes
    }
  }));
}));

// POST /api/scripts/generate - Generate a complete podcast script
router.post('/generate', asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = generateScriptSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        details: error.details.map(d => d.message)
      }
    });
  }

  const { topic, episodeType, includeSEO, includeDescription } = value;

  logger.info('Starting script generation', { topic, episodeType, includeSEO, includeDescription });

  // Generate the main script
  let script;
  if (episodeType === 'main') {
    script = await openaiService.generateMainEpisodeScript({ topic });
  } else {
    script = await openaiService.generateFridayHealingScript({ topic });
  }

  // Generate SEO title if requested
  let seoTitle = null;
  if (includeSEO) {
    seoTitle = await openaiService.generateSEOTitle({ topic });
  }

  // Generate SEO tags if requested
  let seoTags = null;
  if (includeSEO) {
    seoTags = await openaiService.generateSEOTags({ topic });
  }

  // Generate episode description if requested
  let episodeDescription = null;
  if (includeDescription) {
    episodeDescription = await openaiService.generateEpisodeDescription({ topic }, script.sections);
  }

  const response = {
    success: true,
    data: {
      topic,
      episodeType,
      script,
      seo: includeSEO ? {
        title: seoTitle,
        tags: seoTags
      } : null,
      description: episodeDescription,
      generatedAt: new Date().toISOString()
    }
  };

  logger.info('Script generation completed successfully', { 
    topic, 
    episodeType, 
    totalWords: script.totalWords 
  });

  res.json(response);
}));

// POST /api/scripts/generate/from-sheets - Generate script from Google Sheets episode
router.post('/generate/from-sheets', asyncHandler(async (req, res) => {
  const { error, value } = episodeTopicSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        details: error.details.map(d => d.message)
      }
    });
  }

  const { topic } = value;

  // Get episode data from Google Sheets
  const episodeData = await googleSheetsService.getEpisodeByTopic(topic);
  
  // Determine episode type based on Google Sheets data
  const episodeType = episodeData.bonus === 'Friday' ? 'friday' : 'main';

  logger.info('Generating script from Google Sheets episode', { 
    topic, 
    episodeType, 
    episodeData 
  });

  // Generate the script
  let script;
  if (episodeType === 'main') {
    script = await openaiService.generateMainEpisodeScript(episodeData);
  } else {
    script = await openaiService.generateFridayHealingScript(episodeData);
  }

  // Generate SEO and description
  const seoTitle = await openaiService.generateSEOTitle(episodeData);
  const seoTags = await openaiService.generateSEOTags(episodeData);
  const episodeDescription = await openaiService.generateEpisodeDescription(episodeData, script.sections);

  const response = {
    success: true,
    data: {
      episodeData,
      episodeType,
      script,
      seo: {
        title: seoTitle,
        tags: seoTags
      },
      description: episodeDescription,
      generatedAt: new Date().toISOString()
    }
  };

  logger.info('Script generation from Google Sheets completed successfully', { 
    topic, 
    episodeType, 
    totalWords: script.totalWords 
  });

  res.json(response);
}));

// POST /api/scripts/generate/batch - Generate multiple scripts
router.post('/generate/batch', asyncHandler(async (req, res) => {
  const { episodes, includeSEO = true, includeDescription = true } = req.body;

  if (!Array.isArray(episodes) || episodes.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Episodes array is required and must not be empty'
      }
    });
  }

  if (episodes.length > 5) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Maximum 5 episodes can be generated in a single batch'
      }
    });
  }

  logger.info('Starting batch script generation', { count: episodes.length });

  const results = [];
  const errors = [];

  for (const episode of episodes) {
    try {
      const { topic, episodeType } = episode;
      
      // Generate script
      let script;
      if (episodeType === 'main') {
        script = await openaiService.generateMainEpisodeScript({ topic });
      } else {
        script = await openaiService.generateFridayHealingScript({ topic });
      }

      // Generate additional content if requested
      let seoTitle = null, seoTags = null, episodeDescription = null;
      
      if (includeSEO) {
        seoTitle = await openaiService.generateSEOTitle({ topic });
        seoTags = await openaiService.generateSEOTags({ topic });
      }
      
      if (includeDescription) {
        episodeDescription = await openaiService.generateEpisodeDescription({ topic }, script.sections);
      }

      results.push({
        topic,
        episodeType,
        script,
        seo: includeSEO ? { title: seoTitle, tags: seoTags } : null,
        description: episodeDescription,
        generatedAt: new Date().toISOString()
      });

      logger.info('Batch script generation progress', { 
        topic, 
        completed: results.length, 
        total: episodes.length 
      });

    } catch (error) {
      logger.error('Failed to generate script in batch', { 
        topic: episode.topic, 
        error: error.message 
      });
      
      errors.push({
        topic: episode.topic,
        error: error.message
      });
    }
  }

  const response = {
    success: true,
    data: {
      totalRequested: episodes.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : null
    }
  };

  logger.info('Batch script generation completed', { 
    successful: results.length, 
    failed: errors.length 
  });

  res.json(response);
}));

// GET /api/scripts/templates - Get script templates and structure
router.get('/templates', (req, res) => {
  const templates = {
    main: {
      name: 'Main Podcast Episode',
      targetWords: 9500,
      sections: [
        { name: 'Opening & Welcome', target: 500, description: 'Warm opening with episode preview' },
        { name: 'Topic Introduction', target: 1000, description: 'Personal story and topic setup' },
        { name: 'Deep Dive Part 1', target: 1200, description: 'Core concepts and experiences' },
        { name: 'Research & Evidence', target: 1500, description: 'Studies, citations, and scientific backing' },
        { name: 'Deep Dive Part 2', target: 1200, description: 'Advanced concepts and nuances' },
        { name: 'Listener Stories', target: 1500, description: 'Community experiences and validation' },
        { name: 'Practical Tools Part 1', target: 1000, description: 'Techniques and exercises' },
        { name: 'Practical Tools Part 2', target: 1000, description: 'More tools and real-world application' },
        { name: 'Integration & Wrap-up', target: 600, description: 'Bringing it all together and closing' }
      ]
    },
    friday: {
      name: 'Friday Healing Episode',
      targetWords: 3200,
      sections: [
        { name: 'Opening & Welcome', target: 400, description: 'Warm Friday healing opening' },
        { name: 'Topic Exploration', target: 800, description: 'Core topic with personal stories' },
        { name: 'Research & Evidence', target: 600, description: 'Supporting studies and citations' },
        { name: 'Community Focus', target: 700, description: 'Listener stories and shared experiences' },
        { name: 'Practical Tools', target: 400, description: 'Healing techniques and exercises' },
        { name: 'Closing & Preview', target: 300, description: 'Gentle wrap-up and next episode preview' }
      ]
    }
  };

  res.json({
    success: true,
    data: templates
  });
}));

// Scheduler control routes
router.get('/scheduler/status', (req, res) => {
  const status = schedulerService.getStatus();
  res.json({
    success: true,
    data: status
  });
});

router.post('/scheduler/run-once', asyncHandler(async (req, res) => {
  await schedulerService.runOnce();
  res.json({
    success: true,
    message: 'Scheduler run-once completed',
    data: schedulerService.getStatus()
  });
}));

router.post('/scheduler/start', (req, res) => {
  schedulerService.start();
  res.json({
    success: true,
    message: 'Scheduler started',
    data: schedulerService.getStatus()
  });
});

router.post('/scheduler/stop', (req, res) => {
  schedulerService.stop();
  res.json({
    success: true,
    message: 'Scheduler stopped',
    data: schedulerService.getStatus()
  });
});

module.exports = router;
