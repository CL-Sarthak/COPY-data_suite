import { logger } from '@/utils/logger';
import { FileInfo } from '../types/enhancement.types';

export const fileContentService = {
  /**
   * Retrieves file content, fetching from storage if needed
   */
  async getFileContent(file: FileInfo): Promise<string> {
    let fileContent = file.content;
    
    // Check if content is truncated or missing
    const isContentTruncated = fileContent?.includes('[Content truncated for database storage');
    if ((!fileContent || isContentTruncated) && file.storageKey) {
      try {
        const storageResponse = await fetch(`/api/storage/files/${file.storageKey}`);
        if (storageResponse.ok) {
          fileContent = await storageResponse.text();
        } else {
          logger.error('Storage response not OK:', {
            status: storageResponse.status,
            statusText: storageResponse.statusText,
            storageKey: file.storageKey
          });
          throw new Error(`Failed to retrieve file content from storage: ${storageResponse.statusText}`);
        }
      } catch (storageError) {
        logger.error('Error fetching from storage:', storageError);
        throw new Error('Unable to access file content from external storage');
      }
    }
    
    if (!fileContent) {
      throw new Error('No content found in data file');
    }
    
    return fileContent;
  },

  /**
   * Extracts a sample record from file content based on data source type
   */
  async extractSampleRecord(
    dataSourceType: string,
    files: FileInfo[],
    dataSourceId: string,
    hasTransformedData?: boolean
  ): Promise<Record<string, unknown>> {
    let sampleRecord: Record<string, unknown> = {};
    
    if (dataSourceType === 'json_transformed') {
      // For transformed JSON sources
      const fileContent = await this.getFileContent(files[0]);
      const records = JSON.parse(fileContent);
      if (Array.isArray(records) && records.length > 0) {
        sampleRecord = records[0].data || records[0];
      }
    } else if (dataSourceType === 'filesystem') {
      // Check for JSON files
      const hasJsonFiles = files.some(file => 
        file.type === 'application/json' || 
        file.name.toLowerCase().endsWith('.json')
      );
      
      if (hasJsonFiles) {
        const jsonFile = files.find(file => 
          file.type === 'application/json' || 
          file.name.toLowerCase().endsWith('.json')
        )!;
        const fileContent = await this.getFileContent(jsonFile);
        
        try {
          const jsonData = JSON.parse(fileContent);
          if (Array.isArray(jsonData) && jsonData.length > 0) {
            sampleRecord = jsonData[0];
          } else if (typeof jsonData === 'object' && jsonData !== null) {
            sampleRecord = jsonData;
          }
        } catch {
          throw new Error('Unable to parse JSON content from the data source');
        }
      } else if (hasTransformedData) {
        // Use transform API for transformed data
        const transformResponse = await fetch(`/api/data-sources/${dataSourceId}/transform`);
        if (transformResponse.ok) {
          const catalog = await transformResponse.json();
          if (catalog.records && catalog.records.length > 0) {
            sampleRecord = catalog.records[0].data;
          }
        } else {
          throw new Error('Unable to access transformed data');
        }
      } else {
        throw new Error('Dataset enhancement currently supports JSON data sources only. Please ensure your data source contains JSON files or has been transformed to JSON.');
      }
    } else {
      throw new Error('Dataset enhancement currently supports JSON data sources only');
    }
    
    logger.debug('Sample record for analysis:', sampleRecord);
    return sampleRecord;
  }
};