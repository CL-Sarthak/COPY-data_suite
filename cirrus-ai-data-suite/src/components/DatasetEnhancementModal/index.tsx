'use client';

import React from 'react';
import { DatasetEnhancementModalProps } from './types/enhancement.types';
import { useEnhancementWorkflow } from './hooks/useEnhancementWorkflow';
import { EnhancementModal } from './components/EnhancementModal';
import { ErrorDisplay } from './components/ErrorDisplay';
import { AnalyzeStep } from './components/steps/AnalyzeStep';
import { SelectFieldsStep } from './components/steps/SelectFieldsStep';
import { CompleteStep } from './components/steps/CompleteStep';

export default function DatasetEnhancementModal({ 
  isOpen, 
  onClose, 
  dataSource, 
  onEnhancementComplete 
}: DatasetEnhancementModalProps) {
  const {
    step,
    analyzing,
    analysis,
    enhancing,
    enhancementResult,
    error,
    selectedFields,
    handleAnalyze,
    handleEnhance,
    handleComplete,
    toggleFieldSelection,
    goToStep
  } = useEnhancementWorkflow(dataSource, onEnhancementComplete, onClose);

  const renderStep = () => {
    switch (step) {
      case 'analyze':
        return (
          <AnalyzeStep
            dataSourceName={dataSource.name}
            onAnalyze={handleAnalyze}
            analyzing={analyzing}
            onNext={() => goToStep('select')}
          />
        );

      case 'select':
        return analysis ? (
          <SelectFieldsStep
            analysis={analysis}
            selectedFields={selectedFields}
            onToggleField={toggleFieldSelection}
            onEnhance={handleEnhance}
            enhancing={enhancing}
            onNext={() => goToStep('complete')}
            onBack={() => goToStep('analyze')}
          />
        ) : null;

      case 'complete':
        return enhancementResult ? (
          <CompleteStep
            enhancementResult={enhancementResult}
            selectedFieldsCount={selectedFields.size}
            onComplete={handleComplete}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <EnhancementModal
      isOpen={isOpen}
      onClose={onClose}
      dataSourceName={dataSource.name}
    >
      {error && <ErrorDisplay error={error} />}
      {renderStep()}
    </EnhancementModal>
  );
}

// Export types for external use
export type { DatasetEnhancementModalProps, EnhancementResult } from './types/enhancement.types';