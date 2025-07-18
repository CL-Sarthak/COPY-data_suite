import React from 'react';
import { NodeConfig } from '../../types';
import { FormField } from '../shared/FormField';
import { InfoBox } from '../shared/InfoBox';
import { SelectField } from '../shared/SelectField';

interface OutputNodeConfigProps {
  config: NodeConfig;
  errors: Record<string, string>;
  onChange: (updates: Partial<NodeConfig>) => void;
}

export function OutputNodeConfig({ 
  config, 
  errors, 
  onChange 
}: OutputNodeConfigProps) {
  const outputFormats = [
    { value: 'json', label: 'JSON' },
    { value: 'csv', label: 'CSV' },
    { value: 'parquet', label: 'Parquet' },
    { value: 'excel', label: 'Excel' },
    { value: 'database', label: 'Database' },
    { value: 's3', label: 'Amazon S3' },
    { value: 'azure', label: 'Azure Blob Storage' },
    { value: 'gcs', label: 'Google Cloud Storage' }
  ];

  const compressionTypes = [
    { value: 'none', label: 'None' },
    { value: 'gzip', label: 'Gzip' },
    { value: 'zip', label: 'Zip' },
    { value: 'bzip2', label: 'Bzip2' }
  ];

  return (
    <div className="space-y-4">
      <FormField label="Output Format" error={errors.format}>
        <SelectField
          value={String(config.format || 'json')}
          onChange={(value) => onChange({ format: value })}
          options={outputFormats}
        />
      </FormField>

      {(config.format === 'json' || config.format === 'csv' || config.format === 'excel') && (
        <>
          <FormField label="File Path" error={errors.destination}>
            <input
              type="text"
              value={String(config.destination || '')}
              onChange={(e) => onChange({ destination: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={`output.${config.format || 'json'}`}
            />
          </FormField>

          <FormField label="Compression">
            <SelectField
              value={String(config.compression || 'none')}
              onChange={(value) => onChange({ compression: value })}
              options={compressionTypes}
            />
          </FormField>
        </>
      )}

      {config.format === 'database' && (
        <>
          <FormField label="Connection String" error={errors.connectionString}>
            <input
              type="text"
              value={String(config.connectionString || '')}
              onChange={(e) => onChange({ connectionString: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="postgresql://user:pass@host:port/db"
            />
          </FormField>

          <FormField label="Table Name" error={errors.tableName}>
            <input
              type="text"
              value={String(config.tableName || '')}
              onChange={(e) => onChange({ tableName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="output_table"
            />
          </FormField>

          <FormField label="Write Mode">
            <SelectField
              value={String(config.writeMode || 'append')}
              onChange={(value) => onChange({ writeMode: value })}
              options={[
                { value: 'append', label: 'Append' },
                { value: 'overwrite', label: 'Overwrite' },
                { value: 'error', label: 'Error if exists' }
              ]}
            />
          </FormField>
        </>
      )}

      {(config.format === 's3' || config.format === 'azure' || config.format === 'gcs') && (
        <>
          <FormField label="Bucket/Container" error={errors.bucket}>
            <input
              type="text"
              value={String(config.bucket || '')}
              onChange={(e) => onChange({ bucket: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="my-bucket"
            />
          </FormField>

          <FormField label="Path/Key" error={errors.path}>
            <input
              type="text"
              value={String(config.path || '')}
              onChange={(e) => onChange({ path: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="data/output/file.json"
            />
          </FormField>

          {config.format === 's3' && (
            <FormField label="AWS Region">
              <input
                type="text"
                value={String(config.region || '')}
                onChange={(e) => onChange({ region: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="us-east-1"
              />
            </FormField>
          )}
        </>
      )}

      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Output Options</h4>
        
        {config.format === 'csv' && (
          <>
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={Boolean(config.includeHeaders !== false)}
                onChange={(e) => onChange({ includeHeaders: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Include headers</span>
            </label>

            <FormField label="Delimiter">
              <input
                type="text"
                value={String(config.delimiter || ',')}
                onChange={(e) => onChange({ delimiter: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={1}
              />
            </FormField>
          </>
        )}

        {config.format === 'json' && (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={Boolean(config.prettyPrint) || false}
              onChange={(e) => onChange({ prettyPrint: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm">Pretty print JSON</span>
          </label>
        )}

        <label className="flex items-center mt-2">
          <input
            type="checkbox"
            checked={Boolean(config.createMetadata) || false}
            onChange={(e) => onChange({ createMetadata: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm">Create metadata file</span>
        </label>
      </div>

      <InfoBox 
        type="info"
        message="Output nodes write the processed data to the specified destination. Ensure you have proper permissions for the chosen output format."
      />
    </div>
  );
}