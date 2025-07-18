import { NextRequest, NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';
import { DataTransformationService } from '@/services/dataTransformationService';
import { TableMetadataService } from '@/services/tableMetadataService';
import { getDatabase } from '@/database/connection';
import { logger } from '@/utils/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    
    logger.info(`Re-transforming data source: ${id}`);
    
    // Get the data source
    const dataSource = await DataSourceService.getDataSourceById(id);
    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }
    
    // Check if it has files to transform
    const config = typeof dataSource.configuration === 'string' 
      ? JSON.parse(dataSource.configuration)
      : dataSource.configuration;
    if (!config.files || config.files.length === 0) {
      return NextResponse.json(
        { error: 'No files to transform' },
        { status: 400 }
      );
    }
    
    // Transform the data
    logger.info('Starting transformation...');
    const catalog = await DataTransformationService.transformDataSource(
      {
        id: dataSource.id,
        name: dataSource.name,
        type: dataSource.type as 'filesystem' | 'json_transformed',
        connectionStatus: 'connected',
        configuration: config
      },
      { maxRecords: 0 } // No limit for transformation
    );
    
    // Save the transformed data
    const db = await getDatabase();
    const repository = db.getRepository('DataSourceEntity');
    
    await repository.update(id, {
      transformedData: JSON.stringify(catalog),
      transformedAt: new Date(),
      recordCount: catalog.totalRecords
    });
    
    logger.info(`Transformation complete. Total records: ${catalog.totalRecords}`);
    
    // Update table metadata
    try {
      const detectedTables = await TableMetadataService.detectTablesInData(catalog);
      if (detectedTables.length > 0) {
        await TableMetadataService.createOrUpdateTables(id, detectedTables);
        logger.info(`Updated ${detectedTables.length} tables`);
      }
    } catch (tableError) {
      logger.error('Failed to update table metadata:', tableError);
    }
    
    return NextResponse.json({
      success: true,
      message: `Transformed ${catalog.totalRecords} records`,
      recordCount: catalog.totalRecords,
      tableCount: catalog.summary?.fieldCount || 0
    });
    
  } catch (error) {
    logger.error('Failed to transform data source:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transform data source' },
      { status: 500 }
    );
  }
}