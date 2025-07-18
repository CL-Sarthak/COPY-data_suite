'use client';

import React, { useState } from 'react';
import { 
  SparklesIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';
import { Modal, Button } from '@/features/shared/components';
import { DatasetAnalysis } from '@/services/datasetEnhancementService';
import { DataSource } from '@/types/discovery';
import LLMIndicator from '@/components/LLMIndicator';
import { logger } from '@/utils/logger';

interface EnhancementResult {
  success: boolean;
  enhancedRecords: Record<string, unknown>[];
  enhancementStats: {
    originalRecords: number;
    enhancedRecords: number;
    originalFields: number;
    addedFields: number;
    totalFields: number;
    fieldsAdded: Array<{
      name: string;
      type: string;
      description: string;
    }>;
  };
  enhancementName: string;
  timestamp: string;
}

interface EnhancementModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSource: DataSource;
  onEnhancementComplete: (enhancedData: EnhancementResult) => void;
}

export function EnhancementModal({ 
  isOpen, 
  onClose, 
  dataSource, 
  onEnhancementComplete 
}: EnhancementModalProps) {
  const [step, setStep] = useState<'analyze' | 'select' | 'enhance' | 'complete'>('analyze');
  const [analyzing, setAnalyzing] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [enhancementResult, setEnhancementResult] = useState<EnhancementResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeDataset = async () => {
    setAnalyzing(true);
    setError(null);
    
    try {
      // Get a sample record from the data source
      const files = dataSource.configuration.files as Array<{ name: string; content?: string; type?: string; storageKey?: string }> | undefined;
      if (!files || files.length === 0) {
        throw new Error('No data files found in data source');
      }
      
      const firstFile = files[0];
      let fileContent = firstFile.content;
      
      // If no direct content but has storage key, fetch from external storage
      if (!fileContent && firstFile.storageKey) {
        try {
          const storageResponse = await fetch(`/api/storage/files/${firstFile.storageKey}`);
          if (storageResponse.ok) {
            fileContent = await storageResponse.text();
          } else {
            logger.error('Storage response not OK:', {
              status: storageResponse.status,
              statusText: storageResponse.statusText,
              storageKey: firstFile.storageKey
            });
            throw new Error(`Failed to retrieve file content from storage: ${storageResponse.statusText}`);
          }
        } catch (storageError) {
          logger.error('Error fetching from storage:', storageError);
          throw new Error('Unable to access file content from external storage');
        }
      }
      
      if (!fileContent) {
        throw new Error('No content found in data file');
      }

      // Parse the content to get a sample record
      let sampleRecord: Record<string, unknown> = {};
      
      if (firstFile.type === 'application/json' || firstFile.name.endsWith('.json')) {
        const jsonData = JSON.parse(fileContent);
        const records = Array.isArray(jsonData) ? jsonData : jsonData.data || [jsonData];
        sampleRecord = records[0] || {};
      } else if (firstFile.type === 'text/csv' || firstFile.name.endsWith('.csv')) {
        const lines = fileContent.split('\n').filter(line => line.trim());
        if (lines.length >= 2) {
          const headers = lines[0].split(',').map(h => h.trim());
          const values = lines[1].split(',').map(v => v.trim());
          headers.forEach((header, index) => {
            sampleRecord[header] = values[index] || '';
          });
        }
      }

      // Call the enhancement analysis API
      const response = await fetch('/api/utility/dataset-enhancement/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleRecord })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze dataset');
      }

      const analysisResult = await response.json();
      setAnalysis(analysisResult);
      
      // Auto-select all suggested fields
      setSelectedFields(new Set(analysisResult.suggestedFields.map((f: { name: string }) => f.name)));
      
      setStep('select');
    } catch (error) {
      logger.error('Error analyzing dataset:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze dataset');
    } finally {
      setAnalyzing(false);
    }
  };

  const performEnhancement = async () => {
    if (!analysis || selectedFields.size === 0) return;
    
    setEnhancing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/utility/dataset-enhancement/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataSource,
          selectedFields: Array.from(selectedFields),
          analysis
        })
      });

      if (!response.ok) {
        throw new Error('Failed to enhance dataset');
      }

      const result = await response.json();
      setEnhancementResult(result);
      setStep('complete');
    } catch (error) {
      logger.error('Error enhancing dataset:', error);
      setError(error instanceof Error ? error.message : 'Failed to enhance dataset');
    } finally {
      setEnhancing(false);
    }
  };

  const handleComplete = () => {
    if (enhancementResult) {
      onEnhancementComplete(enhancementResult);
    }
    onClose();
  };

  const renderStepContent = () => {
    switch (step) {
      case 'analyze':
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <SparklesIcon className="mx-auto h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Analyze Dataset for Enhancement
              </h3>
              <p className="text-sm text-gray-600">
                We&apos;ll analyze your dataset and suggest additional fields that can be generated to enrich your data.
              </p>
            </div>
            
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                  <p className="ml-3 text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={analyzeDataset}
                loading={analyzing}
                icon={<ArrowPathIcon className="h-4 w-4" />}
              >
                {analyzing ? 'Analyzing...' : 'Start Analysis'}
              </Button>
            </div>
          </div>
        );

      case 'select':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select Fields to Add
              </h3>
              <p className="text-sm text-gray-600">
                Based on your dataset, we suggest adding the following fields:
              </p>
            </div>

            {analysis && (
              <>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">
                        <strong>Dataset Type:</strong> {analysis.datasetType}
                      </p>
                      <p className="text-sm text-blue-800 mt-1">
                        <strong>Existing Fields:</strong> {analysis.existingFields.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {analysis.missingFields.map((field) => (
                    <label
                      key={field.fieldName}
                      className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.has(field.fieldName)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedFields);
                          if (e.target.checked) {
                            newSelected.add(field.fieldName);
                          } else {
                            newSelected.delete(field.fieldName);
                          }
                          setSelectedFields(newSelected);
                        }}
                        className="mt-1 h-4 w-4 text-purple-600 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {field.fieldName}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {field.fieldType}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {field.description}
                        </p>
                        {field.reasoning && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            {field.reasoning}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                      <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                      <p className="ml-3 text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center gap-3 pt-4 border-t">
                  <Button
                    variant="secondary"
                    onClick={() => setStep('analyze')}
                  >
                    Back
                  </Button>
                  <div className="flex items-center gap-3">
                    <LLMIndicator />
                    <Button
                      onClick={performEnhancement}
                      loading={enhancing}
                      disabled={selectedFields.size === 0}
                      icon={<SparklesIcon className="h-4 w-4" />}
                    >
                      {enhancing ? 'Enhancing...' : `Enhance with ${selectedFields.size} Fields`}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Enhancement Complete!
              </h3>
              
              {enhancementResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left max-w-md mx-auto">
                  <h4 className="font-medium text-gray-900 mb-2">Enhancement Summary</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Original Records:</dt>
                      <dd className="font-medium">{enhancementResult.enhancementStats.originalRecords}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Enhanced Records:</dt>
                      <dd className="font-medium">{enhancementResult.enhancementStats.enhancedRecords}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Fields Added:</dt>
                      <dd className="font-medium">{enhancementResult.enhancementStats.addedFields}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Total Fields:</dt>
                      <dd className="font-medium">{enhancementResult.enhancementStats.totalFields}</dd>
                    </div>
                  </dl>
                  
                  {enhancementResult.enhancementStats.fieldsAdded.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <h5 className="text-sm font-medium text-gray-900 mb-1">New Fields:</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {enhancementResult.enhancementStats.fieldsAdded.map((field) => (
                          <li key={field.name}>
                            • {field.name} ({field.type})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                onClick={handleComplete}
                icon={<DocumentPlusIcon className="h-4 w-4" />}
              >
                Add to Synthetic Data
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dataset Enhancement"
      size="lg"
    >
      {renderStepContent()}
    </Modal>
  );
}