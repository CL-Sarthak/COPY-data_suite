'use client';

import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { SyntheticDataConfig, SyntheticDataJob } from '@/types/synthetic';
import { DataSource } from '@/types/discovery';
import DatasetEnhancementModal from '@/components/DatasetEnhancementModal';
import { useToastActions } from '@/contexts/ToastContext';
import { useDialog } from '@/contexts/DialogContext';
import LLMIndicator from '@/components/LLMIndicator';
import { 
  SparklesIcon,
  CogIcon,
  PlayIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  TrashIcon,
  DocumentPlusIcon,
  ArrowsRightLeftIcon,
  EyeIcon,
  PlusCircleIcon
} from '@heroicons/react/24/outline';

export default function SyntheticData() {
  const toast = useToastActions();
  const dialog = useDialog();
  const [configs, setConfigs] = useState<SyntheticDataConfig[]>([]);
  const [jobs, setJobs] = useState<SyntheticDataJob[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [templates, setTemplates] = useState<Record<string, Record<string, unknown>>>({});
  
  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // SSE connection for real-time updates (using setter pattern to avoid direct usage)
  const [, setEventSource] = useState<EventSource | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Dataset Enhancement state
  const [showEnhancementModal, setShowEnhancementModal] = useState(false);
  const [selectedDataSourceForEnhancement, setSelectedDataSourceForEnhancement] = useState<DataSource | null>(null);

  const [showNewConfig, setShowNewConfig] = useState(false);
  const [newConfigName, setNewConfigName] = useState('');
  const [newConfigSource, setNewConfigSource] = useState('');
  const [newConfigPrivacy, setNewConfigPrivacy] = useState<SyntheticDataConfig['privacyLevel']>('medium');
  const [newConfigRecordCount, setNewConfigRecordCount] = useState(10000);
  const [useTemplate, setUseTemplate] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const [generatingConfigId, setGeneratingConfigId] = useState<string | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [, setIsServerlessEnvironment] = useState(false);
  const [showServerlessWarning, setShowServerlessWarning] = useState(false);
  
  // Preview functionality state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<{ records: Record<string, unknown>[]; schema: Record<string, unknown>; dataset: { name: string; recordCount: number } } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Add to data source state
  const [showAddToDataSourceModal, setShowAddToDataSourceModal] = useState(false);
  const [selectedJobForDataSource, setSelectedJobForDataSource] = useState<SyntheticDataJob | null>(null);
  const [newDataSourceName, setNewDataSourceName] = useState('');
  const [addingToDataSource, setAddingToDataSource] = useState(false);
  
  // Edit configuration state
  const [editingConfig, setEditingConfig] = useState<SyntheticDataConfig | null>(null);
  const [showEditConfig, setShowEditConfig] = useState(false);

  // Type definitions for schema conversion
  interface CatalogField {
    name?: string;
    fieldName?: string;
    type?: string;
    dataType?: string;
    sampleValue?: unknown;
    value?: unknown;
  }

  interface CatalogSchema {
    fields?: CatalogField[];
  }

  interface NormalizedField {
    sourceField?: string;
    name?: string;
    type?: string;
    subtype?: string;
    constraints?: Record<string, unknown>;
  }

  interface NormalizedSchema {
    fields?: NormalizedField[];
  }

  interface SyntheticField {
    type: string;
    subtype?: string;
    constraints?: Record<string, unknown>;
  }

  // Helper function to convert catalog schema to synthetic data format
  const convertCatalogSchemaToSyntheticFormat = (catalogSchema: CatalogSchema): Record<string, SyntheticField> => {
    const syntheticSchema: Record<string, SyntheticField> = {};
    
    if (catalogSchema.fields && Array.isArray(catalogSchema.fields)) {
      catalogSchema.fields.forEach((field: CatalogField) => {
        const fieldName = field.name || field.fieldName;
        if (fieldName) {
          syntheticSchema[fieldName] = inferSyntheticFieldType(field);
        }
      });
    }
    
    return syntheticSchema;
  };

  // Helper function to convert normalized schema to synthetic data format
  const convertNormalizedSchemaToSyntheticFormat = (normalizedSchema: NormalizedSchema): Record<string, SyntheticField> => {
    const syntheticSchema: Record<string, SyntheticField> = {};
    
    if (normalizedSchema.fields && Array.isArray(normalizedSchema.fields)) {
      normalizedSchema.fields.forEach((field: NormalizedField) => {
        const fieldName = field.sourceField || field.name;
        if (fieldName) {
          syntheticSchema[fieldName] = {
            type: field.type || 'text',
            subtype: field.subtype || 'sentence',
            constraints: field.constraints || {}
          };
        }
      });
    }
    
    return syntheticSchema;
  };

  // Helper function to infer synthetic data field type from catalog field
  const inferSyntheticFieldType = (field: CatalogField): SyntheticField => {
    const fieldName = (field.name || field.fieldName || '').toLowerCase();
    const fieldType = (field.type || field.dataType || '').toLowerCase();
    const fieldValue = field.sampleValue || field.value;

    // ID detection (should come before other checks)
    if (fieldName === 'id' || fieldName.endsWith('_id') || fieldName.includes('uuid')) {
      return { type: 'uuid' };
    }

    // Email detection
    if (fieldName.includes('email') || fieldType.includes('email')) {
      return { type: 'email' };
    }

    // Phone detection
    if (fieldName.includes('phone') || fieldName.includes('tel')) {
      return { type: 'phone' };
    }

    // SSN detection
    if (fieldName.includes('ssn') || fieldName.includes('social')) {
      return { type: 'ssn' };
    }

    // Name detection
    if (fieldName.includes('name')) {
      if (fieldName.includes('first')) return { type: 'name', subtype: 'firstName' };
      if (fieldName.includes('last')) return { type: 'name', subtype: 'lastName' };
      return { type: 'name', subtype: 'fullName' };
    }

    // Address detection
    if (fieldName.includes('address') || fieldName.includes('street') || fieldName.includes('city') || fieldName.includes('zip')) {
      return { type: 'address' };
    }

    // Date detection
    if (fieldName.includes('date') || fieldName.includes('time') || fieldType.includes('date') || fieldType.includes('timestamp')) {
      return { type: 'date', subtype: 'recent' };
    }

    // Credit card detection
    if (fieldName.includes('card') || fieldName.includes('credit')) {
      return { type: 'creditCard' };
    }

    // Number detection
    if (fieldType.includes('int') || fieldType.includes('number') || fieldType.includes('decimal') || fieldType.includes('float')) {
      // Check if it's a currency/billing field first
      const currencyKeywords = ['amount', 'price', 'cost', 'fee', 'billing', 'payment', 'salary', 'income', 'balance', 'total', 'charge', 'bill', 'expense', 'revenue', 'dollar', 'usd', 'money', 'financial'];
      const isCurrencyField = currencyKeywords.some(keyword => fieldName.toLowerCase().includes(keyword));
      
      if (isCurrencyField) {
        // Currency fields should use decimal formatting
        return {
          type: 'number',
          subtype: 'currency',
          constraints: typeof fieldValue === 'number' ? {
            min: Math.max(0, Math.floor(fieldValue * 0.5)),
            max: Math.ceil(fieldValue * 1.5)
          } : { min: 0, max: 10000 }
        };
      }
      
      // Age and other integer fields
      const integerKeywords = ['age', 'room', 'count', 'quantity', 'id', 'index', 'rank', 'level', 'floor', 'year'];
      const isIntegerField = integerKeywords.some(keyword => fieldName.toLowerCase().includes(keyword));
      
      if (isIntegerField) {
        return {
          type: 'number',
          subtype: 'integer',
          constraints: typeof fieldValue === 'number' ? {
            min: Math.max(1, Math.floor(fieldValue * 0.5)),
            max: Math.ceil(fieldValue * 1.5)
          } : { min: 1, max: 1000 }
        };
      }
      
      // Try to infer constraints from sample data for generic numbers
      if (typeof fieldValue === 'number') {
        return { 
          type: 'number', 
          constraints: { 
            min: Math.max(1, Math.floor(fieldValue * 0.5)), 
            max: Math.ceil(fieldValue * 1.5) 
          } 
        };
      }
      return { type: 'number', constraints: { min: 1, max: 1000 } };
    }

    // Boolean detection
    if (fieldType.includes('bool') || fieldType.includes('bit')) {
      return { type: 'boolean' };
    }

    // Default to text
    return { type: 'text', subtype: 'sentence' };
  };

  const privacyLevels = [
    { value: 'low', label: 'Low', description: 'Basic anonymization, suitable for internal use' },
    { value: 'medium', label: 'Medium', description: 'GDPR compliant, k-anonymity applied' },
    { value: 'high', label: 'High', description: 'HIPAA compliant, differential privacy' },
    { value: 'maximum', label: 'Maximum', description: 'Intelligence grade, maximum privacy guarantees' }
  ];

  const fetchDataSources = async () => {
    try {
      const response = await fetch('/api/data-sources');
      if (response.ok) {
        const sources = await response.json();
        setDataSources(sources);
      }
    } catch (error) {
      console.error('Failed to fetch data sources:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const response = await fetch('/api/synthetic/templates', {
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      if (response.ok) {
        const templateData = await response.json();
        
        // Validate template data
        if (templateData && typeof templateData === 'object') {
          setTemplates(templateData);
          // Set default template
          const templateKeys = Object.keys(templateData);
          if (templateKeys.length > 0) {
            const defaultTemplate = templateKeys[0];
            setSelectedTemplate(defaultTemplate);
          }
        } else {
          console.error('Invalid template data received:', templateData);
          setTemplates({});
        }
      } else {
        console.error('Failed to fetch templates, status:', response.status);
        setTemplates({});
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setTemplates({});
    } finally {
      setTemplatesLoading(false);
    }
  };

  const fetchExistingDatasets = async () => {
    try {
      const response = await fetch('/api/synthetic');
      if (response.ok) {
        const datasets = await response.json();
        
        // Convert API datasets to local config format
        const convertedConfigs = datasets.map((dataset: {
          id: string;
          name: string;
          dataType: string;
          recordCount: number;
          outputFormat?: string;
        }) => ({
          id: dataset.id,
          name: dataset.name,
          sourceDataset: `${dataset.dataType} template`,
          outputFormat: dataset.outputFormat || 'json',
          privacyLevel: 'medium' as const,
          preserveStatistics: true,
          preserveRelationships: true,
          configuration: {
            recordCount: dataset.recordCount,
            transformationRules: [],
            includeMetadata: true,
            generateReport: true
          }
        }));
        
        setConfigs(convertedConfigs);
      }
    } catch (error) {
      console.error('Failed to fetch existing datasets:', error);
    }
  };

  const checkServerlessEnvironment = async () => {
    try {
      // Try to detect serverless environment by checking if datasets persist
      const response = await fetch('/api/synthetic');
      if (!response.ok && response.status === 500) {
        const errorData = await response.json();
        if (errorData.serverless || (errorData.error && errorData.error.includes('serverless'))) {
          setIsServerlessEnvironment(true);
          setShowServerlessWarning(true);
        }
      }
    } catch (error) {
      // Ignore errors during environment check
      console.log('Environment check failed:', error);
    }
  };

  const fetchExistingJobs = async () => {
    try {
      const response = await fetch('/api/synthetic/jobs');
      if (response.ok) {
        const jobs = await response.json();
        
        // Convert API jobs to local format
        const convertedJobs = jobs.map((job: {
          id: string;
          datasetId: string;
          status: string;
          progress: number;
          recordsGenerated: number;
          startTime: string;
          endTime?: string;
          outputFile?: string;
          errorMessage?: string;
        }) => ({
          id: job.id,
          configId: job.datasetId,
          status: job.status,
          progress: job.progress,
          recordsGenerated: job.recordsGenerated,
          startTime: new Date(job.startTime),
          endTime: job.endTime ? new Date(job.endTime) : undefined,
          outputFile: job.outputFile,
          errorMessage: job.errorMessage
        }));
        
        setJobs(convertedJobs);
        return convertedJobs;
      }
    } catch (error) {
      console.error('Failed to fetch existing jobs:', error);
    }
    return [];
  };

  // SSE connection management
  const startJobUpdates = () => {
    console.log('Starting SSE connection for job updates...');
    
    // Clean up any existing ref connection first
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Close existing connection if any
    setEventSource(current => {
      if (current) {
        console.log('Closing existing SSE connection');
        current.close();
      }
      
      try {
        // Create new EventSource connection
        const source = new EventSource('/api/synthetic/jobs/updates');
        eventSourceRef.current = source;
        
        // Add timeout to prevent hanging connections
        const connectionTimeout = setTimeout(() => {
          console.warn('SSE connection timeout - closing connection');
          source.close();
          eventSourceRef.current = null;
        }, 60000); // 60 second timeout
        
        source.onopen = () => {
          console.log('SSE connection opened successfully');
          clearTimeout(connectionTimeout);
        };
        
        source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('SSE message received:', data.type, data.jobs?.length, 'jobs');
          
          if (data.type === 'jobs_update' && data.jobs) {
            // Convert API jobs to local format
            const convertedJobs = data.jobs.map((job: {
              id: string;
              datasetId: string;
              status: string;
              progress: number;
              recordsGenerated: number;
              startTime: string;
              endTime?: string;
              outputFile?: string;
              errorMessage?: string;
            }) => ({
              id: job.id,
              configId: job.datasetId,
              status: job.status,
              progress: job.progress,
              recordsGenerated: job.recordsGenerated,
              startTime: new Date(job.startTime),
              endTime: job.endTime ? new Date(job.endTime) : undefined,
              outputFile: job.outputFile,
              errorMessage: job.errorMessage
            }));
            
            // Only update if there are actual changes to prevent unnecessary re-renders
            setJobs(prevJobs => {
              // Check if the jobs are actually different
              const jobsChanged = JSON.stringify(prevJobs) !== JSON.stringify(convertedJobs);
              if (jobsChanged) {
                console.log('Updating jobs state with', convertedJobs.length, 'jobs');
                
                // Check for newly completed jobs and queue toast notifications
                // We'll handle the toasts after the state update
                setTimeout(() => {
                  convertedJobs.forEach((newJob: SyntheticDataJob) => {
                    const oldJob = prevJobs.find(j => j.id === newJob.id);
                    if (oldJob && oldJob.status === 'running' && newJob.status === 'completed') {
                      toast.success(
                        'Generation Complete',
                        `Synthetic data generation completed successfully. ${newJob.recordsGenerated.toLocaleString()} records generated.`
                      );
                    } else if (oldJob && oldJob.status === 'running' && newJob.status === 'failed') {
                      toast.error(
                        'Generation Failed',
                        `Synthetic data generation failed. ${newJob.errorMessage || 'Check job details for more information.'}`
                      );
                    }
                  });
                }, 0);
                
                return convertedJobs;
              }
              return prevJobs;
            });
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };
      
      source.onerror = (error) => {
        console.error('SSE connection error:', error);
        clearTimeout(connectionTimeout);
        
        // Don't try to reconnect here - it will be handled by the EventSource itself
        // or by the component re-mounting
        if (source.readyState === EventSource.CLOSED) {
          console.log('SSE connection closed');
          eventSourceRef.current = null;
        }
      };
      
      return source;
      } catch (error) {
        console.error('Failed to create SSE connection:', error);
        return null;
      }
    });
  };
  
  const stopJobUpdates = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setEventSource(current => {
      if (current) {
        current.close();
      }
      return null;
    });
  };
  
  // Initial data loading effect
  useEffect(() => {
    let isUnmounted = false;
    const abortController = new AbortController();
    
    const loadInitialData = async () => {
      setIsInitialLoading(true);
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initial data loading timeout')), 15000)
        );
        
        const dataPromise = Promise.all([
          fetchDataSources(),
          fetchTemplates(),
          fetchExistingDatasets(),
          fetchExistingJobs(),
          checkServerlessEnvironment()
        ]);
        
        await Promise.race([dataPromise, timeoutPromise]);
      } catch (error) {
        console.error('Error loading initial data:', error);
        // Continue even if some data fails to load
      } finally {
        if (!isUnmounted) {
          setIsInitialLoading(false);
        }
      }
    };
    
    loadInitialData();
    
    // Cleanup function
    return () => {
      isUnmounted = true;
      abortController.abort();
      // Clean up ref connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setEventSource(current => {
        if (current) {
          current.close();
        }
        return null;
      });
    };
  }, []);
  
  // Start SSE connection after initial data is loaded
  useEffect(() => {
    // Only start SSE connection after initial loading is complete
    if (!isInitialLoading) {
      const timeoutId = setTimeout(() => {
        startJobUpdates();
      }, 100); // Small delay to ensure stable state
      
      // Add beforeunload listener to close SSE when navigating away
      const handleBeforeUnload = () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Cleanup on unmount
      return () => {
        clearTimeout(timeoutId);
        stopJobUpdates();
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoading]);

  const getStatusIcon = (status: SyntheticDataJob['status']) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'running': return <CogIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed': return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  const downloadFile = async (configId: string, filename: string, jobId: string) => {
    try {
      setDownloadingJobId(jobId);
      const response = await fetch(`/api/synthetic/${configId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to download file');
        toast.error('Download Failed', 'Failed to download file. Please try again.');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Download Error', 'Error downloading file. Please try again.');
    } finally {
      setDownloadingJobId(null);
    }
  };

  const startGeneration = async (configId: string) => {
    try {
      setGeneratingConfigId(configId);
      toast.info('Starting Generation', 'Initializing synthetic data generation...');
      
      const response = await fetch(`/api/synthetic/${configId}/generate`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        
        // Immediately add the new job to the state
        if (result.job) {
          const newJob: SyntheticDataJob = {
            id: result.job.id,
            configId: result.job.datasetId,
            status: result.job.status,
            progress: result.job.progress || 0,
            recordsGenerated: result.job.recordsGenerated || 0,
            startTime: new Date(result.job.startTime || result.job.createdAt),
            endTime: result.job.endTime ? new Date(result.job.endTime) : undefined,
            outputFile: result.job.outputFile,
            errorMessage: result.job.errorMessage
          };
          
          // Add the new job to the jobs state immediately
          setJobs(prevJobs => {
            console.log('Adding new job to state:', newJob.id);
            // Check if job already exists to prevent duplicates
            const existingJob = prevJobs.find(j => j.id === newJob.id);
            if (existingJob) {
              return prevJobs;
            }
            return [newJob, ...prevJobs];
          });
        }
        
        // Also refresh the datasets
        await fetchExistingDatasets();
        
        // Show success notification
        const config = configs.find(c => c.id === configId);
        toast.success(
          'Generation Started', 
          `Synthetic data generation for "${config?.name || 'dataset'}" has begun. Check the jobs table for progress.`
        );
      } else {
        const errorData = await response.json();
        console.error('Generation failed:', errorData);
        toast.error('Generation Failed', errorData.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error generating synthetic data:', error);
      toast.error(
        'Generation Error', 
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    } finally {
      setGeneratingConfigId(null);
    }
  };

  const createNewConfig = async () => {
    try {
      setShowServerlessWarning(false);
      let schema = {};
      let dataType = 'custom';

      if (useTemplate) {
        if (!selectedTemplate || selectedTemplate.trim() === '') {
          toast.warning('Template Required', 'Please select a template to proceed.');
          return;
        }
        
        const templateSchema = templates[selectedTemplate];
        if (templateSchema && typeof templateSchema === 'object') {
          schema = templateSchema;
          dataType = selectedTemplate;
        } else {
          console.error('Template not found or invalid:', selectedTemplate, 'Available templates:', Object.keys(templates));
          toast.error('Template Not Found', 'Selected template is not available. Please choose another template.');
          return;
        }
      } else if (!useTemplate) {
        if (!newConfigSource || newConfigSource.trim() === '') {
          toast.warning('Data Source Required', 'Please select a data source to proceed.');
          return;
        }
        
        // Fetch schema from selected data source
        try {
          const response = await fetch(`/api/data-sources/${newConfigSource}/schema`);
          if (response.ok) {
            const schemaData = await response.json();
            console.log('Schema API response:', schemaData);
            
            // Handle different response formats from the schema API
            let extractedSchema = null;
            
            if (schemaData.schema && typeof schemaData.schema === 'object') {
              // Non-transformed data source format
              extractedSchema = schemaData.schema;
            } else if (schemaData.originalSchema && schemaData.originalSchema.fields) {
              // Transformed data source format - convert catalog schema to synthetic data format
              extractedSchema = convertCatalogSchemaToSyntheticFormat(schemaData.originalSchema);
            } else if (schemaData.normalizedSchema && schemaData.normalizedSchema.fields) {
              // Use normalized schema if available
              extractedSchema = convertNormalizedSchemaToSyntheticFormat(schemaData.normalizedSchema);
            }
            
            if (extractedSchema && typeof extractedSchema === 'object' && Object.keys(extractedSchema).length > 0) {
              schema = extractedSchema;
              dataType = 'user-dataset';
              console.log('Successfully extracted schema:', Object.keys(extractedSchema));
            } else {
              console.error('Invalid or empty schema returned from data source:', schemaData);
              toast.error('Invalid Schema', 'Invalid schema received from data source. Please try again.');
              return;
            }
          } else {
            console.error('Failed to fetch schema from data source');
            toast.error('Schema Extraction Failed', 'Failed to extract schema from the selected data source.');
            return;
          }
        } catch (error) {
          console.error('Error fetching schema:', error);
          toast.error('Schema Error', 'Error extracting schema from data source. Please try again.');
          return;
        }
      } else {
        toast.warning('Selection Required', 'Please select either a template or a data source to proceed.');
        return;
      }
      
      console.log('Creating dataset with:', {
        useTemplate,
        selectedTemplate,
        newConfigSource,
        availableTemplates: Object.keys(templates),
        schema,
        schemaKeys: schema && typeof schema === 'object' ? Object.keys(schema) : []
      });

      if (!schema || typeof schema !== 'object' || Object.keys(schema).length === 0) {
        toast.error('Schema Generation Failed', 'No schema could be generated. Please select a template or data source.');
        return;
      }
      
      const requestData = {
        name: newConfigName,
        description: `Generated from ${useTemplate ? `${selectedTemplate} template` : newConfigSource || 'custom schema'}`,
        dataType,
        recordCount: newConfigRecordCount,
        schema,
        outputFormat: 'json' as const,
        configuration: {
          seed: Math.floor(Math.random() * 10000),
          locale: 'en'
        },
        // Include source data ID for realistic generation when using a data source
        ...(newConfigSource && !useTemplate ? { sourceDataId: newConfigSource } : {})
      };

      console.log('Request data being sent:', requestData);

      const response = await fetch('/api/synthetic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const dataset = await response.json();
        console.log('Created synthetic dataset:', dataset);
        
        // Check if this is a serverless environment with persistence warning
        if (dataset.warning && dataset.warning.includes('serverless')) {
          setIsServerlessEnvironment(true);
          setShowServerlessWarning(true);
        }
        
        // Refresh the entire list from the API to ensure consistency
        await fetchExistingDatasets();
        setShowNewConfig(false);
        setNewConfigName('');
        setNewConfigSource('');
        setSelectedTemplate('');
        setNewConfigPrivacy('medium');
        setNewConfigRecordCount(10000);
        
        toast.success(
          'Configuration Created',
          `Synthetic data configuration "${dataset.name}" has been created successfully.`
        );
      } else {
        const errorData = await response.json();
        console.error('Failed to create synthetic dataset:', errorData);
        
        // Check for serverless environment issues
        if (errorData.serverless || (errorData.error && errorData.error.includes('serverless'))) {
          setIsServerlessEnvironment(true);
          setShowServerlessWarning(true);
          toast.error('Dataset Creation Failed', errorData.error);
        } else {
          toast.error('Creation Failed', errorData.error || 'Unknown error occurred');
        }
      }
    } catch (error) {
      console.error('Error creating synthetic dataset:', error);
    }
  };

  const deleteConfig = async (configId: string) => {
    const confirmed = await dialog.showConfirm({
      title: 'Delete Configuration',
      message: 'Are you sure you want to delete this configuration? This action cannot be undone.',
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/synthetic/${configId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setConfigs(prev => prev.filter(config => config.id !== configId));
        // Remove any related jobs
        setJobs(prev => prev.filter(job => job.configId !== configId));
        
        toast.success('Configuration Deleted', 'The configuration and related jobs have been removed.');
      } else {
        console.error('Failed to delete configuration');
        toast.error('Deletion Failed', 'Failed to delete configuration. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
      toast.error('Deletion Error', 'Error deleting configuration. Please try again.');
    }
  };

  const startEditConfig = (config: SyntheticDataConfig) => {
    setEditingConfig(config);
    setNewConfigName(config.name);
    setNewConfigRecordCount(config.configuration.recordCount);
    setNewConfigPrivacy(config.privacyLevel);
    setShowEditConfig(true);
  };

  const updateConfig = async () => {
    if (!editingConfig) return;

    try {
      const updateData = {
        name: newConfigName,
        recordCount: newConfigRecordCount,
        outputFormat: editingConfig.outputFormat,
        configuration: {
          ...editingConfig.configuration,
          recordCount: newConfigRecordCount
        }
      };

      const response = await fetch(`/api/synthetic/${editingConfig.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        // Refresh the datasets
        await fetchExistingDatasets();
        setShowEditConfig(false);
        setEditingConfig(null);
        setNewConfigName('');
        setNewConfigRecordCount(10000);
        setNewConfigPrivacy('medium');
        
        toast.success('Configuration Updated', `Successfully updated "${newConfigName}".`);
      } else {
        console.error('Failed to update configuration');
        toast.error('Update Failed', 'Failed to update configuration. Please try again.');
      }
    } catch (error) {
      console.error('Error updating configuration:', error);
      toast.error('Update Error', 'Error updating configuration. Please try again.');
    }
  };

  const deleteJob = async (jobId: string) => {
    const confirmed = await dialog.showConfirm({
      title: 'Delete Job',
      message: 'Are you sure you want to delete this job? This will remove the job record but not the associated dataset configuration.',
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/synthetic/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setJobs(prev => prev.filter(job => job.id !== jobId));
        toast.success('Job Deleted', 'The job has been successfully removed.');
      } else {
        const errorData = await response.json();
        console.error('Failed to delete job:', errorData);
        toast.error('Job Deletion Failed', 'Failed to delete job. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Job Deletion Error', 'Error deleting job. Please try again.');
    }
  };

  const clearAllData = async () => {
    const totalItems = configs.length + jobs.length;
    const confirmed = await dialog.showConfirm({
      title: 'Clear All Data',
      message: `Are you sure you want to delete all ${totalItems} items (${configs.length} configurations and ${jobs.length} jobs)? This action cannot be undone and will delete all generated files.`,
      type: 'warning',
      confirmText: 'Delete All',
      cancelText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    try {
      // Delete all configurations (this will cascade delete jobs due to the relationship)
      const deletePromises = configs.map(config => 
        fetch(`/api/synthetic/${config.id}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      
      // Clear local state
      setConfigs([]);
      setJobs([]);
      
      console.log('All synthetic data cleared successfully');
      toast.success('Data Cleared', `Successfully deleted ${totalItems} items.`);
    } catch (error) {
      console.error('Error clearing all data:', error);
      toast.error('Clear Data Error', 'Error clearing all data. Please try again.');
      // Refresh the data to show current state
      await fetchExistingDatasets();
      await fetchExistingJobs();
    }
  };

  // Dataset Enhancement handlers
  const startDatasetEnhancement = (dataSource: DataSource) => {
    setSelectedDataSourceForEnhancement(dataSource);
    setShowEnhancementModal(true);
  };

  const handleEnhancementComplete = async (enhancementResult: { 
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
    enhancementName: string 
  }) => {
    console.log('Dataset enhancement completed:', enhancementResult);
    
    try {
      // Save the enhanced dataset as a new data source
      const enhancedDataSource = {
        name: enhancementResult.enhancementName,
        type: 'json_transformed',
        configuration: {
          files: [{
            name: `${enhancementResult.enhancementName}.json`,
            size: JSON.stringify(enhancementResult.enhancedRecords).length,
            type: 'application/json',
            // Store the enhanced records directly without additional wrapping
            // The enhancedRecords already contain the complete data with all fields merged
            content: JSON.stringify(enhancementResult.enhancedRecords, null, 2),
            lastModified: Date.now(),
            enhancedFrom: {
              sourceId: selectedDataSourceForEnhancement?.id,
              sourceName: selectedDataSourceForEnhancement?.name,
              enhancedAt: new Date().toISOString(),
              fieldsAdded: enhancementResult.enhancementStats.addedFields
            }
          }],
          totalSize: JSON.stringify(enhancementResult.enhancedRecords).length,
          recordCount: enhancementResult.enhancedRecords.length
        },
        metadata: {
          isEnhanced: true,
          originalSource: {
            id: selectedDataSourceForEnhancement?.id,
            name: selectedDataSourceForEnhancement?.name,
            type: selectedDataSourceForEnhancement?.type
          },
          enhancement: {
            method: 'llm_field_analysis',
            enhancedAt: new Date().toISOString(),
            stats: enhancementResult.enhancementStats
          }
        },
        recordCount: enhancementResult.enhancedRecords.length
      };

      console.log('Creating enhanced data source:', {
        name: enhancedDataSource.name,
        recordCount: enhancedDataSource.recordCount,
        originalSource: selectedDataSourceForEnhancement?.name
      });

      const response = await fetch('/api/data-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedDataSource)
      });

      if (response.ok) {
        const newDataSource = await response.json();
        console.log('Enhanced data source created successfully:', newDataSource.id);
        
        // Refresh data sources to show the new enhanced source
        await fetchDataSources();
        
        toast.success(
          'Enhancement Saved',
          `Enhanced dataset "${enhancementResult.enhancementName}" has been saved as a new data source and is now available for pattern definition, redaction, and other workflows!`
        );
      } else {
        const error = await response.json();
        console.error('Failed to save enhanced data source:', error);
        toast.error(
          'Save Failed',
          `Enhancement completed but failed to save as data source: ${error.error || 'Unknown error'}`
        );
      }
    } catch (error) {
      console.error('Error saving enhanced dataset:', error);
      toast.error(
        'Save Error',
        'Enhancement completed but failed to save as data source. Please try again.'
      );
    }
    
    // Close the modal
    setShowEnhancementModal(false);
    setSelectedDataSourceForEnhancement(null);
  };

  // Preview data functionality
  const showPreview = async (configId: string) => {
    setPreviewLoading(true);
    setShowPreviewModal(true);
    
    try {
      const response = await fetch(`/api/synthetic/${configId}/preview?count=5`);
      if (response.ok) {
        const preview = await response.json();
        setPreviewData(preview);
      } else {
        const errorData = await response.json();
        console.error('Failed to generate preview:', errorData);
        toast.error('Preview Failed', errorData.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Preview Error', 'Error generating preview. Please try again.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Add synthetic dataset to data sources
  const addToDataSource = async () => {
    if (!selectedJobForDataSource || !newDataSourceName.trim()) {
      toast.warning('Name Required', 'Please provide a name for the data source.');
      return;
    }

    setAddingToDataSource(true);

    try {
      const response = await fetch(`/api/synthetic/${selectedJobForDataSource.configId}/add-to-datasource`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newDataSourceName.trim()
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Data Source Created', result.message);
        setShowAddToDataSourceModal(false);
        setSelectedJobForDataSource(null);
        setNewDataSourceName('');
        // Refresh data sources
        await fetchDataSources();
      } else {
        const errorData = await response.json();
        console.error('Failed to add to data sources:', errorData);
        toast.error('Add to Sources Failed', errorData.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error adding to data sources:', error);
      toast.error('Add to Sources Error', 'Error adding to data sources. Please try again.');
    } finally {
      setAddingToDataSource(false);
    }
  };

  const getDataSourceIcon = (type: string) => {
    switch (type) {
      case 'json_transformed':
        return <ArrowsRightLeftIcon className="h-5 w-5 text-green-600" />;
      case 'filesystem':
        return <DocumentPlusIcon className="h-5 w-5 text-blue-600" />;
      case 'synthetic':
        return <SparklesIcon className="h-5 w-5 text-purple-600" />;
      default:
        return <DocumentPlusIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Serverless Environment Warning */}
          {showServerlessWarning && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800 mb-1">
                    Serverless Environment Detected
                  </h3>
                  <p className="text-sm text-yellow-700 mb-2">
                    Synthetic datasets created in this environment may not persist between requests. 
                    For production use, please configure a persistent database connection.
                  </p>
                  <button
                    onClick={() => setShowServerlessWarning(false)}
                    className="text-xs text-yellow-800 hover:text-yellow-900 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Synthetic Data Generation</h1>
                <p className="text-gray-600 mt-1">Create privacy-preserving synthetic datasets for AI applications</p>
              </div>
              <LLMIndicator feature="datasetEnhancement" showModel={true} />
            </div>
            <div className="flex items-center gap-3">
              {(configs.length > 0 || jobs.length > 0) && (
                <button
                  onClick={clearAllData}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <TrashIcon className="h-5 w-5" />
                  Clear All
                </button>
              )}
              <button
                onClick={() => setShowNewConfig(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <SparklesIcon className="h-5 w-5" />
                New Configuration
              </button>
            </div>
          </div>

          {/* Configurations */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Generation Configurations</h2>
            {isInitialLoading ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <CogIcon className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Configurations</h3>
                <p className="text-gray-600">
                  Please wait while we load your synthetic data configurations...
                </p>
              </div>
            ) : configs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <SparklesIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Synthetic Data Configurations</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first synthetic data configuration to generate privacy-preserving datasets for AI applications.
                </p>
                <button
                  onClick={() => setShowNewConfig(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <SparklesIcon className="h-5 w-5" />
                  Create Configuration
                </button>
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                  {privacyLevels.map(level => (
                    <div key={level.value} className="bg-gray-50 p-4 rounded-lg text-left">
                      <h4 className="font-medium text-gray-900 text-sm mb-1">{level.label} Privacy</h4>
                      <p className="text-xs text-gray-600">{level.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {configs.map((config) => (
                <div
                  key={config.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{config.name}</h3>
                      <p className="text-sm text-gray-500">Source: {config.sourceDataset}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 text-xs rounded-full ${
                        config.privacyLevel === 'low' ? 'bg-yellow-100 text-yellow-800' :
                        config.privacyLevel === 'medium' ? 'bg-blue-100 text-blue-800' :
                        config.privacyLevel === 'high' ? 'bg-purple-100 text-purple-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {config.privacyLevel.toUpperCase()} PRIVACY
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditConfig(config);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit configuration"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConfig(config.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete configuration"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-500">Records</p>
                      <p className="font-medium">{config.configuration.recordCount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Output Format</p>
                      <p className="font-medium uppercase">{config.outputFormat}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {config.preserveStatistics && (
                      <span className="flex items-center gap-1 text-xs text-gray-600">
                        <ChartBarIcon className="h-4 w-4" />
                        Statistics Preserved
                      </span>
                    )}
                    {config.configuration.kAnonymity && (
                      <span className="flex items-center gap-1 text-xs text-gray-600">
                        <ShieldCheckIcon className="h-4 w-4" />
                        k={config.configuration.kAnonymity}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showPreview(config.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      <EyeIcon className="h-4 w-4" />
                      Preview
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startGeneration(config.id);
                      }}
                      disabled={generatingConfigId === config.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingConfigId === config.id ? (
                        <>
                          <CogIcon className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <PlayIcon className="h-4 w-4" />
                          Generate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Recent Jobs */}
          {jobs.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Generation Jobs</h2>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Configuration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {jobs.map((job) => {
                      const config = configs.find(c => c.id === job.configId);
                      return (
                        <tr key={job.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {config?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(job.status)}
                              <span className="text-sm capitalize">{job.status}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${job.progress}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">{job.progress.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {job.recordsGenerated.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {formatTime(job.startTime)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {job.status === 'completed' && job.outputFile && (
                                <>
                                  <button 
                                    onClick={() => downloadFile(job.configId, job.outputFile!, job.id)}
                                    disabled={downloadingJobId === job.id}
                                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {downloadingJobId === job.id ? (
                                      <>
                                        <CogIcon className="h-4 w-4 animate-spin" />
                                        Downloading...
                                      </>
                                    ) : (
                                      <>
                                        <ArrowDownTrayIcon className="h-4 w-4" />
                                        Download
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedJobForDataSource(job);
                                      setNewDataSourceName(`${config?.name || 'Synthetic'}_DataSource`);
                                      setShowAddToDataSourceModal(true);
                                    }}
                                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                                    title="Add to Data Sources"
                                  >
                                    <PlusCircleIcon className="h-4 w-4" />
                                    Add to Sources
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => deleteJob(job.id)}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete job"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          )}

          {/* Dataset Enhancement Section */}
          {dataSources.length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Dataset Enhancement</h2>
                  <p className="text-gray-600 mt-1">Enhance existing datasets by adding missing fields intelligently</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {dataSources
                  .filter(ds => ds.type === 'json_transformed' || (ds.type === 'filesystem' && (ds.configuration.files || ds.hasTransformedData)))
                  .map((dataSource) => (
                  <div
                    key={dataSource.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        {getDataSourceIcon(dataSource.type)}
                        <div>
                          <h3 className="font-semibold text-gray-900">{dataSource.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-gray-500 capitalize">{dataSource.type.replace('_', ' ')}</p>
                            {dataSource.type === 'json_transformed' && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                Transformed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        {dataSource.configuration.files?.length || 0} file{dataSource.configuration.files?.length !== 1 ? 's' : ''}
                        {dataSource.recordCount && (
                          <span> • {dataSource.recordCount.toLocaleString()} records</span>
                        )}
                      </p>
                    </div>

                    <button
                      onClick={() => startDatasetEnhancement(dataSource)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <DocumentPlusIcon className="h-4 w-4" />
                      Enhance Dataset
                    </button>
                  </div>
                ))}
              </div>
              
              {dataSources.filter(ds => ds.type === 'json_transformed' || (ds.type === 'filesystem' && ds.configuration.files)).length === 0 && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <DocumentPlusIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Sources Available</h3>
                  <p className="text-gray-600 mb-4">
                    Upload data sources in the Data Discovery module to enable dataset enhancement.
                  </p>
                  <a
                    href="/discovery"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <SparklesIcon className="h-4 w-4" />
                    Go to Data Discovery
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Dataset Enhancement Modal */}
          {showEnhancementModal && selectedDataSourceForEnhancement && (
            <DatasetEnhancementModal
              isOpen={showEnhancementModal}
              onClose={() => {
                setShowEnhancementModal(false);
                setSelectedDataSourceForEnhancement(null);
              }}
              dataSource={selectedDataSourceForEnhancement}
              onEnhancementComplete={handleEnhancementComplete}
            />
          )}

          {/* Edit Configuration Modal */}
          {showEditConfig && editingConfig && (
            <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowEditConfig(false)}>
              <div className="bg-white rounded-lg border-2 border-gray-600 p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Configuration</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Configuration Name</label>
                    <input
                      type="text"
                      value={newConfigName}
                      onChange={(e) => setNewConfigName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Records</label>
                    <input
                      type="number"
                      value={newConfigRecordCount}
                      onChange={(e) => setNewConfigRecordCount(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Privacy Level</label>
                    <div className="space-y-2">
                      {privacyLevels.map((level) => (
                        <label key={level.value} className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="radio"
                            value={level.value}
                            checked={newConfigPrivacy === level.value}
                            onChange={(e) => setNewConfigPrivacy(e.target.value as SyntheticDataConfig['privacyLevel'])}
                            className="mt-1"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{level.label}</p>
                            <p className="text-sm text-gray-600">{level.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowEditConfig(false);
                      setEditingConfig(null);
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateConfig}
                    disabled={!newConfigName}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Update Configuration
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* New Configuration Modal */}
          {showNewConfig && (
            <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowNewConfig(false)}>
              <div className="bg-white rounded-lg border-2 border-gray-600 p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Synthetic Data Configuration</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Configuration Name</label>
                    <input
                      type="text"
                      value={newConfigName}
                      onChange={(e) => setNewConfigName(e.target.value)}
                      placeholder="e.g., Patient Records - Test Environment"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Data Source</label>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          checked={useTemplate}
                          onChange={() => setUseTemplate(true)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Use Predefined Template</p>
                          <p className="text-sm text-gray-600">Generate synthetic data from common schema templates</p>
                          {useTemplate && (
                            <select
                              value={selectedTemplate}
                              onChange={(e) => setSelectedTemplate(e.target.value)}
                              disabled={templatesLoading}
                              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            >
                              <option value="">
                                {templatesLoading ? 'Loading templates...' : 'Select template...'}
                              </option>
                              {Object.keys(templates).map(template => (
                                <option key={template} value={template}>
                                  {template.charAt(0).toUpperCase() + template.slice(1)} Template
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </label>
                      
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          checked={!useTemplate}
                          onChange={() => setUseTemplate(false)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Base on Existing Dataset</p>
                          <p className="text-sm text-gray-600">Generate synthetic data from an existing data source</p>
                          {!useTemplate && (
                            <select
                              value={newConfigSource}
                              onChange={(e) => setNewConfigSource(e.target.value)}
                              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select a source...</option>
                              {dataSources.map(source => (
                                <option key={source.id} value={source.id}>
                                  {source.name} ({source.type})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Privacy Level</label>
                    <div className="space-y-2">
                      {privacyLevels.map((level) => (
                        <label key={level.value} className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="radio"
                            value={level.value}
                            checked={newConfigPrivacy === level.value}
                            onChange={(e) => setNewConfigPrivacy(e.target.value as SyntheticDataConfig['privacyLevel'])}
                            className="mt-1"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{level.label}</p>
                            <p className="text-sm text-gray-600">{level.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Records</label>
                    <input
                      type="number"
                      value={newConfigRecordCount}
                      onChange={(e) => setNewConfigRecordCount(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowNewConfig(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createNewConfig}
                    disabled={!newConfigName || templatesLoading || (useTemplate ? !selectedTemplate : !newConfigSource)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {templatesLoading ? 'Loading...' : 'Create Configuration'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preview Modal */}
          {showPreviewModal && (
            <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowPreviewModal(false)}>
              <div className="bg-white rounded-lg border-2 border-gray-600 p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Synthetic Data Preview</h3>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                {previewLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <CogIcon className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-3 text-gray-600">Generating preview data...</span>
                  </div>
                ) : previewData ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900">{previewData.dataset.name}</h4>
                      <p className="text-sm text-gray-600">Showing 5 sample records from {previewData.dataset.recordCount.toLocaleString()} total records</p>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            {previewData.records.length > 0 && Object.keys(previewData.records[0]).map((field) => (
                              <th key={field} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase border-b">
                                {field}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {previewData.records.map((record, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              {Object.values(record).map((value, i) => (
                                <td key={i} className="px-4 py-2 text-sm text-gray-900 border-b">
                                  {typeof value === 'object' && value !== null 
                                    ? JSON.stringify(value)
                                    : String(value)
                                  }
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Failed to generate preview data
                  </div>
                )}
                
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add to Data Source Modal */}
          {showAddToDataSourceModal && selectedJobForDataSource && (
            <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAddToDataSourceModal(false)}>
              <div className="bg-white rounded-lg border-2 border-gray-600 p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add to Data Sources</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Source Name</label>
                    <input
                      type="text"
                      value={newDataSourceName}
                      onChange={(e) => setNewDataSourceName(e.target.value)}
                      placeholder="Enter name for the new data source"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">
                      This will create a new data source containing {selectedJobForDataSource.recordsGenerated.toLocaleString()} synthetic records. 
                      The data source will be available for use in pattern detection, redaction, and other workflows.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAddToDataSourceModal(false);
                      setSelectedJobForDataSource(null);
                      setNewDataSourceName('');
                    }}
                    disabled={addingToDataSource}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addToDataSource}
                    disabled={!newDataSourceName.trim() || addingToDataSource}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {addingToDataSource ? (
                      <>
                        <CogIcon className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add to Data Sources'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}