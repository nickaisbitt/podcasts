const OpenAI = require('openai');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-4';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 4000;
    
    // CPTSD Podcast specific configuration
    this.podcastConfig = {
      hostName: process.env.PODCAST_HOST_NAME || 'Gregory',
      voiceStyle: process.env.PODCAST_VOICE_STYLE || 'Fabel',
      email: process.env.PODCAST_EMAIL || 'cptsd@senseofthisshit.com',
      supportersClubUrl: process.env.SUPPORTERS_CLUB_URL || 'https://www.spreaker.com/podcast/c-ptsd-let-s-make-sense-of-this-sh-t--6331440/support'
    };
  }

  async generateMainEpisodeScript(episodeData) {
    try {
      const prompt = this.buildMainEpisodePrompt(episodeData);
      
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt('main')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.7,
        top_p: 0.9
      });

      const script = response.choices[0].message.content;
      logger.info('Generated main episode script successfully', { 
        topic: episodeData.topic,
        tokenUsage: response.usage 
      });

      return this.parseScriptResponse(script, 'main');
    } catch (error) {
      logger.error('Failed to generate main episode script', { 
        topic: episodeData.topic, 
        error: error.message 
      });
      throw new AppError('Failed to generate main episode script', 500);
    }
  }

  async generateFridayHealingScript(episodeData) {
    try {
      const prompt = this.buildFridayHealingPrompt(episodeData);
      
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt('friday')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.7,
        top_p: 0.9
      });

      const script = response.choices[0].message.content;
      logger.info('Generated Friday healing script successfully', { 
        topic: episodeData.topic,
        tokenUsage: response.usage 
      });

      return this.parseScriptResponse(script, 'friday');
    } catch (error) {
      logger.error('Failed to generate Friday healing script', { 
        topic: episodeData.topic, 
        error: error.message 
      });
      throw new AppError('Failed to generate Friday healing script', 500);
    }
  }

  async generateSEOTitle(episodeData) {
    try {
      const prompt = `Generate an SEO-optimized podcast episode title for the following topic:

Topic: ${episodeData.topic}
Host: ${this.podcastConfig.hostName}
Style: CPTSD-focused, compassionate, authentic

Requirements:
- 60-70 characters exactly
- Include "CPTSD:" prefix
- Include the main topic
- Include a key benefit or outcome
- Use Gregory's warm, authentic voice
- Avoid clickbait, be genuine and helpful

Format: CPTSD: [Topic] - [Key Benefit]

Example: CPTSD: Healing Childhood Trauma - Finding Inner Peace

Generate the title:`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a podcast SEO expert. Generate concise, compelling episode titles that are exactly 60-70 characters.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.3
      });

      const title = response.choices[0].message.content.trim();
      logger.info('Generated SEO title successfully', { title, topic: episodeData.topic });

      return title;
    } catch (error) {
      logger.error('Failed to generate SEO title', { error: error.message });
      throw new AppError('Failed to generate SEO title', 500);
    }
  }

  async generateEpisodeDescription(episodeData, scriptSections) {
    try {
      const prompt = `Generate a compelling podcast episode description for the following CPTSD episode:

Topic: ${episodeData.topic}
Host: ${this.podcastConfig.hostName}
Style: CPTSD-focused, compassionate, authentic

Script Sections:
${scriptSections.map(section => `- ${section.name}: ${section.content.substring(0, 100)}...`).join('\n')}

Requirements:
- 80-120 words engaging introduction with **key terms in bold**
- Include 5 key takeaways
- Include 5 discoveries
- Include 3-5 resources mentioned
- Include next episode preview
- Include contact email and supporters club call-to-action
- Use Gregory's warm, authentic voice
- Be specific and actionable
- Include the supporters club URL: ${this.podcastConfig.supportersClubUrl}

Format exactly as shown in the template from the manual tool.`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a podcast marketing expert. Generate compelling episode descriptions that follow the exact format specified.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      const description = response.choices[0].message.content.trim();
      logger.info('Generated episode description successfully', { topic: episodeData.topic });

      return description;
    } catch (error) {
      logger.error('Failed to generate episode description', { error: error.message });
      throw new AppError('Failed to generate episode description', 500);
    }
  }

  async generateSEOTags(episodeData) {
    try {
      const prompt = `Generate 20 SEO-optimized tags for a CPTSD podcast episode about: ${episodeData.topic}

Requirements:
- Exactly 20 tags
- Include CPTSD, trauma, healing, mental health
- Be specific to the topic
- Use lowercase, comma-separated
- Include both broad and specific terms
- Focus on search terms people actually use

Format: tag1,tag2,tag3,tag4,tag5,tag6,tag7,tag8,tag9,tag10,tag11,tag12,tag13,tag14,tag15,tag16,tag17,tag18,tag19,tag20

Generate the tags:`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a podcast SEO expert. Generate exactly 20 relevant, searchable tags.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      const tags = response.choices[0].message.content.trim();
      logger.info('Generated SEO tags successfully', { tags, topic: episodeData.topic });

      return tags;
    } catch (error) {
      logger.error('Failed to generate SEO tags', { error: error.message });
      throw new AppError('Failed to generate SEO tags', 500);
    }
  }

  buildMainEpisodePrompt(episodeData) {
    return `Generate a complete CPTSD podcast script for the following episode:

EPISODE DETAILS:
- Topic: ${episodeData.topic}
- Host: ${this.podcastConfig.hostName} (${this.podcastConfig.voiceStyle} voice)
- Type: Main Podcast Episode
- Target: ~9,500 words total

REQUIREMENTS:
- Follow Gregory's warm, authentic, compassionate voice
- Include personal stories and vulnerability
- Provide scientific backing with accessible explanations
- Focus on community and shared experiences
- Include practical, actionable tools
- End with hope and connection

STRUCTURE (follow exactly):
1. Opening & Welcome (500 words) - Warm opening with episode preview
2. Topic Introduction (1000 words) - Personal story and topic setup
3. Deep Dive Part 1 (1200 words) - Core concepts and experiences
4. Research & Evidence (1500 words) - Studies, citations, scientific backing
5. Deep Dive Part 2 (1200 words) - Advanced concepts and nuances
6. Listener Stories (1500 words) - Community experiences and validation
7. Practical Tools Part 1 (1000 words) - Techniques and exercises
8. Practical Tools Part 2 (1000 words) - More tools and real-world application
9. Integration & Wrap-up (600 words) - Bringing it all together and closing

Generate the complete script with each section clearly labeled and the specified word count targets.`;
  }

  buildFridayHealingPrompt(episodeData) {
    return `Generate a complete CPTSD Friday Healing episode script for the following topic:

EPISODE DETAILS:
- Topic: ${episodeData.topic}
- Host: ${this.podcastConfig.hostName} (${this.podcastConfig.voiceStyle} voice)
- Type: Friday Healing Episode
- Target: ~3,200 words total

REQUIREMENTS:
- Follow Gregory's warm, authentic, compassionate voice
- Focus on hope, healing, and community support
- Be gentle and nurturing (Friday healing style)
- Include personal stories and vulnerability
- Provide practical healing techniques
- End with gentle wrap-up and next episode preview

STRUCTURE (follow exactly):
1. Opening & Welcome (400 words) - Warm Friday healing opening
2. Topic Exploration (800 words) - Core topic with personal stories
3. Research & Evidence (600 words) - Supporting studies and citations
4. Community Focus (700 words) - Listener stories and shared experiences
5. Practical Tools (400 words) - Healing techniques and exercises
6. Closing & Preview (300 words) - Gentle wrap-up and next episode preview

Generate the complete script with each section clearly labeled and the specified word count targets.`;
  }

  getSystemPrompt(episodeType) {
    const basePrompt = `You are ${this.podcastConfig.hostName}, the host of the CPTSD Recovery podcast "Let's Make Sense Of This Sh*t". 

Your voice is:
- Warm, authentic, and compassionate
- Knowledgeable about CPTSD, trauma, and mental health
- Personal and vulnerable, sharing your own experiences
- Community-focused, validating shared struggles
- Hopeful and encouraging, always ending with connection
- Accessible, making complex concepts understandable

You speak in a conversational, podcast-friendly style that feels like talking to a trusted friend.`;

    if (episodeType === 'main') {
      return basePrompt + `

For main episodes, you provide comprehensive coverage with:
- Deep dives into complex topics
- Scientific research and evidence
- Multiple practical tools and techniques
- Extended community stories and validation
- Integration of all concepts at the end`;
    } else {
      return basePrompt + `

For Friday healing episodes, you focus on:
- Gentle, nurturing energy
- Hope and healing
- Community support and connection
- Practical healing techniques
- Shorter, more focused content`;
    }
  }

  parseScriptResponse(script, episodeType) {
    try {
      const sections = episodeType === 'main' ? 
        [
          'Opening & Welcome',
          'Topic Introduction', 
          'Deep Dive Part 1',
          'Research & Evidence',
          'Deep Dive Part 2',
          'Listener Stories',
          'Practical Tools Part 1',
          'Practical Tools Part 2',
          'Integration & Wrap-up'
        ] : [
          'Opening & Welcome',
          'Topic Exploration',
          'Research & Evidence', 
          'Community Focus',
          'Practical Tools',
          'Closing & Preview'
        ];

      const parsedSections = [];
      let currentSection = null;
      let currentContent = '';

      const lines = script.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check if this line starts a new section
        const sectionMatch = sections.find(section => 
          trimmedLine.toLowerCase().includes(section.toLowerCase())
        );
        
        if (sectionMatch && !currentSection) {
          // Start new section
          currentSection = sectionMatch;
          currentContent = '';
        } else if (sectionMatch && currentSection) {
          // Save previous section and start new one
          parsedSections.push({
            name: currentSection,
            content: currentContent.trim(),
            wordCount: currentContent.trim().split(/\s+/).length
          });
          
          currentSection = sectionMatch;
          currentContent = '';
        } else if (currentSection) {
          // Add content to current section
          currentContent += line + '\n';
        }
      }
      
      // Add the last section
      if (currentSection) {
        parsedSections.push({
          name: currentSection,
          content: currentContent.trim(),
          wordCount: currentContent.trim().split(/\s+/).length
        });
      }

      // Calculate total word count
      const totalWords = parsedSections.reduce((sum, section) => sum + section.wordCount, 0);

      return {
        episodeType,
        sections: parsedSections,
        totalWords,
        fullScript: script,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to parse script response', { error: error.message });
      throw new AppError('Failed to parse script response', 500);
    }
  }

  async testConnection() {
    try {
      await this.openai.models.list();
      return true;
    } catch (error) {
      logger.error('OpenAI connection test failed', { error: error.message });
      throw new AppError('OpenAI connection test failed', 500);
    }
  }
}

module.exports = OpenAIService;
