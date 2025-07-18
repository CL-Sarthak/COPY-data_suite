import { DataSourceService } from './dataSourceService';
import { logger } from '@/utils/logger';
import { getDatabase } from '@/database/connection';
import { DataSourceEntity } from '@/entities/DataSourceEntity';

interface KeywordAnalysis {
  keywords: string[];
  categories: string[];
  domain: string;
}

export class KeywordGenerationService {
  /**
   * Generate keywords for a data source based on its content and metadata
   */
  static async generateKeywords(dataSourceId: string): Promise<KeywordAnalysis | null> {
    try {
      const dataSource = await DataSourceService.getDataSourceById(dataSourceId);
      if (!dataSource) {
        logger.error(`Data source not found: ${dataSourceId}`);
        return null;
      }

      // Gather context for keyword generation
      const context = await this.gatherDataSourceContext({
        id: dataSource.id,
        name: dataSource.name,
        type: dataSource.type,
        aiSummary: dataSource.aiSummary,
        userSummary: dataSource.userSummary,
        transformedData: dataSource.transformedData,
        configuration: JSON.stringify(dataSource.configuration),
        metadata: dataSource.metadata ? JSON.stringify(dataSource.metadata) : undefined
      });
      
      // Generate keywords using LLM
      const analysis = await this.callLLMForKeywords(context);
      
      // Save keywords to database
      if (analysis) {
        await this.saveKeywords(dataSourceId, analysis);
      }
      
      return analysis;
    } catch (error) {
      logger.error('Failed to generate keywords:', error);
      return null;
    }
  }

