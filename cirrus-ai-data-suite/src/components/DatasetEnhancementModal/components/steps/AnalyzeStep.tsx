import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { AnalyzeStepProps } from '../../types/steps.types';
import { ActionButton } from '../shared/ActionButton';

export function AnalyzeStep({ onAnalyze, analyzing }: AnalyzeStepProps) {
  return (
    <div className="p-6">
      <div className="text-center py-8">
        <SparklesIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h4 className="text-xl font-semibold text-gray-900 mb-2">Analyze Dataset</h4>
        <p className="text-gray-700 mb-6 max-w-md mx-auto">
          We&apos;ll analyze your dataset to identify missing fields that would be typically 
          expected in similar datasets and suggest them for enhancement.
        </p>
        <ActionButton
          onClick={onAnalyze}
          loading={analyzing}
          icon={<SparklesIcon className="h-5 w-5" />}
          className="mx-auto"
        >
          {analyzing ? 'Analyzing Dataset...' : 'Analyze Dataset'}
        </ActionButton>
      </div>
    </div>
  );
}