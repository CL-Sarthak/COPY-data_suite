import { NextRequest, NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';
import { KeywordGenerationService } from '@/services/keywordGenerationService';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { dataSourceId, type } = body;
    
    if (dataSourceId) {
      // Regenerate keywords for specific data source
      const dataSource = await DataSourceService.getDataSourceById(dataSourceId);
      if (!dataSource) {
        return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
      }
      
      await KeywordGenerationService.generateKeywords(dataSourceId);
      
      return NextResponse.json({ 
        success: true, 
        message: `Regenerated keywords for ${dataSource.name}` 
      });
    } else {
      // Regenerate keywords for all data sources of a specific type or all
      const dataSources = await DataSourceService.getAllDataSources();
      let processedCount = 0;
      let targetSources = dataSources;
      
      // Filter by type if specified
      if (type) {
        targetSources = dataSources.filter(ds => ds.type === type);
        logger.info(`Regenerating keywords for ${targetSources.length} ${type} sources`);
      } else {
        logger.info(`Regenerating keywords for all ${targetSources.length} data sources`);
      }
      
      for (const ds of targetSources) {
        try {
          await KeywordGenerationService.generateKeywords(ds.id);
          processedCount++;
          logger.info(`Generated keywords for ${ds.name} (${ds.type})`);
        } catch (error) {
          logger.error(`Failed to generate keywords for ${ds.name}:`, error);
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `Regenerated keywords for ${processedCount} data sources` 
      });
    }
  } catch (error) {
    logger.error('Failed to regenerate keywords:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate keywords' },
      { status: 500 }
    );
  }
}