const cron = require('node-cron');
const logger = require('../utils/logger');
const GoogleSheetsService = require('./googleSheetsService');
const OpenAIService = require('./openaiService');
const { AppError } = require('../middleware/errorHandler');

class SchedulerService {
  constructor() {
    this.googleSheetsService = new GoogleSheetsService();
    this.openaiService = new OpenAIService();
    this.isRunning = false;
    this.lastRun = null;
    this.processedEpisodes = new Set();
  }

  async initialize() {
    try {
      await this.googleSheetsService.initialize();
      logger.info('Scheduler service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize scheduler service', { error: error.message });
      throw error;
    }
  }

  start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    // Run every day at 6 AM EST
    cron.schedule('0 6 * * *', async () => {
      await this.processUpcomingEpisodes();
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    // Also run immediately on startup
    this.processUpcomingEpisodes();

    this.isRunning = true;
    logger.info('Scheduler started - will run daily at 6 AM EST');
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('Scheduler is not running');
      return;
    }

    cron.getTasks().forEach(task => task.stop());
    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  async processUpcomingEpisodes() {
    if (this.isRunning && this.lastRun && Date.now() - this.lastRun < 60000) {
      logger.info('Skipping run - last run was less than 1 minute ago');
      return;
    }

    this.lastRun = Date.now();
    logger.info('Starting scheduled episode processing');

    try {
      // Get all episodes from Google Sheets
      const sheetData = await this.googleSheetsService.getCPTSDRecoveryData();
      
      if (!sheetData || !sheetData.episodes) {
        logger.warn('No episodes found in Google Sheets');
        return;
      }

      const upcomingEpisodes = this.filterUpcomingEpisodes(sheetData.episodes);
      logger.info(`Found ${upcomingEpisodes.length} upcoming episodes to process`);

      for (const episode of upcomingEpisodes) {
        try {
          await this.processEpisode(episode);
        } catch (error) {
          logger.error('Failed to process episode', { 
            topic: episode.topic, 
            error: error.message 
          });
          // Continue with next episode
        }
      }

      logger.info('Scheduled episode processing completed', { 
        processed: upcomingEpisodes.length 
      });

    } catch (error) {
      logger.error('Scheduled episode processing failed', { error: error.message });
    }
  }

  filterUpcomingEpisodes(episodes) {
    const now = new Date();
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(now.getMonth() + 2);

    return episodes.filter(episode => {
      // Skip if already processed
      if (this.processedEpisodes.has(episode.id)) {
        return false;
      }

      // Skip if already marked as processed in the sheet
      if (episode.processed) {
        return false;
      }

      // Check if episode has a date and it's within 2 months
      if (episode.date) {
        const episodeDate = new Date(episode.date);
        return episodeDate >= now && episodeDate <= twoMonthsFromNow;
      }

      // If no date, check if it's a high-demand topic that should be prioritized
      return episode.demand === 'High' && !episode.processed;
    });
  }

  async processEpisode(episode) {
    try {
      logger.info('Processing episode', { 
        topic: episode.topic, 
        type: episode.episodeType,
        date: episode.date,
        demand: episode.demand
      });

      // Determine episode type
      const episodeType = this.determineEpisodeType(episode);
      
      // Generate script
      let script;
      if (episodeType === 'friday') {
        script = await this.openaiService.generateFridayHealingScript(episode);
      } else {
        script = await this.openaiService.generateMainEpisodeScript(episode);
      }

      // Generate SEO content
      const seoTitle = await this.openaiService.generateSEOTitle(episode);
      const seoTags = await this.openaiService.generateSEOTags(episode);
      const episodeDescription = await this.openaiService.generateEpisodeDescription(episode, script.sections);

      // Store the generated content (you can add database storage here)
      const generatedContent = {
        episodeId: `ep_${Date.now()}_${episode.id}`,
        originalEpisode: episode,
        script,
        seo: {
          title: seoTitle,
          tags: seoTags
        },
        description: episodeDescription,
        generatedAt: new Date().toISOString(),
        status: 'generated'
      };

      // Mark as processed
      this.processedEpisodes.add(episode.id);
      
      // Update Google Sheets to mark as processed
      await this.googleSheetsService.markEpisodeAsProcessed(episode, generatedContent);

      logger.info('Episode processed successfully', { 
        topic: episode.topic, 
        episodeId: generatedContent.episodeId,
        episodeType: episodeType
      });

      return generatedContent;

    } catch (error) {
      logger.error('Failed to process episode', { 
        topic: episode.topic, 
        error: error.message 
      });
      throw error;
    }
  }

  determineEpisodeType(episode) {
    // Check if it's a Friday episode based on your sheet data
    if (episode.bonus === 'Friday' || episode.bonusName === 'Healing' || episode.bonusName === 'Boost') {
      return 'friday';
    }
    
    // Default to main episode
    return 'main';
  }

  // Manual trigger for testing
  async runOnce() {
    logger.info('Manual trigger - processing episodes once');
    await this.processUpcomingEpisodes();
  }

  // Get status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      processedCount: this.processedEpisodes.size,
      nextRun: this.getNextRunTime()
    };
  }

  getNextRunTime() {
    // Calculate next 6 AM EST
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(6, 0, 0, 0);
    
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun;
  }
}

module.exports = SchedulerService;
