import React from 'react';
import { CategoryConfigProps } from '../../types/configuration.types';
import { FormField } from '../shared/FormField';
import { InfoBox } from '../shared/InfoBox';

export function StreamSourceConfig({
  config,
  onConfigChange,
  errors = {}
}: CategoryConfigProps) {
  return (
    <div className="space-y-4">
      <InfoBox
        type="warning"
        message="Stream source is currently under development and not yet available."
      />

      <FormField
        label="Stream Topic"
        required
        error={errors.topic}
      >
        <input
          type="text"
          value={(config.topic as string) || ''}
          onChange={(e) => onConfigChange({ topic: e.target.value })}
          placeholder="user-events"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </FormField>

      <FormField
        label="Broker URL"
        error={errors.brokerUrl}
      >
        <input
          type="text"
          value={(config.brokerUrl as string) || ''}
          onChange={(e) => onConfigChange({ brokerUrl: e.target.value })}
          placeholder="kafka://localhost:9092"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </FormField>
    </div>
  );
}