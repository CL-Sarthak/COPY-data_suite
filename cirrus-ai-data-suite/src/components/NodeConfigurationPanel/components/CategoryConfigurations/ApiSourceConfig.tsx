import React from 'react';
import { CategoryConfigProps } from '../../types/configuration.types';
import { FormField } from '../shared/FormField';
import { SelectField } from '../shared/SelectField';
import { InfoBox } from '../shared/InfoBox';

export function ApiSourceConfig({
  config,
  onConfigChange,
  errors = {}
}: CategoryConfigProps) {
  const methodOptions = [
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'DELETE', label: 'DELETE' }
  ];

  return (
    <div className="space-y-4">
      <InfoBox
        type="info"
        message="Configure API endpoint to fetch data from external services."
      />

      <FormField
        label="API Endpoint"
        required
        error={errors.endpoint}
      >
        <input
          type="text"
          value={(config.endpoint as string) || ''}
          onChange={(e) => onConfigChange({ endpoint: e.target.value })}
          placeholder="https://api.example.com/data"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </FormField>

      <FormField
        label="HTTP Method"
        required
        error={errors.method}
      >
        <SelectField
          value={(config.method as string) || ''}
          onChange={(value) => onConfigChange({ method: value })}
          options={methodOptions}
          placeholder="Select method"
        />
      </FormField>

      <FormField
        label="Headers (JSON)"
        error={errors.headers}
      >
        <textarea
          value={(config.headers as string) || ''}
          onChange={(e) => onConfigChange({ headers: e.target.value })}
          placeholder='{"Authorization": "Bearer token"}'
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
      </FormField>
    </div>
  );
}