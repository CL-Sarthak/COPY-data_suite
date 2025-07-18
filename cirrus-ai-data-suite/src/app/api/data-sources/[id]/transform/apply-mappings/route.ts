import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { FieldMappingEntity } from '@/entities/FieldMappingEntity';
import { CatalogFieldEntity } from '@/entities/CatalogFieldEntity';
import { GlobalCatalogService, CatalogField } from '@/services/globalCatalogService';

interface TransformationResult {
  success: boolean;
  transformedRecords: number;
  validationErrors: Array<{
    recordIndex: number;
    field: string;
    value: unknown;
    errors: string[];
  }>;
  transformedData?: unknown[];
  statistics: {
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
    mappedFields: number;
    unmappedFields: string[];
  };
}

// POST /api/data-sources/[id]/transform/apply-mappings
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { 
      forceRetransform = false, 
      validateOnly = false,
      includeValidationDetails = true 
    } = body;

    const db = await getDatabase();
    const dataSourceRepo = db.getRepository(DataSourceEntity);
    const mappingRepo = db.getRepository(FieldMappingEntity);
    const catalogFieldRepo = db.getRepository(CatalogFieldEntity);

    // Get data source
    const dataSource = await dataSourceRepo.findOne({ where: { id } });
    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    // Check if transformation already exists and not forced
    const hasExistingTransformation = dataSource.transformedData && 
      dataSource.transformedData.trim() !== '' && 
      dataSource.transformationAppliedAt;

    if (hasExistingTransformation && !forceRetransform) {
      // Parse the record count from transformed data
      let recordCount = 0;
      try {
        const parsedData = JSON.parse(dataSource.transformedData || '[]');
        recordCount = Array.isArray(parsedData) ? parsedData.length : 0;
      } catch {
        recordCount = 0;
      }

      return NextResponse.json({
        message: 'Existing transformation detected',
        requiresConfirmation: true,
        lastTransformationDate: dataSource.transformationAppliedAt,
        recordCount: recordCount,
        estimatedDuration: recordCount > 10000 ? '30-60 seconds' : recordCount > 1000 ? '5-15 seconds' : '1-5 seconds'
      });
    }

    // Get field mappings for this data source
    const mappings = await mappingRepo.find({
      where: { sourceId: id }
    });


    if (mappings.length === 0) {
      return NextResponse.json(
        { error: 'No field mappings found. Please map fields before applying transformations.' },
        { status: 400 }
      );
    }

    // Get catalog fields for validation
    const catalogFields = await catalogFieldRepo.find();
    const catalogFieldMap = new Map(catalogFields.map(f => [f.id, f]));

    // Extract original data - handle both direct content and external storage
    let originalData: unknown[] = [];
    let isUsingTransformedData = false;
    
    try {
      // When re-transforming, we need to get the ORIGINAL data, not the already-transformed data
      // First try to get data from the transform endpoint
      const { DataSourceService } = await import('@/services/dataSourceService');
      const { DataTransformationService } = await import('@/services/dataTransformationService');
      
      // Get the data source with full content
      const fullDataSource = await DataSourceService.getDataSourceById(id, true);
      if (fullDataSource && fullDataSource.configuration.files && fullDataSource.configuration.files.length > 0) {
        console.log('Re-transforming from original data source...');
        const catalog = await DataTransformationService.transformDataSource(fullDataSource, { maxRecords: 0 });
        originalData = catalog.records.map((record: { data?: Record<string, unknown> }) => record.data || record);
        console.log('Got original data from source:', {
          extractedRecords: originalData.length,
          firstRecordFields: originalData.length > 0 ? Object.keys(originalData[0] as Record<string, unknown>) : []
        });
      } 
      // Fallback to existing transformed data only if we can't get original
      else if (dataSource.transformedData && dataSource.transformedData.trim() !== '') {
        console.log('WARNING: Using existing transformed data, field mappings may not work correctly');
        isUsingTransformedData = true;
        const parsedTransformed = JSON.parse(dataSource.transformedData);
        
        // Check if this is a UnifiedDataCatalog format
        if (parsedTransformed && typeof parsedTransformed === 'object' && 'records' in parsedTransformed) {
          // Extract data from UnifiedDataRecord format
          originalData = parsedTransformed.records.map((record: { data?: Record<string, unknown> }) => {
            // UnifiedDataRecord has the actual data in the 'data' property
            return record.data || record;
          });
          console.log('Extracted data from UnifiedDataCatalog:', {
            totalRecords: parsedTransformed.totalRecords,
            extractedRecords: originalData.length
          });
          
          // If records were not stored (large dataset), we need to re-transform
          if (originalData.length === 0 && parsedTransformed.metadata?.recordsNotStored) {
            console.log('Records not stored in database, re-transforming data source...');
            const { DataSourceService } = await import('@/services/dataSourceService');
            const { DataTransformationService } = await import('@/services/dataTransformationService');
            
            // Get the data source with full content
            const fullDataSource = await DataSourceService.getDataSourceById(id, true);
            if (fullDataSource) {
              const catalog = await DataTransformationService.transformDataSource(fullDataSource, { maxRecords: 0 });
              originalData = catalog.records.map((record: { data?: Record<string, unknown> }) => record.data || record);
              console.log('Re-transformation complete:', {
                extractedRecords: originalData.length
              });
            }
          }
        } else if (Array.isArray(parsedTransformed)) {
          // Direct array of transformed data
          originalData = parsedTransformed;
        }
      }
      
      // If no data found yet, try configuration
      if (originalData.length === 0) {
        const config = typeof dataSource.configuration === 'string' 
          ? JSON.parse(dataSource.configuration) 
          : dataSource.configuration;
        
        // Try to get transformed data directly from config
        if (config?.transformedData && Array.isArray(config.transformedData)) {
          originalData = config.transformedData;
        }
        // Then try file content directly (legacy)
        else if (config?.files?.[0]?.content) {
          const fileContent = config.files[0].content;
          if (typeof fileContent === 'string') {
            try {
              const parsed = JSON.parse(fileContent);
              originalData = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              // Not JSON, might be CSV
              originalData = [];
            }
          } else if (Array.isArray(fileContent)) {
            originalData = fileContent;
          }
        }
        // Finally, try to retrieve from external storage
        else if (dataSource.storageKeys && config?.files?.[0]) {
          const { StorageService } = await import('@/services/storage/storageService');
          const { DataTransformationService } = await import('@/services/dataTransformationService');
          const storage = StorageService.getInstance();
          
          try {
            const storageKeys = JSON.parse(dataSource.storageKeys) as string[];
            if (storageKeys.length > 0) {
              const content = await storage.getFileAsString(storageKeys[0]);
              
              // Try to parse as JSON first
              try {
                const fileData = JSON.parse(content);
                originalData = Array.isArray(fileData) ? fileData : [fileData];
              } catch {
                // If not JSON, treat as CSV and transform it
                const fileName = config.files[0].name || 'data.csv';
                const fileExtension = fileName.split('.').pop()?.toLowerCase();
                
                if (fileExtension === 'csv') {
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
                  
                  const catalog = await DataTransformationService.transformDataSource(tempDataSource, { maxRecords: 0 });
                  // Extract data from UnifiedDataCatalog structure
                  if (catalog?.records && Array.isArray(catalog.records)) {
                    // Transform UnifiedDataRecord format to simple records for field mapping
                    originalData = catalog.records.map((record: { data?: unknown }) => record.data || record);
                  } else {
                    // Fallback for other structures
                    originalData = (catalog as { data?: unknown[]; records?: unknown[] })?.data || catalog?.records || [];
                  }
                } else {
                  originalData = [{ content: content }];
                }
              }
            }
          } catch (storageError) {
            console.error('Storage retrieval error:', storageError);
          }
        }
      }
      
      if (!Array.isArray(originalData)) {
        originalData = [];
      }
    } catch (error) {
      console.error('Config parsing error:', error);
      originalData = [];
    }

    if (!Array.isArray(originalData) || originalData.length === 0) {
      return NextResponse.json(
        { 
          error: 'No data available for transformation. Please ensure the data source has been transformed first by clicking the "Transform" button.',
          debug: {
            isArray: Array.isArray(originalData),
            length: originalData?.length,
            type: typeof originalData,
            hasTransformedData: !!dataSource.transformedData,
            hasConfiguration: !!dataSource.configuration
          }
        },
        { status: 400 }
      );
    }

    // Create field mapping lookup
    const fieldMappingLookup = new Map();
    const catalogFieldValidation = new Map();
    
    console.log('Building field mapping lookup:', {
      mappingsCount: mappings.length,
      catalogFieldsCount: catalogFields.length
    });
    
    for (const mapping of mappings) {
      fieldMappingLookup.set(mapping.sourceFieldName, mapping.catalogFieldId);
      const catalogField = catalogFieldMap.get(mapping.catalogFieldId);
      if (catalogField) {
        catalogFieldValidation.set(mapping.sourceFieldName, catalogField);
        console.log(`Mapping: ${mapping.sourceFieldName} -> ${catalogField.name} (${catalogField.displayName})`);
      }
    }

    // If we're using already-transformed data, warn about potential issues
    if (isUsingTransformedData) {
      console.warn('WARNING: Re-transformation using already-transformed data. Field mappings may not match original field names.');
    }

    // Transform data
    const transformedData: unknown[] = [];
    const validationErrors: TransformationResult['validationErrors'] = [];
    let successfulRecords = 0;
    let failedRecords = 0;

    console.log(`Transforming ${originalData.length} records...`);
    
    for (let i = 0; i < originalData.length; i++) {
      const record = originalData[i];
      const transformedRecord: Record<string, unknown> = {};
      let recordHasErrors = false;

      if (i === 0) {
        console.log('First record fields:', Object.keys(record as Record<string, unknown>));
        console.log('Field mappings:', Array.from(fieldMappingLookup.entries()));
      }

      // Transform each field
      for (const [sourceField, value] of Object.entries(record as Record<string, unknown>)) {
        const catalogFieldId = fieldMappingLookup.get(sourceField);
        
        if (catalogFieldId) {
          const catalogField = catalogFieldMap.get(catalogFieldId) as CatalogFieldEntity;
          if (catalogField) {
            // Use catalog field name
            const targetFieldName = catalogField.name;
            if (i === 0) {
              console.log(`Field transformation: ${sourceField} -> ${targetFieldName}`);
            }
            
            // Validate the value if validation is requested
            if (includeValidationDetails) {
              const catalogFieldForValidation: CatalogField = {
                id: catalogField.id,
                name: catalogField.name,
                displayName: catalogField.displayName,
                description: catalogField.description,
                dataType: catalogField.dataType as 'string' | 'number' | 'boolean' | 'datetime' | 'date' | 'json' | 'array',
                category: catalogField.category,
                isRequired: catalogField.isRequired,
                isStandard: catalogField.isStandard,
                tags: JSON.parse(catalogField.tags || '[]'),
                createdAt: catalogField.createdAt.toISOString(),
                updatedAt: catalogField.updatedAt.toISOString()
              };
              const validation = GlobalCatalogService.validateFieldValue(value, catalogFieldForValidation);
              if (!validation.isValid) {
                validationErrors.push({
                  recordIndex: i,
                  field: sourceField,
                  value,
                  errors: validation.errors
                });
                recordHasErrors = true;
              }
            }
            
            transformedRecord[targetFieldName] = value;
          }
        } else {
          // Keep unmapped fields with original names for now
          transformedRecord[sourceField] = value;
        }
      }

      transformedData.push(transformedRecord);
      
      if (recordHasErrors) {
        failedRecords++;
      } else {
        successfulRecords++;
      }
    }

    // Get unmapped fields
    const originalFields = new Set();
    originalData.forEach(record => {
      Object.keys(record as Record<string, unknown>).forEach(field => originalFields.add(field));
    });
    const mappedFields = new Set(mappings.map(m => m.sourceFieldName));
    const unmappedFields = Array.from(originalFields).filter(field => !mappedFields.has(field as string));

    const result: TransformationResult = {
      success: validationErrors.length === 0,
      transformedRecords: transformedData.length,
      validationErrors,
      statistics: {
        totalRecords: originalData.length,
        successfulRecords,
        failedRecords,
        mappedFields: mappings.length,
        unmappedFields: unmappedFields as string[]
      }
    };
    
    console.log('Transformation complete:', {
      totalRecords: transformedData.length,
      firstRecordFields: transformedData.length > 0 ? Object.keys(transformedData[0] as Record<string, unknown>) : [],
      firstRecordSample: transformedData.length > 0 ? transformedData[0] : null
    });

    // If this is validation-only, don't save the transformed data
    if (validateOnly) {
      result.transformedData = transformedData.slice(0, 10); // Preview only
      return NextResponse.json(result);
    }

    // Store original field names for future field mapping sessions
    const originalFieldNames = Array.from(originalFields) as string[];
    
    // Create a UnifiedDataCatalog structure for table detection
    const catalogStructure = {
      records: transformedData,
      totalRecords: transformedData.length,
      schema: {
        fields: Object.keys(transformedData[0] || {}).map(name => ({
          name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: typeof (transformedData[0] as any)?.[name] || 'unknown',
          nullable: true,
          examples: []
        }))
      }
    };
    
    // Detect and save table information
    let tableCount = 1;
    let hasMultipleTables = false;
    
    try {
      const { TableMetadataService } = await import('@/services/tableMetadataService');
      const detectedTables = await TableMetadataService.detectTablesInData(catalogStructure);
      
      if (detectedTables.length > 0) {
        await TableMetadataService.createOrUpdateTables(id, detectedTables);
        tableCount = detectedTables.length;
        hasMultipleTables = detectedTables.length > 1;
      }
    } catch (tableError) {
      console.error('Failed to detect tables:', tableError);
    }
    
    // Save transformed data to the data source
    await dataSourceRepo.update(id, {
      transformedData: JSON.stringify(transformedData),
      transformationStatus: validationErrors.length === 0 ? 'completed' : 'completed_with_errors',
      transformationAppliedAt: new Date(),
      transformationErrors: validationErrors.length > 0 ? JSON.stringify(validationErrors) : undefined,
      // Store original field names to enable future field mapping of unmapped fields
      originalFieldNames: JSON.stringify(originalFieldNames),
      // Store the actual record count for accurate reporting
      recordCount: transformedData.length,
      // Update transformedAt to indicate data has been transformed
      transformedAt: new Date(),
      tableCount,
      hasMultipleTables
    });

    result.transformedData = transformedData;

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error applying field mappings:', error);
    return NextResponse.json(
      { error: 'Failed to apply field mappings' },
      { status: 500 }
    );
  }
}

