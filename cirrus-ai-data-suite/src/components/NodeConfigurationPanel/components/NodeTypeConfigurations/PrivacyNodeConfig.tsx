import React from 'react';
import { NodeConfig } from '../../types';
import { FormField } from '../shared/FormField';
import { InfoBox } from '../shared/InfoBox';
import { SelectField } from '../shared/SelectField';

interface PrivacyNodeConfigProps {
  config: NodeConfig;
  errors: Record<string, string>;
  onChange: (updates: Partial<NodeConfig>) => void;
  resources: {
    patterns?: Array<{ id: string; name: string; category: string }>;
  };
}

export function PrivacyNodeConfig({ 
  config, 
  errors, 
  onChange,
  resources 
}: PrivacyNodeConfigProps) {
  const actionTypes = [
    { value: 'redact', label: 'Redact (Replace with ****)' },
    { value: 'mask', label: 'Mask (Partial hiding)' },
    { value: 'encrypt', label: 'Encrypt' },
    { value: 'tokenize', label: 'Tokenize' },
    { value: 'remove', label: 'Remove Field' }
  ];

  const confidenceLevels = [
    { value: 'high', label: 'High (>90%)' },
    { value: 'medium', label: 'Medium (>70%)' },
    { value: 'low', label: 'Low (>50%)' },
    { value: 'all', label: 'All Matches' }
  ];

  const selectedPatterns = Array.isArray(config.patterns) ? config.patterns as string[] : [];
  const availablePatterns = resources.patterns || [];

  const togglePattern = (patternId: string) => {
    const newPatterns = selectedPatterns.includes(patternId)
      ? selectedPatterns.filter(id => id !== patternId)
      : [...selectedPatterns, patternId];
    onChange({ patterns: newPatterns });
  };

  return (
    <div className="space-y-4">
      <FormField label="Privacy Patterns" error={errors.patterns}>
        <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
          {availablePatterns.length > 0 ? (
            availablePatterns.map((pattern) => (
              <label
                key={pattern.id}
                className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedPatterns.includes(pattern.id)}
                  onChange={() => togglePattern(pattern.id)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <span className="font-medium">{pattern.name}</span>
                  <span className="ml-2 text-xs text-gray-500">({pattern.category})</span>
                </div>
              </label>
            ))
          ) : (
            <p className="text-sm text-gray-500 p-2">No patterns available</p>
          )}
        </div>
      </FormField>

      <FormField label="Privacy Action" error={errors.action}>
        <SelectField
          value={String(config.action || 'redact')}
          onChange={(value) => onChange({ action: value })}
          options={actionTypes}
        />
      </FormField>

      {config.action === 'mask' && (
        <FormField label="Mask Pattern" error={errors.maskPattern}>
          <input
            type="text"
            value={String(config.maskPattern || '')}
            onChange={(e) => onChange({ maskPattern: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., XXX-XX-#### for SSN"
          />
        </FormField>
      )}

      {config.action === 'encrypt' && (
        <>
          <FormField label="Encryption Key" error={errors.encryptionKey}>
            <input
              type="password"
              value={String(config.encryptionKey || '')}
              onChange={(e) => onChange({ encryptionKey: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter encryption key"
            />
          </FormField>

          <FormField label="Encryption Algorithm">
            <SelectField
              value={String(config.encryptionAlgorithm || 'aes-256')}
              onChange={(value) => onChange({ encryptionAlgorithm: value })}
              options={[
                { value: 'aes-256', label: 'AES-256' },
                { value: 'aes-128', label: 'AES-128' },
                { value: 'rsa', label: 'RSA' }
              ]}
            />
          </FormField>
        </>
      )}

      <FormField label="Confidence Threshold" error={errors.confidenceThreshold}>
        <SelectField
          value={String(config.confidenceThreshold || 'medium')}
          onChange={(value) => onChange({ confidenceThreshold: value })}
          options={confidenceLevels}
        />
      </FormField>

      <FormField label="Exclude Fields">
        <input
          type="text"
          value={String(config.excludeFields || '')}
          onChange={(e) => onChange({ excludeFields: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="field1, field2 (comma-separated)"
        />
      </FormField>

      <div className="border-t pt-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={Boolean(config.preserveFormat) || false}
            onChange={(e) => onChange({ preserveFormat: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm">Preserve original format (e.g., XXX-XX-1234 for SSN)</span>
        </label>

        <label className="flex items-center mt-2">
          <input
            type="checkbox"
            checked={Boolean(config.generateReport) || false}
            onChange={(e) => onChange({ generateReport: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm">Generate privacy report</span>
        </label>
      </div>

      <InfoBox 
        type="warning"
        message="Privacy operations are irreversible. Ensure you have backups of original data."
      />
    </div>
  );
}