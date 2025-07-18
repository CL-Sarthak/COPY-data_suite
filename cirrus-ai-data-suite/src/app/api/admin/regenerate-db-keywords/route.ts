import { NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';
import { KeywordGenerationService } from '@/services/keywordGenerationService';
import { logger } from '@/utils/logger';

export async function POST() {
  try {
    // Get all database data sources
    const allDataSources = await DataSourceService.getAllDataSources();
    const databaseSources = allDataSources.filter(ds => ds.type === 'database');
    
    logger.info(`Found ${databaseSources.length} database sources to regenerate keywords for`);
    
    const results = [];
    
    for (const ds of databaseSources) {
      try {
        logger.info(`Regenerating keywords for database: ${ds.name}`);
        
        const keywords = await KeywordGenerationService.generateKeywords(ds.id);
        
        results.push({
          id: ds.id,
          name: ds.name,
          success: true,
          keywords: keywords?.keywords || [],
          hadKeywordsBefore: !!ds.aiKeywords
        });
        
        logger.info(`Successfully generated keywords for ${ds.name}: ${keywords?.keywords.join(', ')}`);
      } catch (error) {
        logger.error(`Failed to generate keywords for ${ds.name}:`, error);
        results.push({
          id: ds.id,
          name: ds.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          hadKeywordsBefore: !!ds.aiKeywords
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      totalDatabases: databaseSources.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (error) {
    logger.error('Failed to regenerate database keywords:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate keywords' },
      { status: 500 }
    );
  }
}