/**
 * Data Transformation Service
 * Converts various data formats into a unified JSON structure for platform-independent data cataloging
 */

import { DataSource } from '@/types/discovery';
import { logger } from '@/utils/logger';

export interface FieldMappedRecord {
  catalogData: Record<string, unknown>;
  sourceData: Record<string, unknown>;
  mappingInfo: {
    mappedFields: number;
    totalFields: number;
    unmappedFields: string[];
    validationErrors: Array<{ field: string; errors: string[] }>;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export type DataFormat = 'UnifiedDataCatalog' | 'FieldMappedArray' | 'RawArray' | 'Unknown';

export interface UnifiedDataRecord {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  recordIndex: number;
  data: Record<string, unknown>;
  metadata: {
    originalFormat: string;
    extractedAt: string;
    fileInfo?: {
      name: string;
      size: number;
      type: string;
    };
    processingInfo?: {
      method: string;
      confidence?: number;
      warnings?: string[];
    };
  };
}

export interface UnifiedDataCatalog {
  catalogId: string;
  sourceId: string;
  sourceName: string;
  createdAt: string;
  totalRecords: number;
  schema: {
    fields: Array<{
      name: string;
      type: string;
      nullable: boolean;
      examples: unknown[];
    }>;
  };
  records: UnifiedDataRecord[];
  summary: {
    dataTypes: string[];
    recordCount: number;
    fieldCount: number;
    sampleSize: number;
  };
  meta?: {
    truncated: boolean;
    returnedRecords: number;
  };
  metadata?: {
    source: string;
    mappedFields: number;
    totalSourceFields: number;
    unmappedFields: string[];
    validationErrors: Array<{ field: string; errors: string[] }>;
  };
}

export class DataTransformationService {
  /**
   * Transform a data source into unified JSON format
   * @param dataSource - The data source to transform
   * @param options - Optional configuration for the transformation
   * @param options.maxRecords - Maximum number of records to return (default: 100, use 0 for unlimited)
   */
  static async transformDataSource(
    dataSource: DataSource, 
    options: { maxRecords?: number } = {}
  ): Promise<UnifiedDataCatalog> {
    const { maxRecords = 100 } = options;
    
    logger.debug('=== DataTransformationService: Starting transformation ===', {
      sourceId: dataSource.id,
      sourceName: dataSource.name,
      sourceType: dataSource.type,
      maxRecords: maxRecords === 0 ? 'unlimited' : maxRecords
    });

    const records: UnifiedDataRecord[] = [];
    let totalRecords = 0;

    if ((dataSource.type === 'filesystem' || dataSource.type === 'json_transformed') && dataSource.configuration.files) {
      logger.debug(`=== Processing ${dataSource.configuration.files.length} files ===`);
      
      for (const file of dataSource.configuration.files) {
        logger.debug(`Processing file: ${file.name}, type: ${file.type}, hasContent: ${!!file.content}, contentLength: ${file.content?.length || 0}`);
        
        if (file.content) {
          // JSON files should preserve structure but create individual records
          if (file.type === 'application/json' || file.name?.endsWith('.json')) {
            logger.debug(`JSON file ${file.name} - creating individual records from JSON data`);
            try {
              const jsonData = JSON.parse(file.content);
              
              // If it's an array, create a record for each item
              if (Array.isArray(jsonData)) {
                totalRecords += jsonData.length;
                
                // Apply maxRecords limit during processing to avoid memory issues
                const itemsToProcess = maxRecords > 0 ? jsonData.slice(0, Math.max(0, maxRecords - records.length)) : jsonData;
                
                itemsToProcess.forEach((item, index) => {
                  records.push({
                    id: `${dataSource.id}_${file.name}_record_${index}`,
                    sourceId: dataSource.id,
                    sourceName: dataSource.name,
                    sourceType: 'json',
                    recordIndex: index,
                    data: item,
                    metadata: {
                      originalFormat: 'json',
                      extractedAt: new Date().toISOString(),
                      fileInfo: {
                        name: file.name,
                        size: file.size,
                        type: file.type
                      },
                      processingInfo: {
                        method: 'json_array_extraction',
                        confidence: 1.0
                      }
                    }
                  });
                });
              } else {
                // Single object
                totalRecords += 1;
                records.push({
                  id: `${dataSource.id}_${file.name}_record_0`,
                  sourceId: dataSource.id,
                  sourceName: dataSource.name,
                  sourceType: 'json',
                  recordIndex: 0,
                  data: jsonData,
                  metadata: {
                    originalFormat: 'json',
                    extractedAt: new Date().toISOString(),
                    fileInfo: {
                      name: file.name,
                      size: file.size,
                      type: file.type
                    },
                    processingInfo: {
                      method: 'json_object_extraction',
                      confidence: 1.0
                    }
                  }
                });
              }
            } catch (error) {
              logger.error(`Failed to parse JSON file ${file.name}:`, error);
            }
          } else {
            // Non-JSON files get transformed
            const fileRecords = await this.transformFile({
              name: file.name,
              type: file.type,
              size: file.size,
              content: file.content
            }, dataSource);
            logger.debug(`Transformed ${fileRecords.length} records from ${file.name}`);
            records.push(...fileRecords);
            totalRecords += fileRecords.length;
          }
        } else {
          logger.warn(`Skipping file ${file.name} - no content available`);
        }
      }
    } else if (dataSource.type === 'database') {
      // Database transformation
      const dbRecords = await this.transformDatabase(dataSource);
      records.push(...dbRecords);
      totalRecords = dbRecords.length;
    } else if (dataSource.type === 'api') {
      // API transformation
      const apiRecords = await this.transformAPI(dataSource);
      records.push(...apiRecords);
      totalRecords = apiRecords.length;
    }

    // Analyze schema from records
    const schema = this.analyzeSchema(records);

    // Apply record limit if specified (0 means no limit)
    const shouldTruncate = maxRecords > 0 && records.length > maxRecords;
    const displayRecords = shouldTruncate ? records.slice(0, maxRecords) : records;

    const catalog: UnifiedDataCatalog = {
      catalogId: `catalog_${dataSource.id}_${Date.now()}`,
      sourceId: dataSource.id,
      sourceName: dataSource.name,
      createdAt: new Date().toISOString(),
      totalRecords,
      schema,
      records: displayRecords,
      summary: {
        dataTypes: [...new Set(records.map(r => r.metadata.originalFormat))],
        recordCount: totalRecords,
        fieldCount: schema.fields.length,
        sampleSize: displayRecords.length
      }
    };

    if (shouldTruncate) {
      catalog.meta = {
        truncated: true,
        returnedRecords: displayRecords.length
      };
    }

    logger.debug('=== DataTransformationService: Transformation complete ===', {
      catalogId: catalog.catalogId,
      recordCount: catalog.totalRecords,
      returnedRecords: catalog.records.length,
      fieldCount: catalog.schema.fields.length,
      truncated: shouldTruncate
    });

    return catalog;
  }

  /**
   * Transform a file into unified records
   */
  private static async transformFile(
    file: { name: string; type: string; size: number; content: string },
    dataSource: DataSource
  ): Promise<UnifiedDataRecord[]> {
    logger.debug('=== Transforming file ===', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    if (file.type === 'text/csv') {
      return this.transformCSV(file, dataSource);
    } else if (file.type === 'application/json') {
      return this.transformJSON(file, dataSource);
    } else if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return this.transformDocument(file, dataSource);
    } else {
      return this.transformText(file, dataSource);
    }
  }

  /**
   * Convert CSV to JSON using headers as object properties
   */
  private static transformCSV(
    file: { name: string; type: string; size: number; content: string },
    dataSource: DataSource
  ): UnifiedDataRecord[] {

    const lines = file.content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Parse headers
    const headers = this.parseCSVLine(lines[0]);

    const records: UnifiedDataRecord[] = [];

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      
      if (values.length !== headers.length) {
        console.warn(`Row ${i + 1} has ${values.length} values but ${headers.length} headers`);
        continue;
      }

      // Create JSON object using headers as keys
      const data: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        data[header] = this.parseCSVValue(values[index]);
      });

      records.push({
        id: `${dataSource.id}_${file.name}_row_${i}`,
        sourceId: dataSource.id,
        sourceName: dataSource.name,
        sourceType: dataSource.type,
        recordIndex: i - 1,
        data,
        metadata: {
          originalFormat: 'csv',
          extractedAt: new Date().toISOString(),
          fileInfo: {
            name: file.name,
            size: file.size,
            type: file.type
          },
          processingInfo: {
            method: 'csv_header_mapping',
            confidence: 1.0
          }
        }
      });
    }

