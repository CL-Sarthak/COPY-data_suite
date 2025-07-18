import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { TableMetadataService } from '@/services/tableMetadataService';
import { logger } from '@/utils/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const database = await getDatabase();
    const repository = database.getRepository(DataSourceEntity);
    
    const dataSource = await repository.findOne({
      where: { id }
    });

    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    // Get tables for this data source
    const tables = await TableMetadataService.getTablesForDataSource(id);
    
    logger.info(`GET tables for data source ${id}:`, {
      existingTablesCount: tables.length,
      hasTransformedData: !!dataSource.transformedData,
      dataSourceType: dataSource.type,
      dataSourceName: dataSource.name
    });
    
    // If no tables exist yet, try to detect them
    if (tables.length === 0) {
      let dataToAnalyze = null;
      let sourceType = 'none';
      
      // Check transformedData first
      if (dataSource.transformedData) {
        try {
          dataToAnalyze = JSON.parse(dataSource.transformedData);
          sourceType = 'transformedData';
        } catch (error) {
          logger.error('Error parsing transformed data:', error);
        }
      }
      
      // For database sources, check if data is in configuration
      if (!dataToAnalyze && dataSource.type === 'database' && dataSource.configuration) {
        // Parse configuration if it's a string
        let parsedConfig = dataSource.configuration;
        if (typeof dataSource.configuration === 'string') {
          try {
            parsedConfig = JSON.parse(dataSource.configuration);
          } catch (e) {
            logger.error('Failed to parse configuration:', e);
          }
        }
        
        if (parsedConfig && typeof parsedConfig === 'object' && 'data' in parsedConfig) {
          dataToAnalyze = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            records: (parsedConfig as any).data,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            totalRecords: (parsedConfig as any).data.length,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            metadata: (parsedConfig as any).metadata || {}
          };
          sourceType = 'configuration';
        }
      }
      
      if (dataToAnalyze) {
        try {
          logger.info(`Analyzing data from ${sourceType}:`, {
            keys: Object.keys(dataToAnalyze),
            recordsLength: dataToAnalyze.records?.length,
            hasMetadata: !!dataToAnalyze.metadata,
            sampleRecordKeys: dataToAnalyze.records?.[0] ? Object.keys(dataToAnalyze.records[0]).slice(0, 5) : []
          });
          
          const detectedTables = await TableMetadataService.detectTablesInData(dataToAnalyze);
          
          logger.info(`Detected ${detectedTables.length} tables:`, detectedTables.map(t => ({
            name: t.tableName,
            type: t.tableType,
            records: t.recordCount
          })));
          
          if (detectedTables.length > 0) {
            // Save detected tables
            const savedTables = await TableMetadataService.createOrUpdateTables(id, detectedTables);
            
            // Update data source with table info
            await repository.update(id, {
              tableCount: detectedTables.length,
              hasMultipleTables: detectedTables.length > 1
            });
            
            return NextResponse.json({
              tables: savedTables,
              detected: true
            });
          }
        } catch (error) {
          logger.error('Error detecting tables:', error);
        }
      }
    }
    
    return NextResponse.json({
      tables,
      detected: false
    });
  } catch (error) {
    logger.error('Error fetching tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}