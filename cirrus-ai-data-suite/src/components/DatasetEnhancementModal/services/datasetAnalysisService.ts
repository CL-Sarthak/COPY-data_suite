import { DataSource } from '@/types/discovery';
import { DatasetAnalysis, FileInfo } from '../types/enhancement.types';
import { fileContentService } from './fileContentService';

export const datasetAnalysisService = {
  /**
   * Analyzes a dataset to identify missing fields
   */
  async analyzeDataset(dataSource: DataSource): Promise<DatasetAnalysis> {
    const files = dataSource.configuration.files as FileInfo[] | undefined;
    if (!files || files.length === 0) {
      throw new Error('No data files found in data source');
    }
    
    // Extract sample record for analysis
    const sampleRecord = await fileContentService.extractSampleRecord(
      dataSource.type,
      files,
      dataSource.id,
      dataSource.hasTransformedData
    );
    
    // Call the analysis API
    const response = await fetch('/api/dataset-enhancement/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sampleRecord,
        dataSourceId: dataSource.id
      })
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.analysis;
  }
};