    logger.debug(`CSV transformation complete: ${records.length} records from ${file.name}`);
    return records;
  }

  /**
   * Parse CSV line handling quoted values and commas
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result.map(val => val.replace(/^"(.*)"$/, '$1')); // Remove surrounding quotes
  }

  /**
   * Parse CSV value to appropriate type
   */
  private static parseCSVValue(value: string): unknown {
    if (!value || value === '') return null;
    
    // Try to parse as number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }
    
    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Try to parse as date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) return date.toISOString();
    }
    
    // Return as string
    return value;
  }

  /**
   * Transform JSON file - preserve original structure
   */
  private static transformJSON(
    file: { name: string; type: string; size: number; content: string },
    dataSource: DataSource
  ): UnifiedDataRecord[] {

    try {
      const jsonData = JSON.parse(file.content);
      const records: UnifiedDataRecord[] = [];

      // For JSON files, we want to preserve the original structure
      // If it's an array, each element becomes a record with its original structure
      if (Array.isArray(jsonData)) {
        jsonData.forEach((item, index) => {
          records.push({
            id: `${dataSource.id}_${file.name}_item_${index}`,
            sourceId: dataSource.id,
            sourceName: dataSource.name,
            sourceType: dataSource.type,
            recordIndex: index,
            data: item, // Preserve original structure without wrapping
            metadata: {
              originalFormat: 'json',
              extractedAt: new Date().toISOString(),
              fileInfo: {
                name: file.name,
                size: file.size,
                type: file.type
              },
              processingInfo: {
                method: 'json_passthrough',
                confidence: 1.0
              }
            }
          });
        });
      } else if (typeof jsonData === 'object') {
        // For single objects, check if it has a records/data/items array
        const dataArray = jsonData.records || jsonData.data || jsonData.items;
        if (Array.isArray(dataArray)) {
          // If the object contains an array, use that as the records
          dataArray.forEach((item, index) => {
            records.push({
              id: `${dataSource.id}_${file.name}_item_${index}`,
              sourceId: dataSource.id,
              sourceName: dataSource.name,
              sourceType: dataSource.type,
              recordIndex: index,
              data: item,
              metadata: {
                originalFormat: 'json',
                extractedAt: new Date().toISOString(),
                fileInfo: {
                  name: file.name,
                  size: file.size,
                  type: file.type
                },
                processingInfo: {
                  method: 'json_passthrough',
                  confidence: 1.0
                }
              }
            });
          });
        } else {
          // Otherwise treat the whole object as a single record
          records.push({
            id: `${dataSource.id}_${file.name}_object`,
            sourceId: dataSource.id,
            sourceName: dataSource.name,
            sourceType: dataSource.type,
            recordIndex: 0,
            data: jsonData,
            metadata: {
              originalFormat: 'json',
              extractedAt: new Date().toISOString(),
              fileInfo: {
                name: file.name,
                size: file.size,
                type: file.type
              },
              processingInfo: {
                method: 'json_passthrough',
                confidence: 1.0
              }
            }
          });
        }
      }

      logger.debug(`JSON transformation complete: ${records.length} records from ${file.name}`);
      return records;
    } catch (error) {
      console.error('JSON parsing error:', error);
      return [];
    }
  }

  /**
   * Transform document (PDF/DOCX) - extract metadata and structure
   */
  private static transformDocument(
    file: { name: string; type: string; size: number; content: string },
    dataSource: DataSource
  ): UnifiedDataRecord[] {
    console.log('=== Document Transformation ===', { fileName: file.name, type: file.type });

    // Extract structured information from document
    const content = file.content;
    const lines = content.split('\n');
    
    // Extract potential headings (lines that are shorter and possibly uppercase)
    const potentialHeadings = lines
      .filter(line => line.trim().length > 0 && line.trim().length < 100)
      .filter(line => {
        const trimmed = line.trim();
        // Check if line looks like a heading
        return trimmed === trimmed.toUpperCase() || // All caps
               /^[A-Z]/.test(trimmed) && trimmed.endsWith(':') || // Starts with capital and ends with colon
               /^\d+\./.test(trimmed) || // Numbered heading
               /^[IVX]+\./.test(trimmed); // Roman numeral heading
      })
      .slice(0, 10); // Limit to first 10 potential headings

    // Extract paragraphs (blocks of text separated by double newlines)
    const paragraphs = content.split(/\n\n+/)
      .filter(p => p.trim().length > 50) // Only meaningful paragraphs
      .slice(0, 5); // First 5 paragraphs

    // Extract potential data patterns (emails, dates, numbers, etc.)
    const patterns = {
      emails: (content.match(/[\w.-]+@[\w.-]+\.\w+/g) || []).slice(0, 5),
      dates: (content.match(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/g) || []).slice(0, 5),
      phoneNumbers: (content.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}/g) || []).slice(0, 5),
      urls: (content.match(/https?:\/\/[^\s]+/g) || []).slice(0, 5),
      percentages: (content.match(/\d+\.?\d*%/g) || []).slice(0, 5),
      currencies: (content.match(/\$\d+\.?\d*/g) || []).slice(0, 5)
    };

    // Create structured record
    const record: UnifiedDataRecord = {
      id: `${dataSource.id}_${file.name}_document`,
      sourceId: dataSource.id,
      sourceName: dataSource.name,
      sourceType: dataSource.type,
      recordIndex: 0,
      data: {
        fileName: file.name,
        documentType: file.type,
        fullTextContent: file.content, // Store the complete original text
        textPreview: file.content.substring(0, 500),
        fullTextLength: file.content.length,
        structure: {
          estimatedPages: Math.ceil(file.content.length / 3000),
          wordCount: file.content.split(/\s+/).filter(w => w.length > 0).length,
          lineCount: lines.length,
          paragraphCount: paragraphs.length,
          hasStructuredContent: potentialHeadings.length > 0
        },
        extractedContent: {
          headings: potentialHeadings,
          firstParagraphs: paragraphs.map(p => p.substring(0, 200) + (p.length > 200 ? '...' : '')),
          dataPatterns: patterns
        },
        statistics: {
          averageLineLength: lines.reduce((sum, line) => sum + line.length, 0) / Math.max(lines.length, 1),
          longestLine: Math.max(...lines.map(l => l.length)),
          uniqueWords: new Set(content.toLowerCase().match(/\b\w+\b/g) || []).size
        }
      },
      metadata: {
        originalFormat: file.type === 'application/pdf' ? 'pdf' : 'docx',
        extractedAt: new Date().toISOString(),
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type
        },
        processingInfo: {
          method: 'enhanced_text_extraction',
          confidence: 0.85,
          warnings: patterns.emails.length > 0 || patterns.phoneNumbers.length > 0 
            ? ['Document contains potentially sensitive data (emails/phone numbers)'] 
            : []
        }
      }
    };

    console.log(`Document transformation complete: extracted ${potentialHeadings.length} headings, ${paragraphs.length} paragraphs`);
    return [record];
  }

  /**
   * Transform plain text file
   */
  private static transformText(
    file: { name: string; type: string; size: number; content: string },
    dataSource: DataSource
  ): UnifiedDataRecord[] {

    const record: UnifiedDataRecord = {
      id: `${dataSource.id}_${file.name}_text`,
      sourceId: dataSource.id,
      sourceName: dataSource.name,
      sourceType: dataSource.type,
      recordIndex: 0,
      data: {
        fileName: file.name,
        textContent: file.content,
        lineCount: file.content.split('\n').length,
        wordCount: file.content.split(/\s+/).length,
        characterCount: file.content.length
      },
      metadata: {
        originalFormat: 'text',
        extractedAt: new Date().toISOString(),
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type
        },
        processingInfo: {
          method: 'direct_text_read',
          confidence: 1.0
        }
      }
    };

    return [record];
  }

  /**
   * Transform database records
   */
  private static async transformDatabase(dataSource: DataSource): Promise<UnifiedDataRecord[]> {
    const records: UnifiedDataRecord[] = [];
    
    // Check if database has imported data
    const config = dataSource.configuration as { data?: Record<string, unknown>[] };
    const metadata = dataSource.metadata as { relationalImport?: boolean; primaryTable?: string; includedTables?: string[] };
    
    if (config.data && Array.isArray(config.data)) {
      // Check if this is a relational import
      const isRelationalImport = metadata?.relationalImport === true;
      
      // Transform each data record
      config.data.forEach((row, index) => {
        records.push({
          id: `${dataSource.id}_record_${index}`,
          sourceId: dataSource.id,
          sourceName: dataSource.name,
          sourceType: 'database',
          recordIndex: index,
          data: row,
          metadata: {
            originalFormat: isRelationalImport ? 'database_relational' : 'database',
            extractedAt: new Date().toISOString(),
            processingInfo: {
              method: isRelationalImport ? 'relational_import' : 'database_import',
              confidence: 1.0,
              warnings: isRelationalImport ? [`This is a relational import from ${metadata.primaryTable} with nested data from related tables`] : undefined
            }
          }
        });
      });
    } else {
      // If no data, return metadata as single record
      records.push({
        id: `${dataSource.id}_database_metadata`,
        sourceId: dataSource.id,
        sourceName: dataSource.name,
        sourceType: dataSource.type,
        recordIndex: 0,
        data: {
          databaseType: 'database',
          configuration: dataSource.configuration,
          metadata: dataSource.metadata,
          recordCount: dataSource.recordCount || 0
        },
        metadata: {
          originalFormat: 'database',
          extractedAt: new Date().toISOString(),
          processingInfo: {
            method: 'metadata_extraction',
            confidence: 0.7,
            warnings: ['No data available - showing metadata only']
          }
        }
      });
    }
    
    return records;
  }

  /**
   * Transform API metadata
   */
  private static async transformAPI(dataSource: DataSource): Promise<UnifiedDataRecord[]> {
    const records: UnifiedDataRecord[] = [];
    
    logger.info('Transforming API data source:', {
      id: dataSource.id,
      name: dataSource.name,
      hasConfigData: !!(dataSource.configuration as Record<string, unknown>).data,
      hasFiles: !!(dataSource.configuration as Record<string, unknown>).files,
      recordCount: dataSource.recordCount
    });
    
    // Check if API data is stored in configuration
    const config = dataSource.configuration as { data?: Record<string, unknown>[], files?: Array<{ content?: string }> };
    
    let apiData: unknown[] = [];
    
    // First check if data is directly in configuration
    if (config.data && Array.isArray(config.data)) {
      apiData = config.data;
    } 
    // Then check if it's in files (as JSON)
    else if (config.files && config.files.length > 0) {
      const jsonFile = config.files.find(f => f.content);
      if (jsonFile?.content) {
        try {
          const parsed = JSON.parse(jsonFile.content);
          apiData = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          logger.warn('Failed to parse API JSON content:', e);
        }
      }
    }
    
    logger.info('API data extracted:', {
      recordsFound: apiData.length,
      source: config.data ? 'config.data' : config.files ? 'config.files' : 'none'
    });
    
    // Transform each API record
    if (apiData.length > 0) {
      apiData.forEach((item, index) => {
        records.push({
          id: `${dataSource.id}_api_record_${index}`,
          sourceId: dataSource.id,
          sourceName: dataSource.name,
          sourceType: 'api',
          recordIndex: index,
          data: item as Record<string, unknown>,
          metadata: {
            originalFormat: 'api',
            extractedAt: new Date().toISOString(),
            processingInfo: {
              method: 'api_data_extraction',
              confidence: 1.0
            }
          }
        });
      });
    } else {
      // Fallback to metadata if no data found
      records.push({
        id: `${dataSource.id}_api_metadata`,
        sourceId: dataSource.id,
        sourceName: dataSource.name,
        sourceType: dataSource.type,
        recordIndex: 0,
        data: {
          apiType: 'api',
          configuration: dataSource.configuration,
          metadata: dataSource.metadata,
          recordCount: dataSource.recordCount || 0
        },
        metadata: {
          originalFormat: 'api',
          extractedAt: new Date().toISOString(),
          processingInfo: {
            method: 'metadata_extraction',
            confidence: 0.7,
            warnings: ['No API data found in configuration']
          }
        }
      });
    }
    
    return records;
  }

  /**
   * Analyze schema from transformed records
   */
  public static analyzeSchema(records: UnifiedDataRecord[]): { fields: Array<{ name: string; type: string; nullable: boolean; examples: unknown[] }> } {
    const fieldMap = new Map<string, { types: Set<string>; examples: Set<unknown>; nullCount: number; totalCount: number }>();

    records.forEach(record => {
      Object.entries(record.data).forEach(([key, value]) => {
        if (!fieldMap.has(key)) {
          fieldMap.set(key, { types: new Set(), examples: new Set(), nullCount: 0, totalCount: 0 });
        }

        const field = fieldMap.get(key)!;
        field.totalCount++;

        if (value === null || value === undefined) {
          field.nullCount++;
        } else {
          field.types.add(typeof value);
          if (field.examples.size < 3) {
            field.examples.add(value);
          }
        }
      });
    });

    const fields = Array.from(fieldMap.entries()).map(([name, info]) => ({
      name,
      type: info.types.size === 1 ? Array.from(info.types)[0] : 'mixed',
      nullable: info.nullCount > 0,
      examples: Array.from(info.examples).slice(0, 3)
    }));

    return { fields };
  }

  /**
   * Export catalog as JSON file
   */
  static exportCatalogAsJSON(catalog: UnifiedDataCatalog): string {
    return JSON.stringify(catalog, null, 2);
  }

  /**
   * Generate catalog summary for display
   */
  static generateCatalogSummary(catalog: UnifiedDataCatalog): string {
    return `Data Catalog Summary:
- Source: ${catalog.sourceName}
- Records: ${catalog.totalRecords.toLocaleString()}
- Fields: ${catalog.schema.fields.length}
- Data Types: ${catalog.summary.dataTypes.join(', ')}
- Created: ${new Date(catalog.createdAt).toLocaleString()}`;
  }

  // Field mapping data transformation methods (for unit tests)

  /**
   * Convert field-mapped data to unified catalog format
   */
  static async convertToUnifiedFormat(fieldMappedData: FieldMappedRecord[]): Promise<UnifiedDataCatalog> {
    if (!Array.isArray(fieldMappedData)) {
      throw new Error('Invalid input: expected array of field-mapped records');
    }

    const records = fieldMappedData.map((item, index) => ({
      id: `mapped_record_${index}`,
      sourceId: 'mapped_source',
      sourceName: 'Mapped Source',
      sourceType: 'mapped',
      recordIndex: index,
      data: item.catalogData || {},
      metadata: {
        originalFormat: 'field_mapped',
        extractedAt: new Date().toISOString(),
        processingInfo: {
          method: 'field_mapping_transformation',
          confidence: 1.0
        }
      }
    }));

    // Calculate aggregated statistics
    const totalMappedFields = fieldMappedData.length > 0 
      ? Math.round(fieldMappedData.reduce((sum, item) => sum + (item.mappingInfo?.mappedFields || 0), 0) / fieldMappedData.length)
      : 0;

    const totalSourceFields = fieldMappedData.length > 0 
      ? fieldMappedData[0].mappingInfo?.totalFields || 0
      : 0;

    const allUnmappedFields = fieldMappedData.flatMap(item => item.mappingInfo?.unmappedFields || []);
    const uniqueUnmappedFields = [...new Set(allUnmappedFields)];

    const allValidationErrors = fieldMappedData.flatMap(item => item.mappingInfo?.validationErrors || []);

    return {
      catalogId: `catalog_mapped_${Date.now()}`,
      sourceId: 'mapped_source',
      sourceName: 'Mapped Source',
      createdAt: new Date().toISOString(),
      totalRecords: fieldMappedData.length,
      schema: this.analyzeSchema(records),
      records,
      summary: {
        dataTypes: ['field_mapped'],
        recordCount: fieldMappedData.length,
        fieldCount: Object.keys(fieldMappedData[0]?.catalogData || {}).length,
        sampleSize: fieldMappedData.length
      },
      metadata: {
        source: 'catalog_mapping',
        mappedFields: totalMappedFields,
        totalSourceFields,
        unmappedFields: uniqueUnmappedFields,
        validationErrors: allValidationErrors
      }
    };
  }

  /**
   * Detect the format of data
   */
  static detectDataFormat(data: unknown): DataFormat {
    if (!data) {
      return 'Unknown';
    }

    // Check for UnifiedDataCatalog format
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      // More lenient check - if it has totalRecords and records, it's likely a UnifiedDataCatalog
      if (obj.totalRecords !== undefined && obj.records !== undefined) {
        return 'UnifiedDataCatalog';
      }
    }

    // Check for array formats
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return 'RawArray';
      }

      const firstItem = data[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        const obj = firstItem as Record<string, unknown>;
        // Check for field-mapped format - look for any field mapping properties
        if (obj.catalogData !== undefined || obj.sourceData !== undefined || obj.mappingInfo !== undefined) {
          return 'FieldMappedArray';
        }
      }

      return 'RawArray';
    }

    return 'Unknown';
  }

  /**
   * Get record count from various data formats
   */
  static getRecordCount(data: unknown): number {
    if (!data) {
      return 0;
    }

    const format = this.detectDataFormat(data);

    switch (format) {
      case 'UnifiedDataCatalog':
        const catalog = data as UnifiedDataCatalog;
        return catalog.totalRecords || 0;
      
      case 'FieldMappedArray':
      case 'RawArray':
        const array = data as unknown[];
        return array.length;
      
      default:
        return 0;
    }
  }

  /**
   * Extract sample records from various data formats
   */
  static extractSampleRecords(data: unknown, count: number): Record<string, unknown>[] {
    if (!data || count <= 0) {
      return [];
    }

    const format = this.detectDataFormat(data);

    switch (format) {
      case 'UnifiedDataCatalog':
        const catalog = data as UnifiedDataCatalog;
        return catalog.records
          .slice(0, count)
          .map(record => record.data);
      
      case 'FieldMappedArray':
        const fieldMappedArray = data as FieldMappedRecord[];
        return fieldMappedArray
          .slice(0, count)
          .map(item => item.catalogData);
      
      case 'RawArray':
        const rawArray = data as Record<string, unknown>[];
        return rawArray.slice(0, count);
      
      default:
        return [];
    }
  }

  /**
   * Validate transformed data structure
   */
  static validateTransformedData(data: unknown): ValidationResult {
    const errors: string[] = [];

    if (!data) {
      errors.push('Data is null or undefined');
      return { isValid: false, errors };
    }

    if (typeof data !== 'object') {
      errors.push('Data must be an object or array');
      return { isValid: false, errors };
    }

    // First check if it looks like a partial UnifiedDataCatalog
    if (!Array.isArray(data)) {
      const obj = data as Record<string, unknown>;
      
      // Check if it has any UnifiedDataCatalog properties
      const hasUnifiedCatalogProps = obj.totalRecords !== undefined || 
                                   obj.records !== undefined || 
                                   obj.schema !== undefined;
      
      if (hasUnifiedCatalogProps) {
        // Validate as UnifiedDataCatalog
        if (obj.totalRecords === undefined) {
          errors.push('Missing totalRecords property');
        }
        if (obj.records === undefined) {
          errors.push('Missing records property');
        }
        if (obj.schema === undefined) {
          errors.push('Missing schema property');
        }
        return { isValid: errors.length === 0, errors };
      }
    }

    const format = this.detectDataFormat(data);

    switch (format) {
      case 'UnifiedDataCatalog':
        // Already handled above
        break;

      case 'FieldMappedArray':
        const fieldMappedArray = data as unknown[];
        for (let i = 0; i < fieldMappedArray.length; i++) {
          const item = fieldMappedArray[i];
          if (typeof item !== 'object' || item === null) {
            errors.push(`Item ${i} is not an object`);
            continue;
          }
          
          const obj = item as Record<string, unknown>;
          if (obj.catalogData === undefined) {
            errors.push(`Item ${i} missing catalogData`);
          }
          if (obj.sourceData === undefined) {
            errors.push(`Item ${i} missing sourceData`);
          }
          if (obj.mappingInfo === undefined) {
            errors.push(`Item ${i} missing mappingInfo`);
          }
        }
        break;

      case 'RawArray':
        // Raw arrays are generally valid
        break;

      case 'Unknown':
        errors.push('Unknown data format');
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}