// GET /api/data-sources/[id]/transform/apply-mappings - Check transformation status
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    const db = await getDatabase();
    const dataSourceRepo = db.getRepository(DataSourceEntity);
    const mappingRepo = db.getRepository(FieldMappingEntity);

    const dataSource = await dataSourceRepo.findOne({ where: { id } });
    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    const mappingsCount = await mappingRepo.count({ where: { sourceId: id } });
    
    // Parse configuration and transformed data
    let originalData: unknown[] = [];
    let transformedData: unknown[] = [];
    
    try {
      const config = typeof dataSource.configuration === 'string' 
        ? JSON.parse(dataSource.configuration) 
        : dataSource.configuration;
      originalData = config?.transformedData || [];
    } catch {
      originalData = [];
    }

    try {
      transformedData = typeof dataSource.transformedData === 'string' 
        ? JSON.parse(dataSource.transformedData) 
        : (dataSource.transformedData || []);
    } catch {
      transformedData = [];
    }

    return NextResponse.json({
      hasTransformedData: !!dataSource.transformedData,
      transformationStatus: dataSource.transformationStatus || 'not_started',
      transformationAppliedAt: dataSource.transformationAppliedAt,
      transformationErrors: dataSource.transformationErrors,
      mappingsCount,
      recordCount: transformedData.length,
      originalRecordCount: originalData.length
    });

  } catch (error) {
    console.error('Error checking transformation status:', error);
    return NextResponse.json(
      { error: 'Failed to check transformation status' },
      { status: 500 }
    );
  }
}