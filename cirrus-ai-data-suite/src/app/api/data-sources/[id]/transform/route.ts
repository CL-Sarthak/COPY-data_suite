import { NextRequest, NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';
import { DataTransformationService, UnifiedDataCatalog } from '@/services/dataTransformationService';
import { apiLogger } from '@/utils/logger';
import { cachedJsonResponse, CACHE_DURATIONS } from '@/utils/apiCache';

// GET /api/data-sources/[id]/transform - Transform a data source to unified JSON format
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get pagination parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const requestedPageSize = parseInt(searchParams.get('pageSize') || '100'); // Default 100 records instead of 10
    const skipPagination = searchParams.get('skipPagination') === 'true';
    
    // Prevent excessively large page sizes to reduce bandwidth
    const MAX_PAGE_SIZE = 1000;
    const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
    
    apiLogger.log('=== Data Transformation API: Starting transformation ===', {
      sourceId: id,
      timestamp: new Date().toISOString(),
      page,
      pageSize,
      skipPagination
    });

    // Get the data source with full file content from external storage
    const dataSource = await DataSourceService.getDataSourceById(id, true);
    
    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    apiLogger.debug('Data source found:', {
      id: dataSource.id,
      name: dataSource.name,
      type: dataSource.type,
      hasFiles: !!(dataSource.configuration as Record<string, unknown>).files
    });

    // Check if this is a JSON-only data source (but not API data sources)
    const config = dataSource.configuration as { files?: Array<{ name: string; type: string; size: number; content?: string }> };
    const hasOnlyJSONFiles = config.files?.every(file => 
      file.type === 'application/json' || file.name?.endsWith('.json')
    ) ?? false;

    // Skip JSON-only processing for API data sources
    if (hasOnlyJSONFiles && config.files && config.files.length > 0 && dataSource.type !== 'api') {
      apiLogger.debug('JSON-only data source detected, returning raw JSON data');
      
      // For JSON files, return the raw content without transformation
      const jsonFile = config.files[0]; // Take the first JSON file
      if (jsonFile.content) {
        try {
          const jsonData = JSON.parse(jsonFile.content);
          
          // For JSON-only sources, still transform properly to UnifiedDataRecord format
          // This ensures the annotation interface can properly display the data
          const totalRecords = Array.isArray(jsonData) ? jsonData.length : 1;
          
          // Apply pagination for JSON-only sources too
          let dataToTransform = jsonData;
          if (Array.isArray(jsonData) && !skipPagination) {
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            dataToTransform = jsonData.slice(startIndex, endIndex);
            apiLogger.debug('Applying pagination to JSON-only source', {
              totalRecords,
              startIndex,
              endIndex,
              slicedLength: dataToTransform.length
            });
          }
          
          const transformedRecords = Array.isArray(dataToTransform) 
            ? dataToTransform.map((item, index) => ({
                id: `${dataSource.id}_${jsonFile.name}_record_${(page - 1) * pageSize + index}`,
                sourceId: dataSource.id,
                sourceName: dataSource.name,
                sourceType: 'json',
                recordIndex: (page - 1) * pageSize + index,
                data: item,
                metadata: {
                  originalFormat: 'json',
                  extractedAt: new Date().toISOString(),
                  fileInfo: {
                    name: jsonFile.name,
                    size: jsonFile.size || JSON.stringify(item).length,
                    type: jsonFile.type
                  },
                  processingInfo: {
                    method: 'json_direct',
                    confidence: 1.0
                  }
                }
              }))
            : [{
                id: `${dataSource.id}_${jsonFile.name}_record_0`,
                sourceId: dataSource.id,
                sourceName: dataSource.name,
                sourceType: 'json',
                recordIndex: 0,
                data: jsonData,
                metadata: {
                  originalFormat: 'json',
                  extractedAt: new Date().toISOString(),
                  fileInfo: {
                    name: jsonFile.name,
                    size: jsonFile.size || JSON.stringify(jsonData).length,
                    type: jsonFile.type
                  },
                  processingInfo: {
                    method: 'json_direct',
                    confidence: 1.0
                  }
                }
              }];
          
          const schema = DataTransformationService.analyzeSchema(transformedRecords);
          const catalog: UnifiedDataCatalog = {
            catalogId: `catalog_${dataSource.id}_${Date.now()}`,
            sourceId: dataSource.id,
            sourceName: dataSource.name,
            createdAt: new Date().toISOString(),
            totalRecords: totalRecords, // Use the actual total count, not the paginated count
            schema: schema,
            records: transformedRecords,
            summary: {
              dataTypes: ['json'],
              recordCount: totalRecords,
              fieldCount: schema.fields.length,
              sampleSize: transformedRecords.length
            },
            meta: {
              truncated: !skipPagination && totalRecords > pageSize,
              returnedRecords: transformedRecords.length
            },
            metadata: {
              source: 'json_raw',
              mappedFields: 0,
              totalSourceFields: 0,
              unmappedFields: [],
              validationErrors: []
            }
          };
          
          return NextResponse.json(catalog);
        } catch (error) {
          apiLogger.error('Failed to parse JSON file:', error);
        }
      }
    }

    // Check if we have field-mapped transformed data first
    const { getDatabase } = await import('@/database/connection');
    const { DataSourceEntity } = await import('@/entities/DataSourceEntity');
    const db = await getDatabase();
    const repository = db.getRepository(DataSourceEntity);
    const entity = await repository.findOne({ where: { id } });
    
    let catalog: UnifiedDataCatalog;
    
    // For API sources, always do fresh transformation to ensure we get the latest data
    const shouldUseCachedData = dataSource.type !== 'api';
    
    if (shouldUseCachedData && entity?.transformedData && entity.transformedData.trim() !== '') {
      try {
        const parsedData = JSON.parse(entity.transformedData);
        
        // Check if this is original UnifiedDataCatalog format or field-mapped data
        if (parsedData && typeof parsedData === 'object' && 'catalogId' in parsedData && 'schema' in parsedData && 'records' in parsedData) {
          // This is original UnifiedDataCatalog format
          apiLogger.debug('Using original UnifiedDataCatalog from transformedData', {
            totalRecords: parsedData.totalRecords,
            recordsLength: parsedData.records?.length,
            recordsNotStored: parsedData.metadata?.recordsNotStored
          });
          
          // Check if records were not stored (to prevent memory issues)
          if (parsedData.metadata?.recordsNotStored === true || parsedData.records.length === 0) {
            apiLogger.debug('Records not stored in database, re-transforming data source');
            // Re-transform the data source to get records
            // For small datasets (< 1000 records), always load all records
            // For larger datasets, load based on pagination
            const isSmallDataset = parsedData.totalRecords < 1000 || parsedData.savedRecordCount < 1000;
            const recordsToLoad = skipPagination ? 0 : (isSmallDataset ? 0 : Math.max(pageSize, page * pageSize));
            
            apiLogger.debug('Re-transforming with record limit:', {
              skipPagination,
              page,
              pageSize,
              recordsToLoad,
              isSmallDataset,
              totalRecords: parsedData.totalRecords || parsedData.savedRecordCount
            });
            
            // For small datasets, don't limit records
            const transformOptions = recordsToLoad > 0 ? { maxRecords: recordsToLoad } : {};
            catalog = await DataTransformationService.transformDataSource(dataSource, transformOptions);
            
            // Preserve the saved metadata
            if (parsedData.savedRecordCount) {
              catalog.totalRecords = parsedData.savedRecordCount;
            }
            apiLogger.debug('Re-transformation complete:', {
              returnedRecords: catalog.records.length,
              totalRecords: catalog.totalRecords
            });
          } else {
            catalog = parsedData as UnifiedDataCatalog;
            
            // Re-analyze schema if it's missing or has no fields
            if (!catalog.schema || !catalog.schema.fields || catalog.schema.fields.length === 0) {
              apiLogger.debug('Re-analyzing schema for saved catalog');
              catalog.schema = DataTransformationService.analyzeSchema(catalog.records);
              catalog.summary.fieldCount = catalog.schema.fields.length;
            }
          }
        } else if (Array.isArray(parsedData) && parsedData.length > 0) {
          // This is field-mapped data (simple array) - convert to UnifiedDataCatalog format
          apiLogger.debug('Converting field-mapped data to UnifiedDataCatalog format', {
            recordCount: parsedData.length,
            hasTransformationAppliedAt: !!entity.transformationAppliedAt,
            sampleFieldNames: Object.keys(parsedData[0] || {})
          });
          const transformedRecords = parsedData;
          // Get the original record count from the data source entity or fallback to current count
          let originalRecordCount = transformedRecords.length;
          
          // Use the recordCount from the data source entity if available (most reliable)
          if (entity.recordCount && entity.recordCount > 0) {
            originalRecordCount = entity.recordCount;
            apiLogger.debug('Using original record count from data source entity:', originalRecordCount);
          } else {
            apiLogger.debug('Using field-mapped record count as fallback:', originalRecordCount);
          }
          
          // Convert field-mapped data to UnifiedDataCatalog format
          // Properly analyze all records to get accurate schema
          const fieldAnalysis = new Map<string, { types: Set<string>; examples: Set<unknown>; hasNull: boolean }>();
          
          transformedRecords.forEach(record => {
            Object.entries(record).forEach(([key, value]) => {
              if (!fieldAnalysis.has(key)) {
                fieldAnalysis.set(key, { types: new Set(), examples: new Set(), hasNull: false });
              }
              const field = fieldAnalysis.get(key)!;
              
              if (value === null || value === undefined) {
                field.hasNull = true;
              } else {
                field.types.add(typeof value);
                if (field.examples.size < 3) {
                  field.examples.add(value);
                }
              }
            });
          });
          
          const fields = Array.from(fieldAnalysis.entries()).map(([name, info]) => ({
            name,
            type: info.types.size === 1 ? Array.from(info.types)[0] : 'mixed',
            nullable: info.hasNull,
            examples: Array.from(info.examples).slice(0, 3)
          }));
          
          catalog = {
            catalogId: `field_mapped_${id}_${Date.now()}`,
            sourceId: id,
            sourceName: dataSource.name,
            createdAt: new Date().toISOString(),
            totalRecords: originalRecordCount,
            schema: { fields },
            records: transformedRecords.map((record, index) => ({
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
              sampleSize: Math.min(transformedRecords.length, 10)
            }
          };
        } else {
          throw new Error('Invalid transformed data format');
        }
      } catch (error) {
        apiLogger.debug('Failed to parse transformed data, falling back to fresh transformation:', error);
        // For pagination, we need enough records to serve the requested page
        // Load up to 1000 records to balance memory usage and functionality
        const recordsToLoad = skipPagination ? 0 : Math.min(1000, page * pageSize + 100);
        catalog = await DataTransformationService.transformDataSource(dataSource, { maxRecords: recordsToLoad });
      }
    } else {
      // No transformed data found, transform the data source now
      apiLogger.debug('No pre-transformed data found, transforming now...');
      // Pass the data source with full content retrieved from external storage
      // For new transformations, allow up to 1000 records for pagination support
      const maxRecords = skipPagination ? 0 : 1000;
      catalog = await DataTransformationService.transformDataSource(dataSource, { maxRecords });
    }
    
    apiLogger.log('=== Data Transformation API: Transformation complete ===', {
      catalogId: catalog.catalogId,
      recordCount: catalog.totalRecords,
      fieldCount: catalog.schema.fields.length
    });

    // Save the catalog to the database for future use
    // Save if this is the first transformation OR if it's an API source (always fresh)
    apiLogger.debug('Checking if should save transformation', {
      hasTransformedData: !!entity?.transformedData,
      hasTransformationAppliedAt: !!entity?.transformationAppliedAt,
      totalRecords: catalog.totalRecords,
      isApiSource: dataSource.type === 'api'
    });
    
    if ((!entity?.transformedData && !entity?.transformationAppliedAt && catalog.totalRecords > 0) || 
        (dataSource.type === 'api' && catalog.totalRecords > 0)) {
      try {
        // For large datasets, save metadata only to prevent memory issues
        const catalogToSave = catalog.totalRecords > 10000 ? {
          ...catalog,
          records: [], // Don't store records in database for large datasets
          metadata: {
            ...catalog.metadata,
            recordsNotStored: true,
            reason: 'Large dataset - records not stored to prevent memory issues'
          },
          savedRecordCount: catalog.totalRecords // Preserve the actual count
        } : catalog;
        
        const transformedDataJson = JSON.stringify(catalogToSave);
        const jsonSizeMB = Buffer.byteLength(transformedDataJson) / (1024 * 1024);
        
        apiLogger.info('DEBUG: Saving transformed data:', {
          jsonSizeMB: jsonSizeMB.toFixed(2),
          shouldTruncate: catalog.totalRecords > 10000,
          actualRecordCount: catalog.totalRecords,
          recordsArrayLength: catalogToSave.records?.length || 0,
          recordsSaved: catalog.totalRecords > 10000 ? 0 : catalog.totalRecords,
          catalogRecordsLength: catalog.records?.length || 0,
          isFirstSave: !entity?.transformedData && !entity?.transformationAppliedAt
        });
        
        const updateFields: Record<string, unknown> = {
          transformedData: transformedDataJson,
          transformedAt: new Date(),
          recordCount: catalog.totalRecords
        };
        
        // For API sources, update transformationAppliedAt to force React component re-render
        if (dataSource.type === 'api') {
          updateFields.transformationAppliedAt = new Date();
        }
        
        await repository.update(id, updateFields);
        
        apiLogger.debug('Saved transformation catalog to database', {
          sourceId: id,
          recordsStored: catalog.totalRecords <= 10000,
          totalRecords: catalog.totalRecords
        });
      } catch (saveError) {
        apiLogger.error('Failed to save transformation catalog:', saveError);
        // Continue without failing the request
      }
    }

    // Apply pagination unless explicitly skipped
    let paginatedRecords = catalog.records;
    let paginationMeta = {};
    
    if (!skipPagination) {
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      paginatedRecords = catalog.records.slice(startIndex, endIndex);
      
      apiLogger.debug('Pagination applied:', {
        originalRecords: catalog.records.length,
        paginatedRecords: paginatedRecords.length,
        page,
        pageSize,
        startIndex,
        endIndex
      });
      
      // Log warning if we're returning too many records
      if (paginatedRecords.length > pageSize) {
        apiLogger.error('WARNING: Returning more records than requested', {
          requested: pageSize,
          returning: paginatedRecords.length
        });
      }
      
      const totalPages = Math.ceil(catalog.totalRecords / pageSize);
      
      paginationMeta = {
        page,
        pageSize,
        totalPages,
        totalRecords: catalog.totalRecords,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        startIndex,
        endIndex: Math.min(endIndex, catalog.totalRecords)
      };
    }
    
    // Save the transformed data to the database for field mapping
    // Only save if this is a fresh transformation (not already saved)
    if (!entity?.transformedData || entity.transformedData.trim() === '') {
      try {
        apiLogger.debug('Saving transformed data to database for field mapping');
        
        // For large datasets, don't store records in the database to prevent memory issues
        const shouldStoreRecords = catalog.totalRecords <= 10000;
        
        const catalogToSave = shouldStoreRecords ? catalog : {
          ...catalog,
          records: [], // Don't store records for large datasets
          metadata: {
            ...catalog.metadata,
            recordsNotStored: true,
            savedRecordCount: catalog.totalRecords
          }
        };
        
        const transformedDataJson2 = JSON.stringify(catalogToSave);
        const jsonSizeMB2 = Buffer.byteLength(transformedDataJson2) / (1024 * 1024);
        
        apiLogger.info('DEBUG: Saving field-mapped data:', {
          jsonSizeMB: jsonSizeMB2.toFixed(2),
          shouldStoreRecords,
          actualRecordCount: catalog.totalRecords,
          recordsArrayLength: catalogToSave.records?.length || 0
        });
        
        const updateFields2: Record<string, unknown> = {
          transformedData: transformedDataJson2,
          transformedAt: new Date(),
          recordCount: catalog.totalRecords
        };
        
        // For API sources, update transformationAppliedAt to force React component re-render
        if (dataSource.type === 'api') {
          updateFields2.transformationAppliedAt = new Date();
        }
        
        await repository.update(id, updateFields2);
        
        apiLogger.debug('Transformed data saved successfully', {
          recordsStored: shouldStoreRecords,
          totalRecords: catalog.totalRecords
        });
      } catch (saveError) {
        apiLogger.error('Failed to save transformed data:', saveError);
        // Continue anyway - the transformation succeeded even if save failed
      }
    }

    const response = {
      ...catalog,
      records: paginatedRecords,
      meta: {
        ...catalog.meta,
        totalRecords: catalog.totalRecords,
        returnedRecords: paginatedRecords.length,
        truncated: !skipPagination && catalog.totalRecords > pageSize,
        downloadUrl: catalog.totalRecords > 100 ? 
          `/api/data-sources/${id}/transform/download` : null,
        pagination: !skipPagination ? paginationMeta : undefined
      }
    };

    // Use cached response with appropriate cache duration
    // For API sources, don't cache to ensure fresh data after refresh
    return cachedJsonResponse(response, {
      maxAge: dataSource.type === 'api' ? 0 : CACHE_DURATIONS.TRANSFORM_RESULTS,
      public: false, // Private cache since it's user-specific data
      etag: true // Enable ETag for conditional requests
    });
  } catch (error) {
    apiLogger.error('=== Data Transformation API: Error ===', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to transform data source',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

