import React from 'react';
import { CheckCircleIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import { CompleteStepProps } from '../../types/steps.types';
import { SummaryStats } from '../shared/SummaryStats';
import { ActionButton } from '../shared/ActionButton';

export function CompleteStep({ 
  enhancementResult, 
  selectedFieldsCount, 
  onComplete 
}: CompleteStepProps) {
  return (
    <div className="p-6">
      <div className="text-center py-8">
        <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h4 className="text-xl font-semibold text-gray-900 mb-2">Enhancement Complete!</h4>
        <p className="text-gray-800 mb-6">
          Your dataset has been successfully enhanced with {selectedFieldsCount} new fields. 
          Click &quot;Save Enhanced Dataset&quot; to create a new data source that will be available 
          throughout the platform for pattern definition, redaction, and other workflows.
        </p>
        
        <div className="max-w-md mx-auto mb-6">
          <SummaryStats stats={enhancementResult.enhancementStats} />
        </div>

        <ActionButton
          onClick={onComplete}
          icon={<DocumentPlusIcon className="h-5 w-5" />}
          className="mx-auto"
        >
          Save Enhanced Dataset
        </ActionButton>
      </div>
    </div>
  );
}