import React, { useState } from 'react';
import { Modal, Button } from '@/features/shared/components';
import { useConfigurations } from '../../hooks';
import { SyntheticDataConfig } from '../../types';

interface EditConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SyntheticDataConfig;
}

export function EditConfigModal({ isOpen, onClose, config }: EditConfigModalProps) {
  const { updateConfig } = useConfigurations();
  
  const [formData, setFormData] = useState({
    name: config.name,
    recordCount: config.configuration.recordCount,
    privacyLevel: config.privacyLevel
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    setLoading(true);
    
    try {
      const updateData = {
        name: formData.name,
        recordCount: formData.recordCount,
        outputFormat: config.outputFormat === 'sql' ? 'json' : config.outputFormat as 'json' | 'csv' | 'parquet',
        configuration: {
          ...config.configuration,
          recordCount: formData.recordCount
        }
      };

      await updateConfig(config.id, updateData);
      onClose();
    } catch (error) {
      console.error('Failed to update configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const privacyLevels = [
    { value: 'low', label: 'Low', description: 'Basic anonymization' },
    { value: 'medium', label: 'Medium', description: 'GDPR compliant' },
    { value: 'high', label: 'High', description: 'HIPAA compliant' },
    { value: 'maximum', label: 'Maximum', description: 'Maximum privacy' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Configuration"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Configuration Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter configuration name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Records
          </label>
          <input
            type="number"
            value={formData.recordCount}
            onChange={(e) => setFormData({ ...formData, recordCount: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="1"
            max="1000000"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Privacy Level
          </label>
          <div className="grid grid-cols-2 gap-3">
            {privacyLevels.map((level) => (
              <label
                key={level.value}
                className={`relative flex cursor-pointer rounded-lg border p-3 ${
                  formData.privacyLevel === level.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  value={level.value}
                  checked={formData.privacyLevel === level.value}
                  onChange={(e) => setFormData({ ...formData, privacyLevel: e.target.value as 'low' | 'medium' | 'high' })}
                  className="sr-only"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{level.label}</span>
                  <span className="text-xs text-gray-600">{level.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-600">
            <strong>Source:</strong> {config.sourceDataset}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Output Format:</strong> {config.outputFormat.toUpperCase()}
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            Update Configuration
          </Button>
        </div>
      </form>
    </Modal>
  );
}