'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  XMarkIcon,
  DocumentIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

import { NodeData } from '@/types/pipeline';
import { DataSource } from '@/types/discovery';
import { Pattern } from '@/services/patternService';
import { DataSchema } from '@/services/syntheticDataService';

interface NodeConfigurationPanelProps {
  node: {
    id: string;
    type: string;
    data: NodeData;
  };
  isOpen: boolean;
  onClose: () => void;
  onUpdateConfig: (nodeId: string, config: Record<string, unknown>) => void;
}

interface ConfigurationResources {
  dataSources: DataSource[];
  patterns: Pattern[];
  syntheticTemplates: Record<string, DataSchema>;
  loading: boolean;
  error: string | null;
}



export default function NodeConfigurationPanel({
  node,
  isOpen,
  onClose,
  onUpdateConfig
}: NodeConfigurationPanelProps) {
  const [config, setConfig] = useState<Record<string, unknown>>(node.data.config || {});
  const [resources, setResources] = useState<ConfigurationResources>({
    dataSources: [],
    patterns: [],
    syntheticTemplates: {},
    loading: true,
    error: null
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load existing resources from the application
  const loadResources = async () => {
    setResources(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const [dataSourcesRes, patternsRes, templatesRes] = await Promise.all([
        fetch('/api/data-sources'),
        fetch('/api/patterns'),
        fetch('/api/synthetic/templates')
      ]);

      const dataSources = dataSourcesRes.ok ? await dataSourcesRes.json() : [];
      const patterns = patternsRes.ok ? await patternsRes.json() : [];
      const templates = templatesRes.ok ? await templatesRes.json() : {};

      setResources({
        dataSources,
        patterns,
        syntheticTemplates: templates,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to load resources:', error);
      setResources(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load application resources'
      }));
    }
  };

  // Validate configuration with provided config object
  const validateConfiguration = useCallback((configToValidate?: Record<string, unknown>): string[] => {
    const errors: string[] = [];
    const cfg = configToValidate || config;
    
    // Source node validation
    if (node.type === 'source') {
      if (node.data.category === 'file' && !cfg.dataSourceId) {
        errors.push('Please select a data source');
      }
      if (node.data.category === 'database' && !cfg.query) {
        errors.push('Database query is required');
      }
      if (node.data.category === 'api' && !cfg.url) {
        errors.push('API URL is required');
      }
    }

    // Privacy node validation  
    if (node.type === 'privacy') {
      if (node.data.category === 'detection' && (!cfg.patternIds || (cfg.patternIds as string[]).length === 0)) {
        errors.push('Please select at least one detection pattern');
      }
      if (node.data.category === 'synthetic' && !cfg.templateName) {
        errors.push('Please select a synthetic data template');
      }
    }

    // Output node validation
    if (node.type === 'output') {
      if (node.data.category === 'environment' && !cfg.environmentId) {
        errors.push('Please select a target environment');
      }
    }

    return errors;
  }, [config, node.type, node.data.category]);

  // Load application resources when panel opens
  useEffect(() => {
    if (isOpen) {
      loadResources();
      // Initialize validation errors when modal opens
      setValidationErrors(validateConfiguration());
    }
  }, [isOpen, validateConfiguration]);

  // Update configuration
  const updateConfig = (key: string, value: unknown) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    setValidationErrors(validateConfiguration(newConfig));
  };

  // Save configuration
  const handleSave = () => {
    const errors = validateConfiguration();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    onUpdateConfig(node.id, config);
    onClose();
  };

  // Reset configuration
  const handleReset = () => {
    const originalConfig = node.data.config || {};
    setConfig(originalConfig);
    setValidationErrors(validateConfiguration(originalConfig));
  };

  if (!isOpen) return null;

  // Use portal to render outside of ReactFlow context
  if (typeof document !== 'undefined') {
    return ReactDOM.createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden border-2 border-gray-600">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-md flex items-center justify-center text-white"
              style={{ backgroundColor: node.data.color }}
            >
              {node.data.category === 'file' && <DocumentIcon className="w-5 h-5" />}
              {node.data.category === 'detection' && <ShieldCheckIcon className="w-5 h-5" />}
              {node.data.category === 'synthetic' && <SparklesIcon className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{node.data.label}</h2>
              <p className="text-sm text-gray-600 capitalize">
                {node.type} • {node.data.category}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          {/* Resource Loading State */}
          {resources.loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading application resources...</p>
            </div>
          )}

          {/* Resource Error */}
          {resources.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{resources.error}</p>
              <button
                onClick={loadResources}
                className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-700">Configuration Issues:</h4>
                  <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Source Node Configuration */}
          {node.type === 'source' && !resources.loading && (
            <div className="space-y-6">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md">
                <h3 className="text-lg font-medium text-blue-900 mb-2">Source Configuration</h3>
                <p className="text-sm text-blue-700">Configure how this node will access data from external sources.</p>
              </div>
              <div className="space-y-6">
              {node.data.category === 'file' && (
                <div className="bg-white p-4 border border-gray-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Data Source *
                  </label>
                  <select
                    value={(config.dataSourceId as string) || ''}
                    onChange={(e) => updateConfig('dataSourceId', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Select a data source...</option>
                    {resources.dataSources.map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name} ({ds.type})
                      </option>
                    ))}
                  </select>
                  {config.dataSourceId && typeof config.dataSourceId === 'string' ? (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                      <CheckCircleIcon className="w-4 h-4 inline mr-1" />
                      Connected to existing data source
                    </div>
                  ) : null}
                </div>
              )}

              {node.data.category === 'database' && (
                <div className="bg-white p-4 border border-gray-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    SQL Query *
                  </label>
                  <textarea
                    value={(config.query as string) || ''}
                    onChange={(e) => updateConfig('query', e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                    placeholder="SELECT * FROM table_name WHERE condition"
                  />
                  <p className="mt-2 text-xs text-gray-500">Enter a valid SQL query to retrieve data from the database</p>
                </div>
              )}

              {node.data.category === 'api' && (
                <div className="bg-white p-4 border border-gray-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    API URL *
                  </label>
                  <input
                    type="url"
                    value={(config.url as string) || ''}
                    onChange={(e) => updateConfig('url', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="https://api.example.com/data"
                  />
                  <p className="mt-2 text-xs text-gray-500">Enter the API endpoint URL to fetch data from</p>
                </div>
              )}
              </div>
            </div>
          )}

          {/* Privacy Node Configuration */}
          {node.type === 'privacy' && !resources.loading && (
            <div className="space-y-6">
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                <h3 className="text-lg font-medium text-red-900 mb-2">Privacy & Security Configuration</h3>
                <p className="text-sm text-red-700">Configure privacy protection, pattern detection, and data redaction settings.</p>
              </div>
              <div className="space-y-4">
              {node.data.category === 'detection' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detection Patterns *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 border border-gray-200 rounded-md p-4 bg-gray-50">
                    {resources.patterns.filter(p => p.isActive).map((pattern) => (
                      <label key={pattern.id} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-md hover:bg-blue-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={(config.patternIds as string[] || []).includes(pattern.id)}
                          onChange={(e) => {
                            const currentIds = config.patternIds as string[] || [];
                            const newIds = e.target.checked
                              ? [...currentIds, pattern.id]
                              : currentIds.filter(id => id !== pattern.id);
                            updateConfig('patternIds', newIds);
                          }}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 truncate">{pattern.name}</span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{pattern.type}</span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{pattern.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {config.patternIds && Array.isArray(config.patternIds) && config.patternIds.length > 0 ? (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                      <CheckCircleIcon className="w-4 h-4 inline mr-1" />
                      {config.patternIds.length} pattern(s) selected from pattern library
                    </div>
                  ) : null}
                </div>
              )}

              {node.data.category === 'synthetic' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Synthetic Data Template *
                  </label>
                  <select
                    value={(config.templateName as string) || ''}
                    onChange={(e) => updateConfig('templateName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a template...</option>
                    {Object.keys(resources.syntheticTemplates).map((templateName) => (
                      <option key={templateName} value={templateName}>
                        {templateName.charAt(0).toUpperCase() + templateName.slice(1)} Dataset
                      </option>
                    ))}
                  </select>
                  {config.templateName && typeof config.templateName === 'string' ? (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                      <CheckCircleIcon className="w-4 h-4 inline mr-1" />
                      Using existing synthetic data template
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Record Count
                    </label>
                    <input
                      type="number"
                      value={(config.recordCount as number) || 1000}
                      onChange={(e) => updateConfig('recordCount', parseInt(e.target.value))}
                      min="1"
                      max="100000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {node.data.category === 'redaction' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Redaction Method
                    </label>
                    <select
                      value={(config.redactionType as string) || 'mask'}
                      onChange={(e) => updateConfig('redactionType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="mask">Mask Characters</option>
                      <option value="remove">Remove Completely</option>
                      <option value="hash">Hash Values</option>
                      <option value="replace">Replace with Fake Data</option>
                    </select>
                  </div>

                  {config.redactionType === 'mask' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mask Character
                      </label>
                      <input
                        type="text"
                        maxLength={1}
                        value={(config.maskCharacter as string) || '*'}
                        onChange={(e) => updateConfig('maskCharacter', e.target.value)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
          )}

          {/* Transform Node Configuration */}
          {node.type === 'transform' && !resources.loading && (
            <div className="space-y-6">
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
                <h3 className="text-lg font-medium text-green-900 mb-2">Data Transformation Configuration</h3>
                <p className="text-sm text-green-700">Configure how data will be transformed, mapped, and converted between formats.</p>
              </div>
              <div className="space-y-4">
              {node.data.category === 'mapping' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Mappings
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Configure how fields should be mapped and transformed
                  </p>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                    Field mapping configuration will be available when connected to a data source
                  </div>
                </div>
              )}

              {node.data.category === 'format' && (
                <div className="bg-white p-4 border border-gray-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Output Format
                  </label>
                  <div className="space-y-3">
                    <select
                      value={(config.outputFormat as string) || 'json'}
                      onChange={(e) => updateConfig('outputFormat', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="json">JSON</option>
                      <option value="csv">CSV</option>
                      <option value="parquet">Parquet</option>
                      <option value="avro">Avro</option>
                    </select>
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-700">
                          <p className="font-medium mb-1">Format Guide:</p>
                          <ul className="space-y-1 text-xs">
                            <li><strong>JSON:</strong> Human-readable, ideal for APIs and web services</li>
                            <li><strong>CSV:</strong> Simple tabular format, works with Excel and most tools</li>
                            <li><strong>Parquet:</strong> Columnar format for analytics, 70-90% smaller than CSV</li>
                            <li><strong>Avro:</strong> Compact binary with schema, perfect for data pipelines</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          )}

          {/* Output Node Configuration */}
          {node.type === 'output' && !resources.loading && (
            <div className="space-y-6">
              <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-md">
                <h3 className="text-lg font-medium text-purple-900 mb-2">Output & Deployment Configuration</h3>
                <p className="text-sm text-purple-700">Configure where and how processed data will be exported or deployed.</p>
              </div>
              <div className="space-y-4">
              {node.data.category === 'environment' && (
                <div className="bg-white p-4 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Target Environment *
                      </label>
                      <select
                        value={(config.environmentId as string) || ''}
                        onChange={(e) => updateConfig('environmentId', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">Select target environment...</option>
                        <option value="dev">Development Environment</option>
                        <option value="staging">Staging Environment</option>
                        <option value="prod">Production Environment</option>
                        <option value="ml_training">ML Training Environment</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Deployment Strategy
                      </label>
                      <select
                        value={(config.deploymentStrategy as string) || 'blue_green'}
                        onChange={(e) => updateConfig('deploymentStrategy', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="blue_green">Blue-Green Deployment</option>
                        <option value="rolling">Rolling Update</option>
                        <option value="canary">Canary Release</option>
                        <option value="immediate">Immediate Replace</option>
                      </select>
                    </div>
                  </div>

                  {config.environmentId && typeof config.environmentId === 'string' ? (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                      <CheckCircleIcon className="w-4 h-4 inline mr-1" />
                      Connected to {config.environmentId} environment
                    </div>
                  ) : null}
                </div>
              )}

              {node.data.category === 'ml' && (
                <div className="bg-white p-4 border border-gray-200 rounded-lg">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          ML Framework
                        </label>
                        <select
                          value={(config.framework as string) || 'tensorflow'}
                          onChange={(e) => updateConfig('framework', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="tensorflow">TensorFlow</option>
                          <option value="pytorch">PyTorch</option>
                          <option value="scikit-learn">Scikit-Learn</option>
                          <option value="xgboost">XGBoost</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Output Format
                        </label>
                        <select
                          value={(config.format as string) || 'tfrecord'}
                          onChange={(e) => updateConfig('format', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="tfrecord">TFRecord</option>
                          <option value="parquet">Parquet</option>
                          <option value="hdf5">HDF5</option>
                          <option value="csv">CSV</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <InformationCircleIcon className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-purple-700">
                          <p className="font-medium mb-1">ML Format Guide:</p>
                          <ul className="space-y-1 text-xs">
                            <li><strong>TFRecord:</strong> TensorFlow&apos;s optimized format for training data</li>
                            <li><strong>Parquet:</strong> Efficient columnar format, great for feature engineering</li>
                            <li><strong>HDF5:</strong> Hierarchical format for large numerical datasets</li>
                            <li><strong>CSV:</strong> Simple format, good for small datasets and prototyping</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(node.data.category === 'file' || !node.data.category) && (
                <div className="bg-white p-4 border border-gray-200 rounded-lg">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Output Destination
                      </label>
                      <select
                        value={(config.destination as string) || 'file'}
                        onChange={(e) => updateConfig('destination', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="file">File Export</option>
                        <option value="database">Database</option>
                        <option value="api">API Endpoint</option>
                        <option value="cloud">Cloud Storage</option>
                      </select>
                    </div>

                    {config.destination === 'file' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            File Format
                          </label>
                          <select
                            value={(config.format as string) || 'csv'}
                            onChange={(e) => updateConfig('format', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          >
                            <option value="csv">CSV</option>
                            <option value="json">JSON</option>
                            <option value="xlsx">Excel</option>
                            <option value="parquet">Parquet</option>
                          </select>
                        </div>
                        
                        <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                          <div className="flex items-start gap-2">
                            <InformationCircleIcon className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-orange-700">
                              <p className="font-medium mb-1">File Format Guide:</p>
                              <ul className="space-y-1 text-xs">
                                <li><strong>CSV:</strong> Universal tabular format, opens in Excel</li>
                                <li><strong>JSON:</strong> Structured data for applications and APIs</li>
                                <li><strong>Excel:</strong> Native spreadsheet format for business users</li>
                                <li><strong>Parquet:</strong> Compressed columnar format for data lakes</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={validationErrors.length > 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
  }
  
  return null;
}