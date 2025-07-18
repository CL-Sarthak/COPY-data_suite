import { NextRequest, NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';
import { getDatabase } from '@/database/connection';
import { logger } from '@/utils/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    
    logger.info(`Checking data source: ${id}`);
    
    // Get the data source
    const dataSource = await DataSourceService.getDataSourceById(id);
    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }
    
    // Check configuration
    const config = typeof dataSource.configuration === 'string' 
      ? JSON.parse(dataSource.configuration)
      : dataSource.configuration;
    let totalContentSize = 0;
    let fileInfo = [];
    
    if (config.files && Array.isArray(config.files)) {
      fileInfo = config.files.map((file: { name: string; type: string; size: number; content?: string; storageKey?: string }) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        hasContent: !!file.content,
        contentLength: file.content?.length || 0,
        hasStorageKey: !!file.storageKey,
        storageKey: file.storageKey
      }));
      
      totalContentSize = config.files.reduce((sum: number, file: { content?: string }) => 
        sum + (file.content?.length || 0), 0
      );
    }
    
    // Check transformed data
    const transformedInfo = {
      hasTransformedData: false,
      transformedDataSize: 0,
      recordCount: 0,
      error: null as string | null
    };
    
    if (dataSource.transformedData) {
      transformedInfo.hasTransformedData = true;
      transformedInfo.transformedDataSize = dataSource.transformedData.length;
      
      try {
        const parsed = JSON.parse(dataSource.transformedData);
        transformedInfo.recordCount = parsed.totalRecords || parsed.records?.length || 0;
      } catch {
        transformedInfo.error = 'Failed to parse transformed data';
      }
    }
    
    // Check storage keys
    const storageInfo = {
      hasStorageKeys: false,
      storageKeyCount: 0,
      storageProvider: dataSource.storageProvider
    };
    
    if ('storageKeys' in dataSource && dataSource.storageKeys) {
      try {
        const keys = JSON.parse(dataSource.storageKeys as string);
        storageInfo.hasStorageKeys = true;
        storageInfo.storageKeyCount = keys.length;
      } catch {
        // Ignore
      }
    }
    
    // Get database info
    const db = await getDatabase();
    const repo = db.getRepository('DataSourceEntity');
    const rawData = await repo.query(
      'SELECT LENGTH(transformed_data) as td_length, LENGTH(configuration) as config_length FROM data_source_entity WHERE id = $1',
      [id]
    );
    
    return NextResponse.json({
      dataSource: {
        id: dataSource.id,
        name: dataSource.name,
        type: dataSource.type,
        recordCount: dataSource.recordCount,
        transformedAt: dataSource.transformedAt,
      },
      configuration: {
        totalSize: config.toString().length,
        totalContentSize,
        files: fileInfo
      },
      transformedData: transformedInfo,
      storage: storageInfo,
      database: {
        transformedDataLength: rawData[0]?.td_length || 0,
        configurationLength: rawData[0]?.config_length || 0
      },
      keywords: {
        hasKeywords: !!dataSource.aiKeywords,
        keywords: dataSource.aiKeywords || []
      }
    });
    
  } catch (error) {
    logger.error('Failed to check data source:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check data source' },
      { status: 500 }
    );
  }
}