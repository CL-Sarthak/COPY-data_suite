import React from 'react';
import { CategoryConfigProps } from '../../types/configuration.types';
import { FormField } from '../shared/FormField';
import { InfoBox } from '../shared/InfoBox';

export function DatabaseSourceConfig({
  config,
  onConfigChange,
  errors = {}
}: CategoryConfigProps) {
  return (
    <div className="space-y-4">
      <InfoBox
        type="info"
        message="Configure database connection to source data directly from your database."
      />

      <FormField
        label="Connection String"
        required
        error={errors.connectionString}
      >
        <input
          type="text"
          value={(config.connectionString as string) || ''}
          onChange={(e) => onConfigChange({ connectionString: e.target.value })}
          placeholder="postgresql://user:password@host:port/database"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </FormField>

      <FormField
        label="Table Name"
        required
        error={errors.table}
      >
        <input
          type="text"
          value={(config.table as string) || ''}
          onChange={(e) => onConfigChange({ table: e.target.value })}
          placeholder="users"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </FormField>

      <FormField
        label="Query (Optional)"
        error={errors.query}
      >
        <textarea
          value={(config.query as string) || ''}
          onChange={(e) => onConfigChange({ query: e.target.value })}
          placeholder="SELECT * FROM users WHERE created_at > '2024-01-01'"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </FormField>
    </div>
  );
}