  /**
   * Gather context about the data source for keyword generation
   */
  private static async gatherDataSourceContext(dataSource: {
    id: string;
    name: string;
    type: string;
    aiSummary?: string;
    userSummary?: string;
    transformedData?: string;
    configuration?: string;
    metadata?: string;
  }): Promise<string> {
    const contextParts: string[] = [];
    
    // Basic info
    contextParts.push(`Data Source: ${dataSource.name}`);
    contextParts.push(`Type: ${dataSource.type}`);
    
    // Summary if available
    if (dataSource.aiSummary || dataSource.userSummary) {
      contextParts.push(`Summary: ${dataSource.userSummary || dataSource.aiSummary}`);
    }
    
    // Get table information
    try {
      const db = await getDatabase();
      const tables = await db.getRepository('DataSourceTableEntity')
        .find({ where: { dataSourceId: dataSource.id } });
      
      if (tables.length > 0) {
        contextParts.push(`\nTables (${tables.length}):`);
        for (const table of tables) {
          contextParts.push(`- ${table.tableName}`);
          
          // Include column names if available
          if (table.metadata?.columns) {
            const columnNames = table.metadata.columns
              .slice(0, 10)
              .map((c: { name: string }) => c.name)
              .join(', ');
            contextParts.push(`  Columns: ${columnNames}${table.metadata.columns.length > 10 ? '...' : ''}`);
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to get table information:', error);
    }
    
    // Sample data if available
    if (dataSource.transformedData) {
      try {
        const transformedData = JSON.parse(dataSource.transformedData);
        if (transformedData.records && transformedData.records.length > 0) {
          // Extract first few records
          const sampleRecords = transformedData.records.slice(0, 3);
          contextParts.push('\nSample data:');
          
          for (let i = 0; i < sampleRecords.length; i++) {
            const record = sampleRecords[i].data || sampleRecords[i];
            const fields = Object.keys(record).slice(0, 5);
            contextParts.push(`Record ${i + 1}: ${fields.join(', ')}${Object.keys(record).length > 5 ? '...' : ''}`);
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }
    
    // For database sources, check configuration data
    if (dataSource.type === 'database' && dataSource.configuration) {
      try {
        const config = JSON.parse(dataSource.configuration);
        if (config.data && Array.isArray(config.data) && config.data.length > 0) {
          contextParts.push('\nDatabase sample data:');
          const sampleRecords = config.data.slice(0, 3);
          
          for (let i = 0; i < sampleRecords.length; i++) {
            const record = sampleRecords[i];
            const fields = Object.keys(record).slice(0, 10);
            contextParts.push(`Record ${i + 1} fields: ${fields.join(', ')}${Object.keys(record).length > 10 ? '...' : ''}`);
            
            // Include some sample values to help detect PII
            const sampleValues: string[] = [];
            fields.forEach(field => {
              const value = record[field];
              if (value && typeof value === 'string' && value.length < 50) {
                sampleValues.push(`${field}="${value}"`);
              }
            });
            if (sampleValues.length > 0) {
              contextParts.push(`  Sample values: ${sampleValues.slice(0, 3).join(', ')}`);
            }
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }
    
    return contextParts.join('\n');
  }

  /**
   * Call LLM to analyze data source and generate keywords
   */
  private static async callLLMForKeywords(context: string): Promise<KeywordAnalysis | null> {
    const systemPrompt = `You are a data analysis expert. Analyze the provided data source information and generate keywords for query routing.

Generate:
1. Keywords: 10-20 specific terms that would indicate this data source is relevant for a query
2. Categories: 3-5 high-level categories (e.g., "financial", "customer", "medical", "sales")
3. Domain: Single primary domain (e.g., "finance", "healthcare", "e-commerce", "hr")

Consider:
- Field names and their meaning
- Data patterns and content
- Business context
- Common query terms users might use

Respond with JSON only:
{
  "keywords": ["keyword1", "keyword2", ...],
  "categories": ["category1", "category2", ...],
  "domain": "primary_domain"
}`;

    const userPrompt = `Analyze this data source and generate keywords:\n\n${context}`;

    try {
      // Check for API key
      if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        // Generate mock keywords based on data source name
        return this.generateMockKeywords(context);
      }

      // Call appropriate LLM API
      if (process.env.OPENAI_API_KEY) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 500
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        return result as KeywordAnalysis;
      }

      if (process.env.ANTHROPIC_API_KEY) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307', // Use smaller model for keyword generation
            max_tokens: 500,
            temperature: 0.3,
            messages: [
              { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`Anthropic API error: ${response.statusText}`);
        }

        const data = await response.json();
        const result = JSON.parse(data.content[0].text);
        return result as KeywordAnalysis;
      }

      return this.generateMockKeywords(context);
    } catch (error) {
      logger.error('Failed to call LLM for keyword generation:', error);
      return this.generateMockKeywords(context);
    }
  }

  /**
   * Generate mock keywords for development/testing
   */
  private static generateMockKeywords(context: string): KeywordAnalysis {
    // Keep it generic
    const domain = 'general';
    const categories: string[] = ['data'];
    const keywords: string[] = [];
    
    // Extract keywords from field names in context
    const fieldMatch = context.match(/Columns: ([^\n]+)/);
    if (fieldMatch) {
      const fields = fieldMatch[1].split(',').map(f => f.trim());
      keywords.push(...fields.filter(f => f.length > 2));
    }
    
    // Extract from data source name
    const nameMatch = context.match(/Data Source: ([^\n]+)/);
    if (nameMatch) {
      const nameParts = nameMatch[1].toLowerCase().split(/[\s_-]+/);
      keywords.push(...nameParts.filter(p => p.length > 3));
    }
    
    // Ensure uniqueness
    const uniqueKeywords = [...new Set(keywords)];
    
    return {
      keywords: uniqueKeywords.slice(0, 20),
      categories: categories.length > 0 ? categories : ['data', 'general'],
      domain
    };
  }

  /**
   * Save keywords to the database
   */
  private static async saveKeywords(dataSourceId: string, analysis: KeywordAnalysis): Promise<void> {
    try {
      const db = await getDatabase();
      const repository = db.getRepository(DataSourceEntity);
      
      await repository.update(dataSourceId, {
        aiKeywords: JSON.stringify(analysis.keywords),
        keywordsGeneratedAt: new Date()
      });
      
      logger.info(`Saved keywords for data source ${dataSourceId}:`, analysis);
    } catch (error) {
      logger.error('Failed to save keywords:', error);
    }
  }

  /**
   * Get data sources relevant to a query based on keywords
   */
  static async getRelevantDataSources(query: string): Promise<string[]> {
    try {
      const db = await getDatabase();
      const repository = db.getRepository(DataSourceEntity);
      
      // Get all data sources with keywords
      const dataSources = await repository.find({
        where: { aiKeywords: Not(IsNull()) }
      });
      
      // Extract query terms
      const queryLower = query.toLowerCase();
      const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 2);
      
      // Score each data source
      const scores: { id: string; score: number }[] = [];
      
      for (const ds of dataSources) {
        if (!ds.aiKeywords) continue;
        
        try {
          const keywords = JSON.parse(ds.aiKeywords) as string[];
          let score = 0;
          
          // Check keyword matches
          for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            
            // Exact match
            if (queryTerms.includes(keywordLower)) {
              score += 10;
            }
            // Partial match
            else if (queryTerms.some(term => keywordLower.includes(term) || term.includes(keywordLower))) {
              score += 5;
            }
          }
          
          // Check name match
          const nameLower = ds.name.toLowerCase();
          if (queryTerms.some(term => nameLower.includes(term))) {
            score += 8;
          }
          
          if (score > 0) {
            scores.push({ id: ds.id, score });
          }
        } catch {
          // Ignore JSON parsing errors
        }
      }
      
      // Sort by score and return top matches
      scores.sort((a, b) => b.score - a.score);
      const relevantIds = scores.slice(0, 3).map(s => s.id);
      
      logger.info(`Query "${query}" matched ${relevantIds.length} data sources`);
      return relevantIds;
    } catch (error) {
      logger.error('Failed to get relevant data sources:', error);
      return [];
    }
  }
}

// Import TypeORM operators
import { IsNull, Not } from 'typeorm';