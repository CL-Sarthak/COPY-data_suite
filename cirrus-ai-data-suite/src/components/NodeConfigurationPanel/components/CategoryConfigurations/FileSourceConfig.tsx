import React from 'react';
import { CategoryConfigProps } from '../../types/configuration.types';
import { FormField } from '../shared/FormField';
import { SelectField } from '../shared/SelectField';
import { InfoBox } from '../shared/InfoBox';

export function FileSourceConfig({
  config,
  resources,
  onConfigChange,
  errors = {}
}: CategoryConfigProps) {
  const dataSourceOptions = resources.dataSources.map(ds => ({
    value: ds.id,
    label: ds.name
  }));

  return (
    <div className="space-y-4">
      <InfoBox
        type="info"
        message="Select a data source that has been uploaded to the system. The pipeline will process all files in the selected data source."
      />

      <FormField
        label="Data Source"
        required
        error={errors.dataSourceId}
      >
        <SelectField
          value={(config.dataSourceId as string) || ''}
          onChange={(value) => onConfigChange({ dataSourceId: value })}
          options={dataSourceOptions}
          placeholder="Select a data source"
        />
      </FormField>

      {config.dataSourceId && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm font-medium text-gray-700">Selected Source Details:</p>
          {(() => {
            const selected = resources.dataSources.find(ds => ds.id === config.dataSourceId);
            if (!selected) return null;
            
            return (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  Type: <span className="font-medium">{selected.type}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Files: <span className="font-medium">
                    {(selected.configuration as { files?: unknown[] })?.files?.length || 0}
                  </span>
                </p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}