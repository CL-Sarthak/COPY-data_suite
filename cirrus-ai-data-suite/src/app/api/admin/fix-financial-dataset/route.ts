import { NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { DataTransformationService } from '@/services/dataTransformationService';
import { TableMetadataService } from '@/services/tableMetadataService';
import { KeywordGenerationService } from '@/services/keywordGenerationService';
import { logger } from '@/utils/logger';

export async function POST() {
  try {
    logger.info('Fixing Financial Dataset...');
    
    const db = await getDatabase();
    const repository = db.getRepository(DataSourceEntity);
    
    // Find all potential Financial Datasets
    const dataSources = await repository.find();
    const financialDatasets = dataSources.filter(ds => 
      ds.name.toLowerCase().includes('financial')
    );
    
    if (financialDatasets.length === 0) {
      return NextResponse.json({ error: 'No Financial Dataset found' }, { status: 404 });
    }
    
    const results = [];
    
    for (const dataSource of financialDatasets) {
      const result = {
        id: dataSource.id,
        name: dataSource.name,
        status: 'checking',
        hasTransformedData: !!dataSource.transformedData,
        recordCount: dataSource.recordCount || 0,
        fixed: false,
        error: null as string | null
      };
      
      try {
        // Check if it already has transformed data
        if (dataSource.transformedData && dataSource.transformedData.trim() !== '') {
          try {
            const parsed = JSON.parse(dataSource.transformedData);
            result.recordCount = parsed.totalRecords || 0;
            result.status = 'already_transformed';
            results.push(result);
            continue;
          } catch {
            logger.warn(`Failed to parse existing transformed data for ${dataSource.id}`);
          }
        }
        
        // Check configuration
        const config = JSON.parse(dataSource.configuration);
        if (!config.files || config.files.length === 0) {
          result.status = 'no_files';
          result.error = 'No files to transform';
          results.push(result);
          continue;
        }
        
        // Check if files have content
        const hasContent = config.files.some((f: { content?: string }) => f.content);
        if (!hasContent) {
          // Try to retrieve from storage
          if (dataSource.storageKeys) {
            logger.info(`Retrieving files from storage for ${dataSource.id}`);
            // This would need the storage retrieval logic
            result.status = 'needs_storage_retrieval';
            result.error = 'Files in external storage, manual retrieval needed';
            results.push(result);
            continue;
          }
        }
        
        logger.info(`Transforming ${dataSource.name} (${dataSource.id})`);
        
        // Transform with a reasonable limit to avoid memory issues
        const catalog = await DataTransformationService.transformDataSource(
          {
            id: dataSource.id,
            name: dataSource.name,
            type: dataSource.type as 'filesystem' | 'json_transformed',
            connectionStatus: 'connected',
            configuration: config
          },
          { maxRecords: 10000 } // Limit to 10k records for now
        );
        
        logger.info(`Transformed ${catalog.totalRecords} records`);
        
        // Save transformed data
        const transformedJson = JSON.stringify(catalog);
        logger.info(`Transformed data size: ${transformedJson.length} bytes`);
        
        // Check if it's too large (> 10MB)
        if (transformedJson.length > 10 * 1024 * 1024) {
          result.status = 'too_large';
          result.error = `Transformed data too large: ${(transformedJson.length / 1024 / 1024).toFixed(2)}MB`;
          results.push(result);
          continue;
        }
        
        await repository.update(dataSource.id, {
          transformedData: transformedJson,
          transformedAt: new Date(),
          recordCount: catalog.totalRecords
        });
        
        // Update tables
        const tables = await TableMetadataService.detectTablesInData(catalog);
        if (tables.length > 0) {
          await TableMetadataService.createOrUpdateTables(dataSource.id, tables);
        }
        
        // Generate keywords
        if (!dataSource.aiKeywords) {
          await KeywordGenerationService.generateKeywords(dataSource.id);
        }
        
        result.status = 'fixed';
        result.fixed = true;
        result.recordCount = catalog.totalRecords;
        
      } catch (error) {
        logger.error(`Failed to fix ${dataSource.id}:`, error);
        result.status = 'error';
        result.error = error instanceof Error ? error.message : 'Unknown error';
      }
      
      results.push(result);
    }
    
    return NextResponse.json({
      success: true,
      datasetsFound: financialDatasets.length,
      results
    });
    
  } catch (error) {
    logger.error('Failed to fix Financial Dataset:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fix dataset' },
      { status: 500 }
    );
  }
}