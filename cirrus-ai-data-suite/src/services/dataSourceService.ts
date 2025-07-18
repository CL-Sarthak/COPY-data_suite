import { getDatabase } from '@/database/connection';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { getRepository, withRepository } from '@/database/repository-helper';
import { DataSource } from '@/types/discovery';
import { DataTransformationService, UnifiedDataCatalog } from './dataTransformationService';
import { StorageService } from './storage/storageService';
import * as fs from 'fs/promises';

export class DataSourceService {
  /**
   * Store files in external storage and return storage keys
   */
  private static async storeFiles(files: Array<{ name: string; content?: string }>, dataSourceId: string): Promise<string[]> {
    const storage = StorageService.getInstance();
    const storageKeys: string[] = [];

    for (const file of files) {
      if (file.content) {
        const key = StorageService.generateKey(`datasource/${dataSourceId}`, file.name);
        await storage.uploadFile(key, file.content, {
          contentType: StorageService.getContentType(file.name),
          metadata: {
            originalName: file.name,
            dataSourceId,
            uploadedAt: new Date().toISOString()
          }
        });
        storageKeys.push(key);
      }
    }

    return storageKeys;
  }

  /**
   * Retrieve files from external storage
   */
  private static async retrieveFiles(storageKeys: string[]): Promise<Array<{ name: string; content: string; storageKey: string }>> {
    const storage = StorageService.getInstance();
    const files: Array<{ name: string; content: string; storageKey: string }> = [];

    for (const key of storageKeys) {
      try {
        const content = await storage.getFileAsString(key);
        // Extract original name from metadata if possible, otherwise use key
        const fileName = key.split('/').pop() || key;
        files.push({
          name: fileName,
          content,
          storageKey: key
        });
      } catch (error) {
        console.warn(`Failed to retrieve file ${key}:`, error);
      }
    }

    return files;
  }

