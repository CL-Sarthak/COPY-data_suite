'use client';

import { useState } from 'react';
import { 
  XMarkIcon, 
  SparklesIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';
import { DatasetAnalysis } from '@/services/datasetEnhancementService';
import { DataSource } from '@/types/discovery';
import LLMIndicator from './LLMIndicator';
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

interface DatasetEnhancementModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSource: DataSource;
  onEnhancementComplete: (enhancedData: EnhancementResult) => void;
}

export default function DatasetEnhancementModal({ 
  isOpen, 
  onClose, 
  dataSource, 
  onEnhancementComplete 
}: DatasetEnhancementModalProps) {
  const [step, setStep] = useState<'analyze' | 'select' | 'enhance' | 'complete'>('analyze');
  const [analyzing, setAnalyzing] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [analysis, setAnalysis] = useState<DatasetAnalysis | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [enhancementResult, setEnhancementResult] = useState<EnhancementResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
      
      // If no direct content or content is truncated, fetch from external storage
      const isContentTruncated = fileContent?.includes('[Content truncated for database storage');
      if ((!fileContent || isContentTruncated) && firstFile.storageKey) {
        try {
          // Next.js automatically handles URL encoding for route parameters
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
      
      if (dataSource.type === 'json_transformed') {
        // For transformed JSON sources, parse the records and get the first one
        const records = JSON.parse(fileContent);
        if (Array.isArray(records) && records.length > 0) {
          sampleRecord = records[0].data || records[0];
        }
      } else if (dataSource.type === 'filesystem') {
        // For filesystem sources, check if they contain JSON files OR have been transformed to JSON
        const hasJsonFiles = files.some(file => 
          file.type === 'application/json' || 
          file.name.toLowerCase().endsWith('.json')
        );
        
        if (hasJsonFiles) {
          // Try to parse as JSON
          try {
            const jsonData = JSON.parse(fileContent);
            if (Array.isArray(jsonData) && jsonData.length > 0) {
              sampleRecord = jsonData[0];
            } else if (typeof jsonData === 'object' && jsonData !== null) {
              sampleRecord = jsonData;
            }
          } catch {
            throw new Error('Unable to parse JSON content from the data source');
          }
        } else if (dataSource.hasTransformedData) {
          // For sources that have been transformed (e.g., CSV -> JSON), use the transform API
          try {
            const transformResponse = await fetch(`/api/data-sources/${dataSource.id}/transform`);
            if (transformResponse.ok) {
              const catalog = await transformResponse.json();
              if (catalog.records && catalog.records.length > 0) {
                sampleRecord = catalog.records[0].data;
              }
            } else {
              throw new Error('Unable to access transformed data');
            }
          } catch {
            throw new Error('Unable to access transformed JSON data from the data source');
          }
        } else {
          throw new Error('Dataset enhancement currently supports JSON data sources only. Please ensure your data source contains JSON files or has been transformed to JSON.');
        }
      } else {
        // For other formats, we'd need to parse differently
        throw new Error('Dataset enhancement currently supports JSON data sources only');
      }

      logger.debug('Sample record for analysis:', sampleRecord);

      // Call the analysis API
      const response = await fetch('/api/dataset-enhancement/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sampleRecord,
          dataSourceId: dataSource.id
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const result = await response.json();
      setAnalysis(result.analysis);
      setStep('select');
      
    } catch (error) {
      logger.error('Failed to analyze dataset:', error);
      setError(error instanceof Error ? error.message : 'Failed to analyze dataset');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleFieldSelection = (fieldName: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(fieldName)) {
      newSelected.delete(fieldName);
    } else {
      newSelected.add(fieldName);
    }
    setSelectedFields(newSelected);
  };

  const enhanceDataset = async () => {
    if (!analysis || selectedFields.size === 0) return;
    
    setEnhancing(true);
    setError(null);
    
    try {
      // Get the full dataset using the transform API instead of truncated stored content
      logger.info('Fetching full dataset for enhancement from:', dataSource.id);
      
      let records: Record<string, unknown>[];
      let catalogData: { totalRecords?: number; records?: unknown[]; meta?: { truncated?: boolean; downloadUrl?: string } } | null = null; // Define catalogData in outer scope
      
      if (dataSource.type === 'json_transformed' || dataSource.type === 'filesystem') {
        // For transformed JSON sources or filesystem sources, try to get the full dataset via transform API
        // IMPORTANT: Use skipPagination=true to get ALL records for enhancement
        const transformResponse = await fetch(`/api/data-sources/${dataSource.id}/transform?skipPagination=true`);
        if (transformResponse.ok) {
          catalogData = await transformResponse.json();
          logger.debug('Retrieved catalog data:', {
            totalRecords: catalogData?.totalRecords,
            returnedRecords: catalogData?.records?.length,
            truncated: catalogData?.meta?.truncated
          });
          
          // If the data is truncated, we MUST get the full dataset
          if (catalogData?.meta?.truncated && catalogData?.meta?.downloadUrl) {
            logger.info('Dataset is truncated, fetching full dataset from:', catalogData.meta.downloadUrl);
            const downloadResponse = await fetch(catalogData.meta.downloadUrl);
            if (!downloadResponse.ok) {
              throw new Error(`Failed to download full dataset: ${downloadResponse.statusText}`);
            }
            
            const fullCatalog = await downloadResponse.json();
            logger.debug('Retrieved full dataset:', {
              totalRecords: fullCatalog.totalRecords,
              returnedRecords: fullCatalog.records?.length
            });
            
            records = fullCatalog.records.map((record: unknown) => {
              if (typeof record === 'object' && record !== null && 'data' in record) {
                return (record as { data: Record<string, unknown> }).data;
              }
              return record as Record<string, unknown>;
            });
            
            // Verify we got all records
            if (records.length !== fullCatalog.totalRecords) {
              logger.warn(`Record count mismatch: expected ${fullCatalog.totalRecords}, got ${records.length}`);
            }
          } else {
            // Use the records from the catalog response
            records = (catalogData?.records || []).map((record: unknown) => {
              if (typeof record === 'object' && record !== null && 'data' in record) {
                return (record as { data: Record<string, unknown> }).data;
              }
              return record as Record<string, unknown>;
            });
          }
        } else {
          // If transform API fails, fall back to parsing the stored content for filesystem sources
          if (dataSource.type === 'filesystem') {
            const files = dataSource.configuration.files as Array<{ name: string; content?: string; type?: string; storageKey?: string }> | undefined;
            if (!files || files.length === 0) {
              throw new Error('No data files found in data source');
            }
            
            // Find the first JSON file
            const jsonFile = files.find(file => 
              file.type === 'application/json' || 
              file.name.toLowerCase().endsWith('.json')
            );
            
            if (!jsonFile) {
              throw new Error('No JSON file found in data source');
            }
            
            let jsonContent = jsonFile.content;
            
            // If no direct content or content is truncated, fetch from external storage
            const isJsonContentTruncated = jsonContent?.includes('[Content truncated for database storage');
            if ((!jsonContent || isJsonContentTruncated) && jsonFile.storageKey) {
              try {
                // Use the storage key directly - Next.js will handle URL encoding
                const storageResponse = await fetch(`/api/storage/files/${jsonFile.storageKey}`);
                if (storageResponse.ok) {
                  jsonContent = await storageResponse.text();
                } else {
                  logger.error('Storage response not OK for JSON file:', {
                    status: storageResponse.status,
                    statusText: storageResponse.statusText,
                    storageKey: jsonFile.storageKey,
                    url: `/api/storage/files/${jsonFile.storageKey}`
                  });
                  throw new Error(`Failed to retrieve JSON file content from storage: ${storageResponse.statusText}`);
                }
              } catch (storageError) {
                logger.error('Error fetching JSON from storage:', storageError);
                throw new Error('Unable to access JSON file content from external storage');
              }
            }
            
            if (!jsonContent) {
              throw new Error('No JSON content found in data source files');
            }
            
            try {
              const parsedRecords = JSON.parse(jsonContent);
              records = Array.isArray(parsedRecords) ? parsedRecords : [parsedRecords];
            } catch {
              throw new Error('Failed to parse JSON content from data source');
            }
          } else {
            throw new Error('Failed to fetch data via transform API');
          }
        }
      } else {
        // For other data source types, not supported
        throw new Error('Dataset enhancement only supports JSON data sources');
      }
      
      logger.info(`Enhancement will process ${records.length} records`);
      
      // Ensure we have all records if the dataset was supposed to be larger
      if (catalogData && catalogData.totalRecords && records.length < catalogData.totalRecords) {
        // The transformed data is incomplete, we need to re-apply field mappings
        logger.warn(`Transformed data only has ${records.length} records but should have ${catalogData.totalRecords}. Checking if field mappings exist...`);
        
        // First check if field mappings exist
        const mappingsResponse = await fetch(`/api/catalog/mappings?sourceId=${dataSource.id}`);
        if (!mappingsResponse.ok) {
          logger.warn('No field mappings found. Proceeding with partial data.');
          // Continue with the partial data we have
        } else {
          const mappings = await mappingsResponse.json();
          if (!mappings || mappings.length === 0) {
            logger.warn('No field mappings configured. Cannot re-apply transformations.');
            // Continue with the partial data we have
          } else {
            // Force re-transformation to process all records
            const reapplyResponse = await fetch(`/api/data-sources/${dataSource.id}/transform/apply-mappings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            forceRetransform: true,
            validateOnly: false,
            includeValidationDetails: false
          })
        });
        
        if (!reapplyResponse.ok) {
          const errorData = await reapplyResponse.json().catch(() => ({ error: 'Unknown error' }));
          logger.error('Failed to re-apply field mappings:', errorData);
          throw new Error(`Failed to re-apply field mappings: ${errorData.error || 'Unknown error'}`);
        }
        
        const reapplyResult = await reapplyResponse.json();
        logger.info(`Re-applied field mappings: ${reapplyResult.statistics.totalRecords} records processed`);
        
        // Now fetch the newly transformed data
        if (catalogData.meta?.downloadUrl) {
          const retryDownloadResponse = await fetch(catalogData.meta.downloadUrl);
          if (!retryDownloadResponse.ok) {
            throw new Error('Failed to download re-transformed dataset');
          }
          
          const retryFullCatalog = await retryDownloadResponse.json();
          records = retryFullCatalog.records.map((record: unknown) => {
            if (typeof record === 'object' && record !== null && 'data' in record) {
              return (record as { data: Record<string, unknown> }).data;
            }
            return record as Record<string, unknown>;
          });
          
          // Final check
          if (records.length !== catalogData.totalRecords) {
            throw new Error(`Only retrieved ${records.length} records out of ${catalogData.totalRecords} total after re-transformation. Enhancement requires the full dataset.`);
          }
          
          logger.info(`Successfully loaded full dataset with ${records.length} records after re-transformation`);
        }
          }
        }
      }
      
      // Convert to the expected format
      const recordsData = records.map((record: unknown) => {
        if (typeof record === 'object' && record !== null && 'data' in record) {
          return (record as { data: Record<string, unknown> }).data;
        }
        return record;
      });

      // Get selected field suggestions
      const selectedFieldSuggestions = analysis.missingFields.filter(
        field => selectedFields.has(field.fieldName)
      );

      // Call the enhancement API
      const response = await fetch('/api/dataset-enhancement/enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataSourceId: dataSource.id,
          records: recordsData,
          selectedFields: selectedFieldSuggestions,
          enhancementName: `${dataSource.name} Enhanced`
        })
      });

      if (!response.ok) {
        throw new Error(`Enhancement failed: ${response.statusText}`);
      }

      const result = await response.json();
      setEnhancementResult(result);
      setStep('complete');
      
    } catch (error) {
      logger.error('Failed to enhance dataset:', error);
      setError(error instanceof Error ? error.message : 'Failed to enhance dataset');
    } finally {
      setEnhancing(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <ExclamationCircleIcon className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <InformationCircleIcon className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <InformationCircleIcon className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const handleComplete = () => {
    if (enhancementResult) {
      onEnhancementComplete(enhancementResult);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl border-2 border-gray-600 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DocumentPlusIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Dataset Enhancement</h3>
              <p className="text-sm text-gray-600">{dataSource.name}</p>
            </div>
            <LLMIndicator feature="datasetEnhancement" className="ml-4" />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Enhancement Failed</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Analyze */}
        {step === 'analyze' && (
          <div className="p-6">
            <div className="text-center py-8">
              <SparklesIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Analyze Dataset</h4>
              <p className="text-gray-700 mb-6 max-w-md mx-auto">
                We&apos;ll analyze your dataset to identify missing fields that would be typically 
                expected in similar datasets and suggest them for enhancement.
              </p>
              <button
                onClick={analyzeDataset}
                disabled={analyzing}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mx-auto"
              >
                {analyzing ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    Analyzing Dataset...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5" />
                    Analyze Dataset
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Fields */}
        {step === 'select' && analysis && (
          <div className="p-6">
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Suggested Fields</h4>
              <p className="text-gray-700">
                We found <strong>{analysis.missingFields.length}</strong> fields that could enhance your{' '}
                <strong>{analysis.datasetType}</strong> dataset. Select the fields you&apos;d like to add:
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {analysis.missingFields.map((field) => (
                <div
                  key={field.fieldName}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedFields.has(field.fieldName)
                      ? 'border-blue-500 bg-blue-50'
                      : `${getPriorityColor(field.priority)} hover:border-blue-300`
                  }`}
                  onClick={() => toggleFieldSelection(field.fieldName)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedFields.has(field.fieldName)}
                      onChange={() => {}} // Handled by div click
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getPriorityIcon(field.priority)}
                        <h5 className="font-medium text-gray-900">{field.fieldName}</h5>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {field.fieldType}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          field.priority === 'high' ? 'bg-red-100 text-red-700' :
                          field.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {field.priority} priority
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{field.description}</p>
                      <p className="text-xs text-gray-600">{field.reasoning}</p>
                      {field.dependencies && field.dependencies.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          Depends on: {field.dependencies.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {Number(selectedFields.size)} of {analysis.missingFields.length} fields selected
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('analyze')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={enhanceDataset}
                  disabled={selectedFields.size === 0 || enhancing}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {enhancing ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <DocumentPlusIcon className="h-4 w-4" />
                      Enhance Dataset
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && enhancementResult && (
          <div className="p-6">
            <div className="text-center py-8">
              <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Enhancement Complete!</h4>
              <p className="text-gray-800 mb-6">
                Your dataset has been successfully enhanced with {Number(selectedFields.size)} new fields. 
                Click &quot;Save Enhanced Dataset&quot; to create a new data source that will be available 
                throughout the platform for pattern definition, redaction, and other workflows.
              </p>
              
              {/* Enhancement Stats */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
                <h5 className="font-medium text-gray-900 mb-3">Enhancement Summary</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Records processed:</span>
                    <span className="font-medium">
                      {enhancementResult?.enhancementStats.enhancedRecords || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Fields added:</span>
                    <span className="font-medium">
                      {enhancementResult?.enhancementStats.addedFields || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Total fields:</span>
                    <span className="font-medium">
                      {enhancementResult?.enhancementStats.totalFields || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              >
                <DocumentPlusIcon className="h-5 w-5" />
                Save Enhanced Dataset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}