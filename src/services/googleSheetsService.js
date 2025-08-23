const { google } = require('googleapis');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    this.tabName = process.env.GOOGLE_SHEETS_TAB_NAME || 'c-ptsd recovery';
    
    if (!this.spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID environment variable is required');
    }
  }

  async initialize() {
    try {
      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        },
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets.readonly',
          'https://www.googleapis.com/auth/spreadsheets'
        ]
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      // Test the connection
      await this.testConnection();
      
      logger.info('Google Sheets service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Sheets service', { error: error.message });
      throw new AppError('Failed to initialize Google Sheets service', 500);
    }
  }

  async testConnection() {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      return true;
    } catch (error) {
      logger.error('Google Sheets connection test failed', { error: error.message });
      throw new AppError('Google Sheets connection test failed', 500);
    }
  }

  async getSpreadsheetMetadata() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      return {
        title: response.data.properties.title,
        sheets: response.data.sheets.map(sheet => ({
          title: sheet.properties.title,
          sheetId: sheet.properties.sheetId
        }))
      };
    } catch (error) {
      logger.error('Failed to get spreadsheet metadata', { error: error.message });
      throw new AppError('Failed to get spreadsheet metadata', 500);
    }
  }

  async getCPTSDRecoveryData() {
    try {
      // Get the CPTSD Recovery tab data - read more columns to be safe
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.tabName}!A:Z`
      });

      if (!response.data.values || response.data.values.length === 0) {
        throw new AppError('No data found in CPTSD Recovery tab', 404);
      }

      const rows = response.data.values;
      const headers = rows[0];
      
      // Log the actual headers to understand the structure
      logger.info('Found headers in Google Sheets', { headers });
      
      // Find the relevant column indices - be more flexible with column names
      const columnMap = {
        category: this.findColumnIndex(headers, ['Category', 'category', 'CATEGORY']),
        podcastTitle: this.findColumnIndex(headers, ['Podcast Title', 'PodcastTitle', 'Title', 'Podcast']),
        topic: this.findColumnIndex(headers, ['Topic', 'topic', 'TOPIC', 'Subject']),
        demand: this.findColumnIndex(headers, ['Demand', 'demand', 'DEMAND', 'Priority']),
        supply: this.findColumnIndex(headers, ['Supply', 'supply', 'SUPPLY', 'Availability']),
        voice: this.findColumnIndex(headers, ['Voice', 'voice', 'VOICE', 'Style']),
        host: this.findColumnIndex(headers, ['Host', 'host', 'HOST', 'Presenter']),
        main: this.findColumnIndex(headers, ['Main', 'main', 'MAIN', 'Primary Day', 'Monday']),
        bonus: this.findColumnIndex(headers, ['Bonus', 'bonus', 'BONUS', 'Secondary Day', 'Friday']),
        bonusName: this.findColumnIndex(headers, ['bonus name', 'Bonus Name', 'BonusName', 'Secondary Type']),
        // Look for date columns - be flexible
        date: this.findColumnIndex(headers, ['Date', 'date', 'DATE', 'Episode Date', 'Publish Date', 'Air Date']),
        // Look for status columns
        status: this.findColumnIndex(headers, ['Status', 'status', 'STATUS', 'Created?', 'Processed', 'Script Generated', 'Done'])
      };

      // Log what we found
      logger.info('Column mapping found', { columnMap });

      // Filter for CPTSD Recovery rows and map the data
      const cptsdRows = rows.slice(1).filter(row => {
        const category = row[columnMap.category];
        const podcastTitle = row[columnMap.podcastTitle];
        
        // Be more flexible with the filtering
        const isMentalHealth = category && (
          category.toLowerCase().includes('mental health') || 
          category.toLowerCase().includes('mental-health') ||
          category.toLowerCase().includes('mentalhealth')
        );
        
        const isCPTSD = podcastTitle && (
          podcastTitle.toLowerCase().includes('c-ptsd') ||
          podcastTitle.toLowerCase().includes('cptsd') ||
          podcastTitle.toLowerCase().includes('ptsd recovery') ||
          podcastTitle.toLowerCase().includes('ptsd')
        );
        
        return isMentalHealth && isCPTSD;
      });

      if (cptsdRows.length === 0) {
        logger.warn('No CPTSD Recovery data found with current filters');
        // Try a broader search
        const broaderRows = rows.slice(1).filter(row => {
          const podcastTitle = row[columnMap.podcastTitle];
          return podcastTitle && podcastTitle.toLowerCase().includes('ptsd');
        });
        
        if (broaderRows.length > 0) {
          logger.info(`Found ${broaderRows.length} rows with broader search`);
          return broaderRows;
        }
        
        throw new AppError('No CPTSD Recovery data found even with broader search', 404);
      }

      const episodes = cptsdRows.map((row, index) => ({
        id: index + 1,
        category: row[columnMap.category] || '',
        podcastTitle: row[columnMap.podcastTitle] || '',
        topic: row[columnMap.topic] || '',
        demand: row[columnMap.demand] || '',
        supply: row[columnMap.supply] || '',
        voice: row[columnMap.voice] || '',
        host: row[columnMap.host] || '',
        main: row[columnMap.main] || '',
        bonus: row[columnMap.bonus] || '',
        bonusName: row[columnMap.bonusName] || '',
        date: this.parseDate(row[columnMap.date]),
        status: row[columnMap.status] || '',
        processed: this.isProcessed(row[columnMap.status]),
        rowIndex: index + 2, // +2 because we skip header row and arrays are 0-indexed
        rawData: row // Keep raw data for debugging
      }));

      logger.info(`Retrieved ${episodes.length} CPTSD Recovery episodes from Google Sheets`);
      
      return {
        totalEpisodes: episodes.length,
        episodes: episodes,
        columnMap: columnMap,
        headers: headers
      };
    } catch (error) {
      logger.error('Failed to get CPTSD Recovery data', { error: error.message });
      throw new AppError('Failed to get CPTSD Recovery data', 500);
    }
  }

  findColumnIndex(headers, possibleNames) {
    for (const name of possibleNames) {
      const index = headers.findIndex(h => h === name);
      if (index !== -1) {
        return index;
      }
    }
    return -1; // Not found
  }

  parseDate(dateString) {
    if (!dateString) return null;
    
    // Try to parse various date formats
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try to parse common formats
    const patterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
      /(\d{1,2})-(\d{1,2})-(\d{4})/,   // MM-DD-YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/    // YYYY-MM-DD
    ];
    
    for (const pattern of patterns) {
      const match = dateString.match(pattern);
      if (match) {
        if (pattern.source.includes('YYYY')) {
          return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        } else {
          return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
        }
      }
    }
    
    return null;
  }

  isProcessed(statusString) {
    if (!statusString) return false;
    
    const processedValues = ['yes', 'true', 'done', 'complete', 'finished', 'generated'];
    return processedValues.includes(statusString.toLowerCase());
  }

  async getUpcomingEpisodes(limit = 5) {
    try {
      const data = await this.getCPTSDRecoveryData();
      
      // Filter for upcoming episodes based on dates or priority
      const upcomingEpisodes = data.episodes
        .filter(ep => !ep.processed) // Not already processed
        .sort((a, b) => {
          // Sort by date if available, otherwise by demand
          if (a.date && b.date) {
            return a.date - b.date;
          }
          if (a.date) return -1;
          if (b.date) return 1;
          
          // Sort by demand (High first)
          const demandOrder = { 'High': 3, 'Moderate': 2, 'Low': 1 };
          return (demandOrder[b.demand] || 0) - (demandOrder[a.demand] || 0);
        })
        .slice(0, limit);
      
      return {
        total: upcomingEpisodes.length,
        episodes: upcomingEpisodes
      };
    } catch (error) {
      logger.error('Failed to get upcoming episodes', { error: error.message });
      throw new AppError('Failed to get upcoming episodes', 500);
    }
  }

  async getEpisodeByTopic(topic) {
    try {
      const data = await this.getCPTSDRecoveryData();
      
      const episode = data.episodes.find(ep => 
        ep.topic.toLowerCase().includes(topic.toLowerCase()) ||
        ep.podcastTitle.toLowerCase().includes(topic.toLowerCase())
      );
      
      if (!episode) {
        throw new AppError(`Episode with topic "${topic}" not found`, 404);
      }
      
      return episode;
    } catch (error) {
      logger.error('Failed to get episode by topic', { topic, error: error.message });
      throw new AppError('Failed to get episode by topic', 500);
    }
  }

  async searchEpisodes(query) {
    try {
      const data = await this.getCPTSDRecoveryData();
      
      const searchResults = data.episodes.filter(ep => 
        ep.topic.toLowerCase().includes(query.toLowerCase()) ||
        ep.podcastTitle.toLowerCase().includes(query.toLowerCase()) ||
        ep.category.toLowerCase().includes(query.toLowerCase())
      );
      
      return {
        query,
        totalResults: searchResults.length,
        episodes: searchResults
      };
    } catch (error) {
      logger.error('Failed to search episodes', { query, error: error.message });
      throw new AppError('Failed to search episodes', 500);
    }
  }

  async getEpisodeStatistics() {
    try {
      const data = await this.getCPTSDRecoveryData();
      
      const stats = {
        totalEpisodes: data.episodes.length,
        byDemand: {},
        bySupply: {},
        byCategory: {},
        byVoice: {},
        byStatus: {},
        processedCount: 0,
        unprocessedCount: 0
      };
      
      data.episodes.forEach(ep => {
        // Count by demand level
        stats.byDemand[ep.demand] = (stats.byDemand[ep.demand] || 0) + 1;
        
        // Count by supply level
        stats.bySupply[ep.supply] = (stats.bySupply[ep.supply] || 0) + 1;
        
        // Count by category
        stats.byCategory[ep.category] = (stats.byCategory[ep.category] || 0) + 1;
        
        // Count by voice
        stats.byVoice[ep.voice] = (stats.byVoice[ep.voice] || 0) + 1;
        
        // Count by status
        stats.byStatus[ep.status] = (stats.byStatus[ep.status] || 0) + 1;
        
        // Count processed vs unprocessed
        if (ep.processed) {
          stats.processedCount++;
        } else {
          stats.unprocessedCount++;
        }
      });
      
      return stats;
    } catch (error) {
      logger.error('Failed to get episode statistics', { error: error.message });
      throw new AppError('Failed to get episode statistics', 500);
    }
  }

  async markEpisodeAsProcessed(episode, generatedContent) {
    try {
      if (episode.rowIndex && episode.rowIndex > 0) {
        // Get the current column mapping to find the status column
        const data = await this.getCPTSDRecoveryData();
        const statusColumnIndex = data.columnMap?.status || -1;
        
        if (statusColumnIndex >= 0) {
          // Update the status column to mark as processed
          const range = `${this.tabName}!${this.getColumnLetter(statusColumnIndex)}${episode.rowIndex}`;
          
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: range,
            valueInputOption: 'RAW',
            resource: {
              values: [['Yes']]
            }
          });
          
          logger.info('Episode marked as processed in Google Sheets', { 
            episodeId: episode.id,
            rowIndex: episode.rowIndex,
            topic: episode.topic
          });
          
          return true;
        } else {
          logger.warn('No status column found to mark episode as processed', { episode });
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to mark episode as processed', { 
        episodeId: episode.id, 
        error: error.message 
      });
      return false;
    }
  }

  getColumnLetter(columnIndex) {
    if (columnIndex < 0) return 'A';
    
    let result = '';
    while (columnIndex >= 0) {
      result = String.fromCharCode(65 + (columnIndex % 26)) + result;
      columnIndex = Math.floor(columnIndex / 26) - 1;
    }
    return result;
  }
}

module.exports = GoogleSheetsService;