  static async createDataSource(dataSource: Omit<DataSource, 'id' | 'lastSync'>): Promise<DataSource> {
    try {
      console.log('=== DataSourceService.createDataSource START ===');
      console.log('Input dataSource:', {
        name: dataSource.name,
        type: dataSource.type,
        configSize: dataSource.configuration ? JSON.stringify(dataSource.configuration).length : 0,
        hasMetadata: !!dataSource.metadata
      });
      
      console.log('=== Getting Database Connection ===');
      const db = await getDatabase();
      console.log('Database connection obtained:', {
        type: db.options.type,
        isInitialized: db.isInitialized,
        hasDriver: !!db.driver
      });
      
      console.log('=== Creating Entity ===');
      const entity = new DataSourceEntity();
      entity.name = dataSource.name;
      entity.type = dataSource.type;
      entity.path = (dataSource.configuration as Record<string, unknown>)?.host as string || (dataSource.configuration as Record<string, unknown>)?.path as string;
      
      // Handle file storage using external storage service
      const config = { ...(dataSource.configuration || {}) } as Record<string, unknown>;
      let storageKeys: string[] = [];
      const storage = StorageService.getInstance();
      
      // First save entity to get ID for storage organization
      entity.configuration = JSON.stringify(config);
      entity.metadata = dataSource.metadata ? JSON.stringify(dataSource.metadata) : undefined;
      entity.recordCount = dataSource.recordCount || 0;
      entity.storageProvider = storage.getProviderName();
      
      console.log('=== Saving Initial Entity to Database ===');
      const repository = await getRepository(DataSourceEntity);
      const saved = await repository.save(entity);
      console.log('=== Initial Entity Saved, ID:', saved.id);
      
      // Now handle file storage with the actual entity ID
      if (config.files && Array.isArray(config.files)) {
        const files = config.files as Array<{ name: string; content?: string; storageKey?: string; [key: string]: unknown }>;
        console.log(`=== Processing ${files.length} files using ${storage.getProviderName()} provider ===`);
        
        // Debug: Log file details
        files.forEach(file => {
          console.log(`File: ${file.name}, HasContent: ${!!file.content}, ContentLength: ${file.content?.length || 0}, StorageKey: ${file.storageKey || 'none'}`);
        });
        
        try {
          // Check if files already have storage keys (from streaming upload)
          const filesWithStorageKeys = files.filter(f => f.storageKey);
          const filesWithoutStorageKeys = files.filter(f => !f.storageKey);
          
          if (filesWithStorageKeys.length > 0) {
            console.log(`=== ${filesWithStorageKeys.length} files already have storage keys from streaming upload ===`);
            // For files with storage keys, retrieve content if not present
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              if (file.storageKey && (!file.content || file.content === '')) {
                console.log(`=== Retrieving content for file ${file.name} from storage key ${file.storageKey} ===`);
                try {
                  const content = await storage.getFile(file.storageKey);
                  files[i] = {
                    ...file,
                    content: content.toString('utf-8'),
                    size: content.length,
                    originalContentLength: content.length
                  };
                  console.log(`=== Successfully retrieved ${content.length} bytes for ${file.name} ===`);
                } catch (e) {
                  console.error(`Failed to retrieve content for ${file.name} from ${file.storageKey}:`, e);
                  // Keep the file with empty content if retrieval fails
                  files[i] = {
                    ...file,
                    content: '',
                    contentTruncated: true,
                    originalContentLength: 0
                  };
                }
              }
            }
            // Use existing storage keys
            storageKeys = files.map(f => f.storageKey || '');
          }
          
          if (filesWithoutStorageKeys.length > 0) {
            console.log(`=== Storing ${filesWithoutStorageKeys.length} files in external storage ===`);
            // Store files without storage keys
            const newStorageKeys = await this.storeFiles(filesWithoutStorageKeys, saved.id);
            
            // Merge storage keys
            let newKeyIndex = 0;
            storageKeys = files.map(f => {
              if (f.storageKey) {
                return f.storageKey;
              } else {
                return newStorageKeys[newKeyIndex++];
              }
            });
          }
          
          // Now truncate content for database storage (but keep external storage reference)
          const isVercel = process.env.VERCEL || process.env.VERCEL_URL;
          const hasExternalDB = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
          const maxContentSize = (isVercel && !hasExternalDB) ? 100000 : 500000;
          
          config.files = files.map((file, index) => ({
            ...file,
            content: file.content && typeof file.content === 'string' && file.content.length > maxContentSize ? 
              file.content.substring(0, maxContentSize) + '\n\n... [Content truncated for database storage. Full content available in external storage.] ...' : 
              file.content,
            contentTruncated: file.content && typeof file.content === 'string' && file.content.length > maxContentSize,
            originalContentLength: file.content ? file.content.length : undefined,
            storageKey: storageKeys[index],
            storedInExternal: true
          }));
          
          // Update entity with storage information
          saved.configuration = JSON.stringify(config);
          saved.storageKeys = JSON.stringify(storageKeys);
          
          await repository.save(saved);
          console.log('=== Files stored in external storage and entity updated with truncated content ===');
          
        } catch (storageError) {
          console.error('=== Failed to store files in external storage ===', storageError);
          // Fall back to database storage with truncation for compatibility
          console.log('=== Falling back to database storage with content truncation (no external storage) ===');
          
          const isVercel = process.env.VERCEL || process.env.VERCEL_URL;
          const hasExternalDB = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
          const maxContentSize = (isVercel && !hasExternalDB) ? 100000 : 500000;
          
          config.files = files.map(file => ({
            ...file,
            content: file.content && typeof file.content === 'string' && file.content.length > maxContentSize ? 
              file.content.substring(0, maxContentSize) + '\n\n... [Content truncated for storage] ...' : 
              file.content,
            contentTruncated: file.content && typeof file.content === 'string' && file.content.length > maxContentSize,
            originalContentLength: file.content ? file.content.length : undefined,
            storedInExternal: false
          }));
          
          saved.configuration = JSON.stringify(config);
          await repository.save(saved);
        }
      }

      const result = {
        id: saved.id,
        name: saved.name,
        type: saved.type as DataSource['type'],
        connectionStatus: saved.connectionStatus as DataSource['connectionStatus'],
        configuration: JSON.parse(saved.configuration),
        metadata: saved.metadata && saved.metadata.trim() ? JSON.parse(saved.metadata) : undefined,
        recordCount: saved.recordCount || 0,
        lastSync: saved.lastSync,
        // Summary fields (will be null for new data sources)
        aiSummary: saved.aiSummary,
        userSummary: saved.userSummary,
        summaryGeneratedAt: saved.summaryGeneratedAt,
        summaryUpdatedAt: saved.summaryUpdatedAt,
        summaryVersion: saved.summaryVersion,
        // Keywords
        aiKeywords: saved.aiKeywords ? JSON.parse(saved.aiKeywords) : undefined,
        keywordsGeneratedAt: saved.keywordsGeneratedAt
      };

      // Automatic transformation to JSON
      if (saved.type === 'filesystem' || saved.type === 'json_transformed') {
        console.log('=== Starting automatic JSON transformation ===');
        try {
          // File content is now stored in external storage, we need to retrieve it for transformation
          const transformationConfig = JSON.parse(saved.configuration) as Record<string, unknown>;
          
          if (saved.storageKeys) {
            console.log('=== Retrieving files from external storage for transformation ===');
            try {
              const storageKeys = JSON.parse(saved.storageKeys) as string[];
              const retrievedFiles = await this.retrieveFiles(storageKeys);
              
              // Reconstruct file content for transformation
              if (transformationConfig.files && Array.isArray(transformationConfig.files)) {
                transformationConfig.files = (transformationConfig.files as Array<{ name: string; storageKey?: string; [key: string]: unknown }>).map(configFile => {
                  const retrievedFile = retrievedFiles.find(f => f.storageKey === configFile.storageKey);
                  return {
                    ...configFile,
                    content: retrievedFile?.content || ''
                  };
                });
              }
              
              console.log(`=== Retrieved ${retrievedFiles.length} files for transformation ===`);
            } catch (retrievalError) {
              console.error('=== Failed to retrieve files for transformation ===', retrievalError);
              console.log('=== Proceeding with transformation using available data ===');
            }
          }
          
          // Update result configuration with file content for transformation
          const resultWithFiles = {
            ...result,
            configuration: transformationConfig
          };

          // Transform to JSON (works with in-memory data, get all records)
          const catalog = await DataTransformationService.transformDataSource(resultWithFiles, { maxRecords: 0 });
          
          // Store transformed data in database
          saved.transformedData = JSON.stringify(catalog);
          saved.transformedAt = new Date();
          saved.recordCount = catalog.totalRecords; // Update with actual record count from transformation
          
          // Detect and save table information
          try {
            const { TableMetadataService } = await import('./tableMetadataService');
            const detectedTables = await TableMetadataService.detectTablesInData(catalog);
            
            if (detectedTables.length > 0) {
              await TableMetadataService.createOrUpdateTables(saved.id, detectedTables);
              saved.tableCount = detectedTables.length;
              saved.hasMultipleTables = detectedTables.length > 1;
            }
          } catch (tableError) {
            console.error('Failed to detect tables:', tableError);
          }
          
          // Save updated entity
          await repository.save(saved);
          
          const isServerless = process.env.VERCEL || process.env.VERCEL_URL;
          const hasExternalDB = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
          
          console.log('=== Automatic transformation completed ===', {
            catalogId: catalog.catalogId,
            recordCount: catalog.totalRecords,
            environment: isServerless ? 'serverless' : 'standard',
            hasExternalDB: !!hasExternalDB
          });
          
          // Transformation completed successfully
          
          // Generate keywords after transformation
          try {
            const { KeywordGenerationService } = await import('./keywordGenerationService');
            await KeywordGenerationService.generateKeywords(saved.id);
            console.log('=== Keywords generated successfully ===');
          } catch (keywordError) {
            console.error('=== Keyword generation failed ===', keywordError);
            // Don't fail the operation if keyword generation fails
          }
          
        } catch (error) {
          console.error('=== Automatic transformation failed ===', error);
          console.error('Environment context:', {
            isServerless: !!(process.env.VERCEL || process.env.VERCEL_URL),
            hasExternalDB: !!(process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL),
            nodeEnv: process.env.NODE_ENV,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
          // Don't fail the whole operation if transformation fails
        }
      }
      
      console.log('=== DataSourceService.createDataSource SUCCESS ===');
      return result;
    } catch (error) {
      console.error('=== DataSourceService: CRITICAL ERROR ===');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
      console.error('Error object:', error);
      
      // If table doesn't exist, throw error - migrations should handle schema
      if (error instanceof Error && (error.message.includes('no such table') || error.message.includes('relation') || error.message.includes('does not exist'))) {
        console.error('=== DataSourceService: Schema Error - Table Missing ===');
        console.error('Tables should be created by migrations. Ensure migrations have run.');
        throw new Error('Database schema not initialized. Please run migrations.');
      }
      
      // If metadata error in development, suggest restart
      if (error instanceof Error && error.message.includes('No metadata') && process.env.NODE_ENV === 'development') {
        console.error('=== DataSourceService: TypeORM Metadata Lost ===');
        console.error('This is a known issue with Next.js hot module reloading.');
        console.error('Please restart the development server: npm run dev');
        throw new Error('TypeORM metadata lost due to hot module reloading. Please restart the development server.');
      }
      
      // Don't retry - let the error propagate
      // Schema should be handled by migrations, not runtime synchronization
      throw error;
    }
  }

  static async getAllDataSources(): Promise<DataSource[]> {
    try {
      console.log('DataSourceService.getAllDataSources: Starting query...');
      console.log('DataSourceService.getAllDataSources: Using TypeORM repository...');
      const entities = await withRepository(DataSourceEntity, async (repository) => {
        return repository.find({
          order: { createdAt: 'DESC' }
        });
      });
      console.log(`DataSourceService.getAllDataSources: Found ${entities.length} data sources`);

      return entities.map(entity => {
        const configuration = JSON.parse(entity.configuration);
        return {
          id: entity.id,
          name: entity.name,
          type: entity.type as DataSource['type'],
          connectionStatus: entity.connectionStatus as DataSource['connectionStatus'],
          configuration,
          metadata: entity.metadata && entity.metadata.trim() ? JSON.parse(entity.metadata) : undefined,
          recordCount: entity.recordCount || 0,
          lastSync: entity.lastSync,
          transformedAt: entity.transformedAt,
          hasTransformedData: !!entity.transformedData,
          storageProvider: entity.storageProvider || 'database',
          transformationAppliedAt: entity.transformationAppliedAt,
          tags: entity.tags ? JSON.parse(entity.tags) : [],
          // Summary fields
          aiSummary: entity.aiSummary,
          userSummary: entity.userSummary,
          summaryGeneratedAt: entity.summaryGeneratedAt,
          summaryUpdatedAt: entity.summaryUpdatedAt,
          summaryVersion: entity.summaryVersion,
          // Keywords
          aiKeywords: entity.aiKeywords,
          keywordsGeneratedAt: entity.keywordsGeneratedAt
        };
      });
    } catch (error) {
      console.error('DataSourceService.getAllDataSources: Error occurred:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      
      // Return empty array for in-memory database that might not have tables yet
      if (error instanceof Error && (error.message.includes('no such table') || error.message.includes('relation') || error.message.includes('SQLITE_ERROR'))) {
        console.warn('DataSourceService.getAllDataSources: Table does not exist, returning empty array');
        return [];
      }
      throw error;
    }
  }

  static async getDataSourceById(id: string, includeFileContent: boolean = false): Promise<DataSource | null> {
    const db = await getDatabase();
    
    const repository = db.getRepository(DataSourceEntity);
    const entity = await repository.findOne({ where: { id } });

    if (!entity) return null;

    const configuration = JSON.parse(entity.configuration);

    // Populate file content from external storage if requested
    if (includeFileContent && entity.storageKeys) {
      try {
        const storageKeys = JSON.parse(entity.storageKeys) as string[];
        const retrievedFiles = await this.retrieveFiles(storageKeys);
        
        if (configuration.files && Array.isArray(configuration.files)) {
          configuration.files = (configuration.files as Array<{ name: string; storageKey?: string; [key: string]: unknown }>).map(configFile => {
            const retrievedFile = retrievedFiles.find(f => f.storageKey === configFile.storageKey);
            return {
              ...configFile,
              content: retrievedFile?.content || configFile.content || ''
            };
          });
        }
      } catch (error) {
        console.warn(`Failed to retrieve file content for data source ${id}:`, error);
      }
    }

    return {
      id: entity.id,
      name: entity.name,
      type: entity.type as DataSource['type'],
      connectionStatus: entity.connectionStatus as DataSource['connectionStatus'],
      configuration,
      metadata: entity.metadata && entity.metadata.trim() ? JSON.parse(entity.metadata) : undefined,
      recordCount: entity.recordCount,
      lastSync: entity.lastSync,
      transformedAt: entity.transformedAt,
      hasTransformedData: !!entity.transformedData,
      storageProvider: entity.storageProvider || 'database',
      transformationAppliedAt: entity.transformationAppliedAt,
      transformedData: includeFileContent ? entity.transformedData : undefined,
      tags: entity.tags ? JSON.parse(entity.tags) : [],
      // Summary fields
      aiSummary: entity.aiSummary,
      userSummary: entity.userSummary,
      summaryGeneratedAt: entity.summaryGeneratedAt,
      summaryUpdatedAt: entity.summaryUpdatedAt,
      summaryVersion: entity.summaryVersion,
      // Keywords
      aiKeywords: entity.aiKeywords,
      keywordsGeneratedAt: entity.keywordsGeneratedAt
    };
  }

  static async updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource | null> {
    const db = await getDatabase();
    
    const repository = db.getRepository(DataSourceEntity);
    const entity = await repository.findOne({ where: { id } });
    if (!entity) return null;

    if (updates.name) entity.name = updates.name;
    if (updates.configuration) {
      entity.configuration = JSON.stringify(updates.configuration);
      entity.path = (updates.configuration as Record<string, unknown>)?.host as string || (updates.configuration as Record<string, unknown>)?.path as string;
    }
    if (updates.metadata) entity.metadata = JSON.stringify(updates.metadata);
    if (updates.recordCount !== undefined) entity.recordCount = updates.recordCount;
    if (updates.transformedData !== undefined) entity.transformedData = updates.transformedData;

    const saved = await repository.save(entity);

    return {
      id: saved.id,
      name: saved.name,
      type: saved.type as DataSource['type'],
      connectionStatus: saved.connectionStatus as DataSource['connectionStatus'],
      configuration: JSON.parse(saved.configuration),
      metadata: saved.metadata && saved.metadata.trim() ? JSON.parse(saved.metadata) : undefined,
      recordCount: saved.recordCount || 0,
      lastSync: saved.lastSync,
      transformedAt: saved.transformedAt,
      hasTransformedData: !!saved.transformedData,
      // Summary fields
      aiSummary: saved.aiSummary,
      userSummary: saved.userSummary,
      summaryGeneratedAt: saved.summaryGeneratedAt,
      summaryUpdatedAt: saved.summaryUpdatedAt,
      summaryVersion: saved.summaryVersion
    };
  }

  static async deleteDataSource(id: string): Promise<boolean> {
    // Get entity to clean up storage
    const repository = await getRepository(DataSourceEntity);
    const entity = await repository.findOne({ where: { id } });
    if (entity) {
      // Clean up external storage files
      if (entity.storageKeys) {
        try {
          const storageKeys = JSON.parse(entity.storageKeys) as string[];
          const storage = StorageService.getInstance();
          await storage.deleteFiles(storageKeys);
          console.log(`Deleted ${storageKeys.length} files from external storage`);
        } catch (error) {
          console.error('Failed to delete files from external storage:', error);
        }
      }
      
      // Clean up legacy original files if they exist
      if (entity.originalPath) {
        try {
          await fs.rm(entity.originalPath, { recursive: true, force: true });
        } catch (error) {
          console.error('Failed to delete original files:', error);
        }
      }
    }
    
    const deleteResult = await repository.delete(id);
    
    console.log(`DataSourceService.deleteDataSource: Delete result for ${id}:`, deleteResult);
    return (deleteResult.affected ?? 0) > 0;
  }

  static async getTransformedData(id: string): Promise<UnifiedDataCatalog | null> {
    const db = await getDatabase();
    
    const repository = db.getRepository(DataSourceEntity);
    const entity = await repository.findOne({ where: { id } });

    if (!entity || !entity.transformedData) return null;

    try {
      return JSON.parse(entity.transformedData);
    } catch (error) {
      console.error('Failed to parse transformed data:', error);
      return null;
    }
  }

  static async hasTransformedData(id: string): Promise<boolean> {
    const db = await getDatabase();
    
    const repository = db.getRepository(DataSourceEntity);
    const entity = await repository.findOne({ where: { id } });

    return !!(entity?.transformedData);
  }

  /**
   * Process files uploaded via streaming
   * Retrieves file content from storage and creates proper file structures
   */
  static async processStreamingFiles(files: Array<{ name: string; storageKey: string }>): Promise<Array<{ name: string; type: string; size: number; content: string; contentTruncated: boolean; originalContentLength: number; storageKey: string }>> {
    const storageService = StorageService.getInstance();
    const processedFiles = [];

    for (const file of files) {
      try {
        // Get file metadata and content from storage
        const content = await storageService.getFile(file.storageKey);
        const contentString = content.toString('utf-8');
        
        // Determine file type from extension
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        const mimeTypes: Record<string, string> = {
          'txt': 'text/plain',
          'csv': 'text/csv',
          'json': 'application/json',
          'pdf': 'application/pdf',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        
        processedFiles.push({
          name: file.name,
          type: mimeTypes[extension] || 'application/octet-stream',
          size: content.length,
          content: contentString,
          contentTruncated: false,
          originalContentLength: contentString.length,
          storageKey: file.storageKey,
          storedInExternal: true
        });
      } catch (error) {
        console.error(`Failed to process streaming file ${file.name}:`, error);
        // Add placeholder for failed files
        processedFiles.push({
          name: file.name,
          type: 'application/octet-stream',
          size: 0,
          content: '',
          contentTruncated: false,
          originalContentLength: 0,
          storageKey: file.storageKey,
          storedInExternal: true,
          error: error instanceof Error ? error.message : 'Failed to retrieve file'
        });
      }
    }

    return processedFiles;
  }
}