import { NextRequest, NextResponse } from 'next/server';
import { CatalogMappingService } from '@/services/catalogMappingService';
import { DataSourceService } from '@/services/dataSourceService';
import { SourceFieldMapping } from '@/services/globalCatalogService';

// GET /api/catalog/suggestions - Generate field mapping suggestions for a data source
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sourceId = url.searchParams.get('sourceId');
    
    if (!sourceId) {
      return NextResponse.json(
        { error: 'sourceId parameter is required' },
        { status: 400 }
      );
    }

    // Get the data source
    const dataSource = await DataSourceService.getDataSourceById(sourceId);
    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    // Determine source fields using multiple fallback strategies
    let fieldsToAnalyze: string[] = [];
    let strategy = 'no_fields_found';

    // Strategy 1: Use stored original field names (most reliable)
    // Need to get the entity directly since DataSource type doesn't include originalFieldNames
    const { getDatabase } = await import('@/database/connection');
    const { DataSourceEntity } = await import('@/entities/DataSourceEntity');
    const db = await getDatabase();
    const dataSourceRepo = db.getRepository(DataSourceEntity);
    const dataSourceEntity = await dataSourceRepo.findOne({ where: { id: sourceId } });
    
    if (dataSourceEntity?.originalFieldNames) {
      try {
        const parsedFields = JSON.parse(dataSourceEntity.originalFieldNames);
        if (Array.isArray(parsedFields) && parsedFields.length > 0) {
          fieldsToAnalyze = parsedFields;
          strategy = 'stored_original_fields';
        }
      } catch {
        // Ignore parsing errors and try other methods
      }
    }

    // Strategy 2: Extract from transformation data
    if (fieldsToAnalyze.length === 0 && dataSourceEntity?.transformedData) {
      try {
        const transformedData = JSON.parse(dataSourceEntity.transformedData);
        if (transformedData?.records && Array.isArray(transformedData.records) && transformedData.records.length > 0) {
          const firstRecord = transformedData.records[0];
          if (typeof firstRecord === 'object' && firstRecord !== null) {
            fieldsToAnalyze = Object.keys(firstRecord);
            strategy = 'transformation_data_fields';
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }

    // Strategy 3: Use existing mappings as fallback
    if (fieldsToAnalyze.length === 0) {
      const existingMappings = await CatalogMappingService.getFieldMappings(sourceId);
      if (existingMappings.length > 0) {
        fieldsToAnalyze = existingMappings.map((m: SourceFieldMapping) => m.sourceFieldName);
        strategy = 'existing_mappings';
      }
    }

    // Strategy 4: Parse external storage for CSV files
    if (fieldsToAnalyze.length === 0) {
      try {
        const config = typeof dataSource.configuration === 'string' 
          ? JSON.parse(dataSource.configuration) 
          : dataSource.configuration;

        if (dataSourceEntity?.storageKeys && config?.files?.[0]) {
          const { StorageService } = await import('@/services/storage/storageService');
          const storage = StorageService.getInstance();
          
          try {
            const storageKeys = JSON.parse(dataSourceEntity.storageKeys) as string[];
            
            if (storageKeys.length > 0) {
              const content = await storage.getFileAsString(storageKeys[0]);
              const fileName = config.files[0].name || 'data.csv';
              
              if (fileName.endsWith('.csv') && content) {
                // Parse CSV headers
                const lines = content.split('\n').filter(line => line.trim());
                if (lines.length > 0) {
                  const headers = lines[0].split(',').map(header => header.trim().replace(/^"(.*)"$/, '$1'));
                  fieldsToAnalyze = headers;
                  strategy = 'external_storage_parsing';
                }
              }
            }
          } catch {
            // Ignore storage retrieval errors
          }
        }
      } catch {
        // Ignore configuration parsing errors
      }
    }

    // Generate suggestions for the discovered fields
    const suggestions = fieldsToAnalyze.length > 0 
      ? await CatalogMappingService.generateMappingSuggestions(sourceId, fieldsToAnalyze)
      : [];

    return NextResponse.json({
      sourceId,
      sourceFields: fieldsToAnalyze,
      suggestions,
      strategy,
      summary: {
        totalFields: fieldsToAnalyze.length,
        suggestionsCount: suggestions.length,
        highConfidenceSuggestions: suggestions.filter(s => 
          s.suggestedMappings.length > 0 && s.suggestedMappings[0].confidence >= 0.8
        ).length
      }
    });
  } catch (error) {
    console.error('Error generating mapping suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to get mapping suggestions' },
      { status: 500 }
    );
  }
}

