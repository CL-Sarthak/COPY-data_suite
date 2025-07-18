import { NextRequest, NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';
import { DataTransformationService, type UnifiedDataCatalog } from '@/services/dataTransformationService';
import { apiLogger } from '@/utils/logger';

// GET /api/data-sources/[id]/transform/download - Download full transformed dataset
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    apiLogger.log('=== Data Transformation Download API: Starting full dataset download ===', {
      sourceId: id,
      timestamp: new Date().toISOString()
    });

    // Get the data source
    const dataSource = await DataSourceService.getDataSourceById(id);
    
    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    apiLogger.debug('Data source found for download:', {
      id: dataSource.id,
      name: dataSource.name,
      type: dataSource.type,
      hasFiles: !!(dataSource.configuration as Record<string, unknown>).files
    });

    // Check if we have field-mapped transformed data first
    const { getDatabase } = await import('@/database/connection');
    const { DataSourceEntity } = await import('@/entities/DataSourceEntity');
    const db = await getDatabase();
    const repository = db.getRepository(DataSourceEntity);
    const entity = await repository.findOne({ where: { id } });
    
    let catalog: UnifiedDataCatalog;
    
    if (entity?.transformedData && entity.transformedData.trim() !== '') {
      try {
        const parsedData = JSON.parse(entity.transformedData);
        
        // Check if this is original UnifiedDataCatalog format or field-mapped data
        if (parsedData && typeof parsedData === 'object' && 'catalogId' in parsedData && 'schema' in parsedData && 'records' in parsedData) {
          // This is original UnifiedDataCatalog format - use as is
          apiLogger.debug('Using original UnifiedDataCatalog from transformedData for download');
          catalog = parsedData as UnifiedDataCatalog;
        } else if (Array.isArray(parsedData) && parsedData.length > 0) {
          // This is field-mapped data (simple array) - convert to UnifiedDataCatalog format
          apiLogger.debug('Converting field-mapped data to UnifiedDataCatalog format for download');
          const transformedRecords = parsedData;
          
          // Use the recordCount from the data source entity if available
          const originalRecordCount = entity.recordCount && entity.recordCount > 0 ? entity.recordCount : transformedRecords.length;
          
          // Convert field-mapped data to UnifiedDataCatalog format
          const sampleRecord = transformedRecords[0];
          const fields = Object.keys(sampleRecord).map(key => ({
            name: key,
            type: typeof sampleRecord[key] === 'number' ? 'number' : 
                  typeof sampleRecord[key] === 'boolean' ? 'boolean' : 'string',
            nullable: true,
            examples: [sampleRecord[key]]
          }));
          
          catalog = {
            catalogId: `field_mapped_${id}_${Date.now()}`,
            sourceId: id,
            sourceName: dataSource.name,
            createdAt: new Date().toISOString(),
            totalRecords: originalRecordCount,
            schema: { fields },
            records: transformedRecords.map((record: Record<string, unknown>, index: number) => ({
              id: `${id}_record_${index}`,
              sourceId: id,
              sourceName: dataSource.name,
              sourceType: dataSource.type,
              recordIndex: index,
              data: record,
              metadata: {
                originalFormat: 'field_mapped',
                extractedAt: new Date().toISOString(),
                processingInfo: {
                  method: 'field_mapping_transformation'
                }
              }
            })),
            summary: {
              dataTypes: [...new Set(fields.map(f => f.type))],
              recordCount: originalRecordCount,
              fieldCount: fields.length,
              sampleSize: transformedRecords.length
            }
          };
        } else {
          throw new Error('Invalid transformed data format');
        }
      } catch (error) {
        apiLogger.debug('Failed to parse transformed data, falling back to fresh transformation:', error);
        catalog = await DataTransformationService.transformDataSource(dataSource, { maxRecords: 0 });
      }
    } else {
      // No transformed data found, transform the data source now
      apiLogger.debug('No pre-transformed data found, transforming now...');
      catalog = await DataTransformationService.transformDataSource(dataSource, { maxRecords: 0 });
    }
    
    apiLogger.log('=== Data Transformation Download API: Full dataset prepared ===', {
      catalogId: catalog.catalogId,
      recordCount: catalog.totalRecords,
      returnedRecords: catalog.records.length,
      fieldCount: catalog.schema.fields.length
    });

    // Return the complete catalog without truncation
    return NextResponse.json(catalog);
  } catch (error) {
    apiLogger.error('=== Data Transformation Download API: Error ===', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to download full dataset',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}