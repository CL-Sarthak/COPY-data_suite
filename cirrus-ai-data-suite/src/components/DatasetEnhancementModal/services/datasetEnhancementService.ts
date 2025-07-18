import { DataSource } from '@/types/discovery';
import { DatasetAnalysis, EnhancementResult, FileInfo } from '../types/enhancement.types';
import { fileContentService } from './fileContentService';
import { logger } from '@/utils/logger';

export const datasetEnhancementService = {
  /**
   * Fetches full dataset records for enhancement
   */
  async fetchFullDataset(dataSource: DataSource): Promise<Record<string, unknown>[]> {
    logger.info('Fetching full dataset for enhancement from:', dataSource.id);
    
    let records: Record<string, unknown>[] = [];
    
    if (dataSource.type === 'json_transformed' || dataSource.type === 'filesystem') {
      // Try transform API first with skipPagination=true
      const transformResponse = await fetch(`/api/data-sources/${dataSource.id}/transform?skipPagination=true`);
      
      if (transformResponse.ok) {
        const catalogData = await transformResponse.json();
        logger.debug('Retrieved catalog data:', {
          totalRecords: catalogData?.totalRecords,
          returnedRecords: catalogData?.records?.length,
          truncated: catalogData?.meta?.truncated
        });
        
        // Handle truncated data
        if (catalogData?.meta?.truncated && catalogData?.meta?.downloadUrl) {
          logger.info('Dataset is truncated, fetching full dataset from:', catalogData.meta.downloadUrl);
          const downloadResponse = await fetch(catalogData.meta.downloadUrl);
          if (!downloadResponse.ok) {
            throw new Error(`Failed to download full dataset: ${downloadResponse.statusText}`);
          }
          
          const fullCatalog = await downloadResponse.json();
          logger.debug('Retrieved full dataset:', {
            totalRecords: fullCatalog.totalRecords,
            returnedRecords: fullCatalog.records?.length
          });
          
          records = this.extractRecordsFromCatalog(fullCatalog.records);
          
          // Verify record count
          if (records.length !== fullCatalog.totalRecords) {
            logger.warn(`Record count mismatch: expected ${fullCatalog.totalRecords}, got ${records.length}`);
          }
        } else {
          // Use non-truncated records
          records = this.extractRecordsFromCatalog(catalogData.records || []);
        }
      } else if (dataSource.type === 'filesystem') {
        // Fallback: parse stored content for filesystem sources
        records = await this.parseFilesystemContent(dataSource);
      } else {
        throw new Error('Unable to fetch dataset for enhancement');
      }
    } else {
      throw new Error('Dataset enhancement currently supports JSON data sources only');
    }
    
    logger.info(`Retrieved ${records.length} records for enhancement`);
    return records;
  },

  /**
   * Extracts records from catalog format
   */
  extractRecordsFromCatalog(catalogRecords: unknown[]): Record<string, unknown>[] {
    return catalogRecords.map((record: unknown) => {
      if (typeof record === 'object' && record !== null && 'data' in record) {
        return (record as { data: Record<string, unknown> }).data;
      }
      return record as Record<string, unknown>;
    });
  },

  /**
   * Parses filesystem content as fallback
   */
  async parseFilesystemContent(dataSource: DataSource): Promise<Record<string, unknown>[]> {
    const files = dataSource.configuration.files as FileInfo[] | undefined;
    if (!files || files.length === 0) {
      throw new Error('No data files found in data source');
    }
    
    // Find JSON file
    const jsonFile = files.find(file => 
      file.type === 'application/json' || 
      file.name.toLowerCase().endsWith('.json')
    );
    
    if (!jsonFile) {
      throw new Error('No JSON file found in data source');
    }
    
    const jsonContent = await fileContentService.getFileContent(jsonFile);
    
    try {
      const parsedRecords = JSON.parse(jsonContent);
      return Array.isArray(parsedRecords) ? parsedRecords : [parsedRecords];
    } catch (error) {
      logger.error('Failed to parse JSON content:', error);
      throw new Error('Unable to parse JSON content from data source');
    }
  },

  /**
   * Enhances dataset with selected fields
   */
  async enhanceDataset(
    dataSource: DataSource,
    analysis: DatasetAnalysis,
    selectedFields: Set<string>
  ): Promise<EnhancementResult> {
    // Get full dataset
    const records = await this.fetchFullDataset(dataSource);
    
    // Filter selected missing fields
    const selectedMissingFields = analysis.missingFields.filter(
      field => selectedFields.has(field.fieldName)
    );
    
    // Call enhancement API
    const response = await fetch('/api/dataset-enhancement/enhance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataSourceId: dataSource.id,
        dataSourceName: dataSource.name,
        datasetType: analysis.datasetType,
        records,
        selectedFields: selectedMissingFields
      })
    });

    if (!response.ok) {
      throw new Error(`Enhancement failed: ${response.statusText}`);
    }

    return await response.json();
  }
};