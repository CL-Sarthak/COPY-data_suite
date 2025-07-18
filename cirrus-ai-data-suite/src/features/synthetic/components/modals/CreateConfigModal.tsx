import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@/features/shared/components';
import { useConfigurations, useTemplates } from '../../hooks';
import { ConfigFormData } from '../../types';
import { dataSourceAPI } from '@/core/api';
import { DataSource } from '@/types/discovery';

interface CreateConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateConfigModal({ isOpen, onClose }: CreateConfigModalProps) {
  const { createConfig } = useConfigurations();
  const { templates, templateOptions, selectedTemplate, setSelectedTemplate, loading: templatesLoading } = useTemplates();
  
  const [formData, setFormData] = useState<ConfigFormData>({
    name: '',
    sourceId: '',
    templateId: '',
    privacyLevel: 'medium',
    recordCount: 10000,
    useTemplate: true
  });
  
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDataSources, setLoadingDataSources] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDataSources();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedTemplate) {
      setFormData(prev => ({ ...prev, templateId: selectedTemplate }));
    }
  }, [selectedTemplate]);

  const loadDataSources = async () => {
    try {
      setLoadingDataSources(true);
      const sources = await dataSourceAPI.getDataSources();
      setDataSources(sources);
    } catch (error) {
      console.error('Failed to load data sources:', error);
    } finally {
      setLoadingDataSources(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    if (formData.useTemplate && !formData.templateId) {
      return;
    }

    if (!formData.useTemplate && !formData.sourceId) {
      return;
    }

    setLoading(true);
    
    try {
      let schema = {};
      let dataType = 'custom';

      if (formData.useTemplate && formData.templateId) {
        schema = templates[formData.templateId];
        dataType = formData.templateId;
      } else if (formData.sourceId) {
        // Get schema from data source
        const schemaResponse = await dataSourceAPI.getSchema(formData.sourceId);
        
        if (schemaResponse.schema) {
          schema = schemaResponse.schema;
        } else if (schemaResponse.originalSchema?.fields) {
          // Convert to synthetic format
          schema = convertFieldsToSchema(schemaResponse.originalSchema.fields);
        } else if (schemaResponse.normalizedSchema?.fields) {
          schema = convertFieldsToSchema(schemaResponse.normalizedSchema.fields);
        }
        
        dataType = 'user-dataset';
      }

      const requestData = {
        name: formData.name,
        description: `Generated from ${formData.useTemplate ? `${formData.templateId} template` : 'data source'}`,
        dataType,
        recordCount: formData.recordCount,
        schema,
        outputFormat: 'json' as const,
        configuration: {
          seed: Math.floor(Math.random() * 10000),
          locale: 'en'
        },
        ...(formData.sourceId && !formData.useTemplate ? { sourceDataId: formData.sourceId } : {})
      };

      await createConfig(requestData);
      
      // Reset form and close
      setFormData({
        name: '',
        sourceId: '',
        templateId: '',
        privacyLevel: 'medium',
        recordCount: 10000,
        useTemplate: true
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to create configuration:', error);
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
      title="Create Synthetic Data Configuration"
      size="lg"
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

        <div className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                checked={formData.useTemplate}
                onChange={() => setFormData({ ...formData, useTemplate: true })}
                className="mr-2"
              />
              <span className="text-sm font-medium">Use Template</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={!formData.useTemplate}
                onChange={() => setFormData({ ...formData, useTemplate: false })}
                className="mr-2"
              />
              <span className="text-sm font-medium">Use Data Source</span>
            </label>
          </div>

          {formData.useTemplate ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Template
              </label>
              {templatesLoading ? (
                <div className="text-sm text-gray-600">Loading templates...</div>
              ) : (
                <select
                  value={formData.templateId}
                  onChange={(e) => {
                    setFormData({ ...formData, templateId: e.target.value });
                    setSelectedTemplate(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Choose a template</option>
                  {templateOptions.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Data Source
              </label>
              {loadingDataSources ? (
                <div className="text-sm text-gray-600">Loading data sources...</div>
              ) : (
                <select
                  value={formData.sourceId}
                  onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Choose a data source</option>
                  {dataSources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name} ({source.type})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
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
            Create Configuration
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Helper function to convert field array to schema object
function convertFieldsToSchema(fields: Array<{ name: string; type: string }>): Record<string, unknown> {
  const schema: Record<string, unknown> = {};
  
  fields.forEach(field => {
    schema[field.name] = {
      type: mapFieldType(field.type),
      required: false
    };
  });
  
  return schema;
}

function mapFieldType(type: string): string {
  const typeMap: Record<string, string> = {
    'string': 'text',
    'number': 'number',
    'integer': 'number',
    'boolean': 'boolean',
    'date': 'date',
    'datetime': 'datetime',
    'email': 'email',
    'phone': 'phone'
  };
  
  return typeMap[type.toLowerCase()] || 'text';
}