// POST /api/catalog/suggestions - Generate field mapping suggestions for a data source
export async function POST(request: NextRequest) {
  try {
    const { sourceId, sourceFields, autoMap } = await request.json();
    
    if (!sourceId) {
      return NextResponse.json(
        { error: 'sourceId is required' },
        { status: 400 }
      );
    }

    let fieldsToAnalyze: string[];

    if (sourceFields && Array.isArray(sourceFields)) {
      fieldsToAnalyze = sourceFields;
    } else {
      // Get fields from the original data source
      const dataSource = await DataSourceService.getDataSourceById(sourceId);
      if (!dataSource) {
        return NextResponse.json(
          { error: 'Data source not found' },
          { status: 404 }
        );
      }

      // Try to get original field names from multiple sources
      fieldsToAnalyze = [];

      // Strategy: Get ALL original source fields, not just mapped ones
      // This allows users to add new mappings for previously unmapped fields
      
      const { getDatabase } = await import('@/database/connection');
      const { FieldMappingEntity } = await import('@/entities/FieldMappingEntity');
      const { DataSourceEntity } = await import('@/entities/DataSourceEntity');
      const db = await getDatabase();
      const mappingRepo = db.getRepository(FieldMappingEntity);
      const dataSourceRepo = db.getRepository(DataSourceEntity);
      const existingMappings = await mappingRepo.find({ where: { sourceId } });
      
      // Get the data source entity to check for stored original field names
      const dataSourceEntity = await dataSourceRepo.findOne({ where: { id: sourceId } });

      // First try: Get from stored original field names (most reliable)
      if (dataSourceEntity?.originalFieldNames) {
        try {
          fieldsToAnalyze = JSON.parse(dataSourceEntity.originalFieldNames);
        } catch {
          // Ignore parsing errors and try other methods
        }
      }
      
      // Second try: Get from original CSV-to-JSON transformation (before field mapping)
      if (fieldsToAnalyze.length === 0) {
        const originalTransformedData = await DataSourceService.getTransformedData(sourceId);
        
        if (originalTransformedData && originalTransformedData.schema) {
          fieldsToAnalyze = originalTransformedData.schema.fields.map((f: { name: string }) => f.name);
        }
      }
      
      // Third try: Use existing mappings as fallback
      if (fieldsToAnalyze.length === 0 && existingMappings.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fieldsToAnalyze = existingMappings.map((m: any) => m.sourceFieldName);
      }

      // Fourth try: Parse the raw file data to extract field names
      if (fieldsToAnalyze.length === 0) {
        try {
          const config = typeof dataSource.configuration === 'string' 
            ? JSON.parse(dataSource.configuration) 
            : dataSource.configuration;


          // Try to get from file content or external storage
          let rawData: unknown[] = [];
          
          if (config?.transformedData && Array.isArray(config.transformedData)) {
            rawData = config.transformedData;
          } else if (config?.files?.[0]?.content) {
            rawData = config.files[0].content as unknown[];
          } else {
            // For data sources without external storage, try to recreate original data
            // by getting the transformed data and examining its structure
            const existingTransformedEntity = dataSourceEntity;
            
            if (existingTransformedEntity?.transformedData) {
              try {
                const fieldMappedData = JSON.parse(existingTransformedEntity.transformedData);
                if (Array.isArray(fieldMappedData) && fieldMappedData.length > 0) {
                  // This is field-mapped data with catalog field names
                  // We need to reverse-engineer the original field names from mappings
                  if (existingMappings.length > 0) {
                    // Get the first record to see what fields exist
                    const firstRecord = fieldMappedData[0] as Record<string, unknown>;
                    const allFields = Object.keys(firstRecord);
                    
                    // Try to map catalog field names back to source field names
                    const originalFieldNames = new Set<string>();
                    for (const mapping of existingMappings) {
                      originalFieldNames.add(mapping.sourceFieldName);
                    }
                    
                    // Add any unmapped fields that might still be present
                    for (const field of allFields) {
                      // If this field doesn't match any catalog field name, it might be an original field
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const isUnmappedOriginalField = !existingMappings.some((m: any) => 
                        m.catalogFieldId === field || field.toLowerCase().includes('_')
                      );
                      if (isUnmappedOriginalField) {
                        originalFieldNames.add(field);
                      }
                    }
                    
                    fieldsToAnalyze = Array.from(originalFieldNames);
                  }
                }
              } catch {
                // Ignore parsing errors
              }
            }
          }
          
          if (fieldsToAnalyze.length === 0 && dataSourceEntity?.storageKeys && config?.files?.[0]) {
            // Retrieve from external storage
            const { StorageService } = await import('@/services/storage/storageService');
            const { DataTransformationService } = await import('@/services/dataTransformationService');
            const storage = StorageService.getInstance();
            
            try {
              const storageKeys = JSON.parse(dataSourceEntity.storageKeys) as string[];
              
              if (storageKeys.length > 0) {
                const content = await storage.getFileAsString(storageKeys[0]);
                const fileName = config.files[0].name || 'data.csv';
                
                if (fileName.endsWith('.csv')) {
                  const tempDataSource = {
                    id: dataSource.id,
                    name: dataSource.name,
                    type: dataSource.type as 'filesystem',
                    configuration: {
                      files: [{
                        name: fileName,
                        content: content,
                        type: 'text/csv',
                        size: content.length
                      }]
                    },
                    connectionStatus: 'connected' as const
                  };
                  
                  const catalog = await DataTransformationService.transformDataSource(tempDataSource);
                  
                  if (catalog?.records && catalog.records.length > 0) {
                    rawData = catalog.records.map((record: { data?: unknown }) => record.data || record);
                  }
                }
              }
            } catch {
              // Ignore storage retrieval errors
            }
          }

          // Extract field names from the first record
          if (Array.isArray(rawData) && rawData.length > 0) {
            const firstRecord = rawData[0];
            
            if (typeof firstRecord === 'object' && firstRecord !== null) {
              fieldsToAnalyze = Object.keys(firstRecord as Record<string, unknown>);
            }
          }
        } catch {
          // Ignore errors when extracting field names
        }
      }
      
      // Final fallback: Remove any duplicate fields and ensure all mapped fields are included
      if (fieldsToAnalyze.length > 0 && existingMappings.length > 0) {
        const allFields = new Set(fieldsToAnalyze);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        existingMappings.forEach((mapping: any) => allFields.add(mapping.sourceFieldName));
        fieldsToAnalyze = Array.from(allFields);
      }

      if (fieldsToAnalyze.length === 0) {
        return NextResponse.json(
          { error: 'No source fields provided and no transformed data available' },
          { status: 400 }
        );
      }
    }

    const suggestions = await CatalogMappingService.generateMappingSuggestions(sourceId, fieldsToAnalyze);

    let autoMappings: Awaited<ReturnType<typeof CatalogMappingService.autoMapFields>> = [];
    if (autoMap) {
      autoMappings = await CatalogMappingService.autoMapFields(sourceId, fieldsToAnalyze, 0.8);
    }

    return NextResponse.json({
      sourceId,
      sourceFields: fieldsToAnalyze,
      suggestions,
      autoMappings,
      summary: {
        totalFields: fieldsToAnalyze.length,
        suggestionsCount: suggestions.length,
        autoMappedCount: autoMappings.length,
        highConfidenceSuggestions: suggestions.filter(s => 
          s.suggestedMappings.length > 0 && s.suggestedMappings[0].confidence >= 0.8
        ).length
      }
    });
  } catch (error) {
    console.error('Error generating mapping suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate mapping suggestions' },
      { status: 500 }
    );
  }
}