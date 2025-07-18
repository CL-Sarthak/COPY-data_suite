import React from 'react';
import { DocumentPlusIcon } from '@heroicons/react/24/outline';
import { SelectFieldsStepProps } from '../../types/steps.types';
import { FieldList } from '../field-selection/FieldList';
import { ActionButton } from '../shared/ActionButton';

export function SelectFieldsStep({
  analysis,
  selectedFields,
  onToggleField,
  onEnhance,
  enhancing,
  onBack
}: SelectFieldsStepProps) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-2">Suggested Fields</h4>
        <p className="text-gray-700">
          We found <strong>{analysis.missingFields.length}</strong> fields that could enhance your{' '}
          <strong>{analysis.datasetType}</strong> dataset. Select the fields you&apos;d like to add:
        </p>
      </div>

      <FieldList
        fields={analysis.missingFields}
        selectedFields={selectedFields}
        onToggleField={onToggleField}
      />

      <div className="flex justify-between items-center mt-6">
        <p className="text-sm text-gray-600">
          {selectedFields.size} of {analysis.missingFields.length} fields selected
        </p>
        <div className="flex gap-3">
          <ActionButton
            onClick={onBack!}
            variant="secondary"
          >
            Back
          </ActionButton>
          <ActionButton
            onClick={onEnhance}
            disabled={selectedFields.size === 0}
            loading={enhancing}
            variant="success"
            icon={<DocumentPlusIcon className="h-4 w-4" />}
          >
            {enhancing ? 'Enhancing...' : 'Enhance Dataset'}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}