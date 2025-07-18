import { useState, useCallback } from 'react';
import { DataSource } from '@/types/discovery';
import { DatasetAnalysis } from '../types/enhancement.types';
import { datasetAnalysisService } from '../services/datasetAnalysisService';
import { logger } from '@/utils/logger';

export function useDatasetAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeDataset = useCallback(async (dataSource: DataSource) => {
    setAnalyzing(true);
    setError(null);
    
    try {
      const result = await datasetAnalysisService.analyzeDataset(dataSource);
      setAnalysis(result);
      return result;
    } catch (err) {
      logger.error('Failed to analyze dataset:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze dataset';
      setError(errorMessage);
      throw err;
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const resetAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analyzing,
    analysis,
    error,
    analyzeDataset,
    resetAnalysis
  };
}