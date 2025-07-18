import { useState, useCallback } from 'react';
import { DataSource } from '@/types/discovery';
import { EnhancementResult } from '../types/enhancement.types';
import { EnhancementStep } from '../types/steps.types';
import { datasetEnhancementService } from '../services/datasetEnhancementService';
import { useDatasetAnalysis } from './useDatasetAnalysis';
import { useFieldSelection } from './useFieldSelection';
import { logger } from '@/utils/logger';

export function useEnhancementWorkflow(
  dataSource: DataSource,
  onEnhancementComplete: (result: EnhancementResult) => void,
  onClose: () => void
) {
  const [step, setStep] = useState<EnhancementStep>('analyze');
  const [enhancing, setEnhancing] = useState(false);
  const [enhancementResult, setEnhancementResult] = useState<EnhancementResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { 
    analyzing, 
    analysis, 
    error: analysisError,
    analyzeDataset,
    resetAnalysis 
  } = useDatasetAnalysis();
  
  const { 
    selectedFields, 
    toggleFieldSelection,
    clearSelection 
  } = useFieldSelection();

  // Handle analyze step
  const handleAnalyze = useCallback(async () => {
    try {
      await analyzeDataset(dataSource);
      setStep('select');
      setError(null);
    } catch {
      // Error is already handled in useDatasetAnalysis
    }
  }, [dataSource, analyzeDataset]);

  // Handle enhancement
  const handleEnhance = useCallback(async () => {
    if (!analysis || selectedFields.size === 0) return;
    
    setEnhancing(true);
    setError(null);
    
    try {
      const result = await datasetEnhancementService.enhanceDataset(
        dataSource,
        analysis,
        selectedFields
      );
      
      setEnhancementResult(result);
      setStep('complete');
    } catch (err) {
      logger.error('Failed to enhance dataset:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to enhance dataset';
      setError(errorMessage);
    } finally {
      setEnhancing(false);
    }
  }, [dataSource, analysis, selectedFields]);

  // Handle completion
  const handleComplete = useCallback(() => {
    if (enhancementResult) {
      onEnhancementComplete(enhancementResult);
    }
    onClose();
  }, [enhancementResult, onEnhancementComplete, onClose]);

  // Navigation
  const goToStep = useCallback((newStep: EnhancementStep) => {
    setStep(newStep);
    setError(null);
  }, []);

  // Reset workflow
  const resetWorkflow = useCallback(() => {
    setStep('analyze');
    setEnhancementResult(null);
    setError(null);
    resetAnalysis();
    clearSelection();
  }, [resetAnalysis, clearSelection]);

  return {
    // State
    step,
    analyzing,
    analysis,
    enhancing,
    enhancementResult,
    error: error || analysisError,
    selectedFields,
    
    // Actions
    handleAnalyze,
    handleEnhance,
    handleComplete,
    toggleFieldSelection,
    goToStep,
    resetWorkflow
  };
}