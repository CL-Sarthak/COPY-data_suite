import React from 'react';
import { NodeConfig } from '../../types';
import { FormField } from '../shared/FormField';
import { InfoBox } from '../shared/InfoBox';
import { SelectField } from '../shared/SelectField';

interface TransformNodeConfigProps {
  config: NodeConfig;
  errors: Record<string, string>;
  onChange: (updates: Partial<NodeConfig>) => void;
  resources: {
    fields?: string[];
  };
}

export function TransformNodeConfig({ 
  config, 
  errors, 
  onChange,
  resources 
}: TransformNodeConfigProps) {
  const transformTypes = [
    { value: 'map', label: 'Map Fields' },
    { value: 'filter', label: 'Filter Records' },
    { value: 'aggregate', label: 'Aggregate Data' },
    { value: 'join', label: 'Join Datasets' },
    { value: 'custom', label: 'Custom Script' }
  ];

  return (
    <div className="space-y-4">
      <FormField label="Transform Type" error={errors.transformType}>
        <SelectField
          value={String(config.transformType || 'map')}
          onChange={(value) => onChange({ transformType: value })}
          options={transformTypes}
        />
      </FormField>

      {config.transformType === 'custom' && (
        <>
          <FormField label="Transform Script" error={errors.script}>
            <textarea
              value={String(config.script || '')}
              onChange={(e) => onChange({ script: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              rows={10}
              placeholder={`// Example transform script
function transform(record) {
  return {
    ...record,
    fullName: record.firstName + ' ' + record.lastName,
    timestamp: new Date().toISOString()
  };
}`}
            />
          </FormField>

          <InfoBox 
            type="info"
            message="The transform function receives each record and should return the transformed record. You can filter records by returning null."
          />
        </>
      )}

      {config.transformType === 'map' && (
        <>
          <FormField label="Field Mappings" error={errors.mappings}>
            <textarea
              value={String(config.mappings || '')}
              onChange={(e) => onChange({ mappings: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={6}
              placeholder={`{
  "outputField1": "inputField1",
  "outputField2": "inputField2",
  "combinedField": "{{field1}} {{field2}}"
}`}
            />
          </FormField>

          <InfoBox 
            type="info"
            message="Define field mappings as JSON. Use {{fieldName}} syntax to reference input fields."
          />
        </>
      )}

      {config.transformType === 'filter' && (
        <>
          <FormField label="Filter Expression" error={errors.filterExpression}>
            <textarea
              value={String(config.filterExpression || '')}
              onChange={(e) => onChange({ filterExpression: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder={`// Example: Keep records where age > 18
record.age > 18 && record.status === 'active'`}
            />
          </FormField>

          <InfoBox 
            type="info"
            message="Write a JavaScript expression that returns true for records to keep."
          />
        </>
      )}

      {config.transformType === 'aggregate' && (
        <>
          <FormField label="Group By Fields" error={errors.groupBy}>
            <input
              type="text"
              value={String(config.groupBy || '')}
              onChange={(e) => onChange({ groupBy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="category, region"
            />
          </FormField>

          <FormField label="Aggregations" error={errors.aggregations}>
            <textarea
              value={String(config.aggregations || '')}
              onChange={(e) => onChange({ aggregations: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder={`{
  "totalAmount": "SUM(amount)",
  "avgPrice": "AVG(price)",
  "count": "COUNT(*)"
}`}
            />
          </FormField>
        </>
      )}

      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Output Configuration</h4>
        
        <FormField label="Output Fields">
          <div className="text-sm text-gray-600">
            {resources.fields && resources.fields.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-1">
                {resources.fields.map((field) => (
                  <span key={field} className="px-2 py-1 bg-gray-100 rounded text-xs">
                    {field}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-500">Configure transform to see output fields</span>
            )}
          </div>
        </FormField>
      </div>
    </div>
  );
}