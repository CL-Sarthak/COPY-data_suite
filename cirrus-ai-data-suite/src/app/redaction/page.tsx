'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { HelpButton, Tooltip } from '@/components/HelpSystem';
import { getHelpContent } from '@/content/helpContent';
import { useDialog } from '@/contexts/DialogContext';
import MLIndicator from '@/components/MLIndicator';
import { 
  ShieldCheckIcon,
  PlusIcon,
  DocumentTextIcon,
  TrashIcon,
  XMarkIcon,
  CircleStackIcon,
  CodeBracketIcon,
  CloudIcon
} from '@heroicons/react/24/outline';

import { Pattern } from '@/services/patternService';
import { DataSource } from '@/types/discovery';
import { DataAnnotation } from '@/components/dataAnnotation/DataAnnotation';
import { FileData, SensitivePattern } from '@/types';
import { ContextAwarePatternDetector } from '@/components/ContextAwarePatternDetector';
import { patternTestingService, TestResult, RedactionStyle } from '@/services/patternTestingService';
import { PatternLearningService } from '@/services/patternLearningService';
import { ClusterPatternDisplay } from '@/components/ClusterPatternDisplay';

interface AnnotationWrapperProps {
  dataSource: DataSource;
  patterns: Pattern[];
  onPatternsIdentified: (patterns: SensitivePattern[]) => Promise<void>;
  onBack: () => void;
}

function AnnotationWrapper({ dataSource, patterns, onPatternsIdentified, onBack }: AnnotationWrapperProps) {
  const [fileData, setFileData] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Initialize pagination state based on data source
  useEffect(() => {
    if (dataSource.recordCount && dataSource.recordCount > 10) {
      console.log('Initializing pagination from data source record count:', dataSource.recordCount);
      setTotalRecords(dataSource.recordCount);
      setTotalPages(Math.ceil(dataSource.recordCount / 10));
    }
  }, [dataSource.recordCount]);

  useEffect(() => {
    loadFileData();
  }, [dataSource.id, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFileData = async () => {
    try {
      setLoading(true);
      
      // Always try to get transformed data first for any data source
      try {
        const response = await fetch(`/api/data-sources/${dataSource.id}/transform?page=${currentPage}&pageSize=10`);
        if (response.ok) {
          const catalog = await response.json();
          
          // If we have transformed records, use them
          if (catalog.records && catalog.records.length > 0) {
            // Update pagination state
          
          if (catalog.meta?.pagination) {
            setTotalPages(catalog.meta.pagination.totalPages);
            setTotalRecords(catalog.meta.pagination.totalRecords);
          } else if (catalog.totalRecords) {
            // Fallback if pagination meta is missing
            const calculatedTotalPages = Math.ceil(catalog.totalRecords / 10);
            setTotalPages(calculatedTotalPages);
            setTotalRecords(catalog.totalRecords);
          }
          
          // Safety check - if we got too many records, something is wrong
          if (catalog.records.length > 100) {
            console.error('WARNING: Received more than 100 records, pagination may not be working correctly');
            // Limit to first 10 records to prevent browser hang
            catalog.records = catalog.records.slice(0, 10);
          }
          
          // Group records by source file for better organization
          const fileGroups = new Map<string, typeof catalog.records>();
          
          catalog.records.forEach((record: { 
            id: string; 
            data: Record<string, unknown>; 
            metadata: { fileInfo?: { name?: string; type?: string; size?: number }; originalFormat?: string; fileName?: string } 
          }, index: number) => {
            // Try multiple sources for file name
            const fileName = record.metadata.fileInfo?.name || 
                           record.metadata.fileName || 
                           (record.data.fileName as string) ||
                           `Document ${index + 1}`;
            if (!fileGroups.has(fileName)) {
              fileGroups.set(fileName, []);
            }
            fileGroups.get(fileName)!.push(record);
          });
          
          // Get the original file name from the first record's metadata
          const firstRecord = catalog.records[0];
          const fileName = firstRecord?.metadata?.fileInfo?.name || 
                         firstRecord?.metadata?.fileName || 
                         dataSource.name;
          
          // For transformed data, combine all records into a single view per page
          const content = catalog.records.map((record: { data: Record<string, unknown> }, index: number) => {
            const recordNumber = ((currentPage - 1) * 10) + index + 1;
            const lines = [`=== Record ${recordNumber} ===`];
            for (const [key, value] of Object.entries(record.data)) {
              if (value !== null && value !== undefined) {
                lines.push(`${key}: ${String(value)}`);
              }
            }
            return lines.join('\n');
          }).join('\n\n');
          
          const fileDataArray: FileData[] = [{
            id: `${dataSource.id}-page-${currentPage}`,
            name: totalPages > 1 ? `${fileName} - Page ${currentPage} of ${totalPages}` : fileName,
            type: 'text/plain',
            size: content.length,
            content
          }];
          
            setFileData(fileDataArray);
            return; // Successfully loaded transformed data
          }
        }
      } catch {
        // Transform endpoint failed, fall back to original files
        console.log('Transform endpoint not available, using original files');
      }
      
      // Fall back to original files if no transform data available
      if (dataSource.type === 'filesystem' && dataSource.configuration.files) {
        const files = dataSource.configuration.files.map((file: { 
          name: string; 
          type: string; 
          size: number; 
          content?: string;
          contentTruncated?: boolean;
          originalContentLength?: number;
        }) => ({
          id: `${dataSource.id}-${file.name}`,
          name: file.name,
          type: file.type,
          size: file.size,
          content: file.content || '',
          contentTruncated: file.contentTruncated,
          originalContentLength: file.originalContentLength
        }));
        setFileData(files);
      } else {
        setFileData([]);
      }
    } catch (error) {
      console.error('Error loading file data for annotation:', error);
      setFileData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 overflow-auto bg-gray-50 annotation-interface">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading data for annotation...</p>
            </div>
          </div>
      </div>
    );
  }


  return (
    <div className="flex-1 p-8 overflow-auto bg-gray-50 annotation-interface">
        <div className="max-w-7xl mx-auto">
          {/* Pagination controls for large datasets */}
          {totalRecords > 10 && (
            <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing records {((currentPage - 1) * 10) + 1} - {Math.min(currentPage * 10, totalRecords)} of {totalRecords} total
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
              <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2">
                <p className="text-xs text-yellow-800">
                  <strong>💡 Tip:</strong> For large datasets, we show 10 records at a time to keep the interface responsive. 
                  Patterns you create will be applied to the entire dataset during redaction.
                  {totalRecords > 1000 && (
                    <span className="block mt-1">
                      <strong>Note:</strong> For very large datasets (&gt;1000 records), pagination is limited to the first 1000 records for performance.
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
          
          <DataAnnotation
            data={fileData}
            onPatternsIdentified={onPatternsIdentified}
            onBack={onBack}
            initialPatterns={patterns.map(p => {
              console.log('Passing pattern to annotation:', { id: p.id, name: p.name });
              return {
                id: p.id,
                label: p.name,
                examples: p.examples,
                color: p.color,
                type: p.type as 'PII' | 'FINANCIAL' | 'MEDICAL' | 'CLASSIFICATION',
                regex: p.regex,
                regexPatterns: p.regexPatterns
              };
            })}
            continueButtonText="Done"
          />
        </div>
    </div>
  );
}

export default function PatternDefinition() {
  const dialog = useDialog();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [showNewPattern, setShowNewPattern] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [testText, setTestText] = useState('');
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [selectedRedactionStyle, setSelectedRedactionStyle] = useState<RedactionStyle | null>(null);
  const [enableML, setEnableML] = useState(true);
  const [mlStatus, setMLStatus] = useState({ configured: false, provider: 'simulated', hasApiKey: false, message: 'Loading...' });
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [showContextDetector, setShowContextDetector] = useState(false);
  const [contextDetectorText, setContextDetectorText] = useState('');
  const [contextDetectorSource, setContextDetectorSource] = useState<string | null>(null);
  const [newPattern, setNewPattern] = useState({
    name: '',
    type: 'PII' as Pattern['type'],
    category: '',
    regex: '',
    examples: [''],
    description: '',
    color: 'bg-blue-100 text-blue-800',
    isActive: true
  });

  const patternTypes = [
    { value: 'PII', label: 'Personal Information', color: 'bg-blue-100 text-blue-800' },
    { value: 'FINANCIAL', label: 'Financial Data', color: 'bg-green-100 text-green-800' },
    { value: 'MEDICAL', label: 'Healthcare/HIPAA', color: 'bg-pink-100 text-pink-800' },
    { value: 'CLASSIFICATION', label: 'Gov Classification', color: 'bg-red-100 text-red-800' },
    { value: 'CUSTOM', label: 'Custom Pattern', color: 'bg-purple-100 text-purple-800' }
  ];

  useEffect(() => {
    loadPatterns();
    loadDataSources();
    loadMLStatus();
  }, []);

  const loadMLStatus = async () => {
    try {
      // Add timestamp to prevent caching
      const response = await fetch(`/api/ml/status?t=${Date.now()}`);
      if (response.ok) {
        const status = await response.json();
        setMLStatus(status);
      }
    } catch (error) {
      console.error('Error loading ML status:', error);
      setMLStatus({ 
        configured: false, 
        provider: 'simulated', 
        hasApiKey: false, 
        message: 'Failed to load ML configuration' 
      });
    }
  };

  const loadPatterns = async () => {
    try {
      const response = await fetch('/api/patterns');
      if (response.ok) {
        const result = await response.json();
        // Handle both wrapped and unwrapped responses
        const patternsData = result.data || result;
        console.log('Loaded patterns from database:', patternsData.map((p: Pattern) => ({
          id: p.id,
          name: p.name,
          examples: p.examples?.length || 0
        })));
        setPatterns(patternsData);
      }
    } catch (error) {
      console.error('Error loading patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDataSources = async () => {
    try {
      const response = await fetch('/api/data-sources');
      if (response.ok) {
        const result = await response.json();
        // Handle both wrapped and unwrapped responses
        const sourcesData = result.data || result;
        console.log('Loaded data sources:', sourcesData.length);
        // Set all data sources, not just connected ones, since we might not have connection status
        setDataSources(Array.isArray(sourcesData) ? sourcesData : []);
      }
    } catch (error) {
      console.error('Error loading data sources:', error);
    }
  };

  const filteredPatterns = filterType === 'ALL' 
    ? patterns 
    : patterns.filter(p => p.type === filterType);

  const togglePattern = async (patternId: string) => {
    const pattern = patterns.find(p => p.id === patternId);
    if (!pattern) return;
    
    try {
      const response = await fetch(`/api/patterns/${patternId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !pattern.isActive })
      });
      
      if (response.ok) {
        await loadPatterns();
      }
    } catch (error) {
      console.error('Error toggling pattern:', error);
    }
  };

  const deletePattern = async (patternId: string) => {
    const confirmed = await dialog.showConfirm({
      title: 'Delete Pattern',
      message: 'Are you sure you want to delete this pattern?',
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      try {
        const response = await fetch(`/api/patterns/${patternId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          await loadPatterns();
          if (selectedPattern?.id === patternId) {
            setSelectedPattern(null);
          }
        }
      } catch (error) {
        console.error('Error deleting pattern:', error);
      }
    }
  };

  const createPattern = async () => {
    if (!newPattern.name || !newPattern.description) {
      dialog.showAlert({
        title: 'Validation Error',
        message: 'Please fill in all required fields',
        type: 'warning'
      });
      return;
    }
    
    // Clean examples
    const cleanedExamples = newPattern.examples.filter(ex => ex.trim() !== '');
    
    // Try to learn regex from examples if not already provided
    let regex = newPattern.regex;
    if (!regex && cleanedExamples.length > 0) {
      const learnedRegex = patternTestingService.learnPatternFromExamples(cleanedExamples);
      if (learnedRegex) {
        regex = learnedRegex;
      }
    }
    
    try {
      const response = await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPattern,
          regex,
          examples: cleanedExamples
        })
      });
      
      if (response.ok) {
        await loadPatterns();
        setShowNewPattern(false);
        setNewPattern({
          name: '',
          type: 'PII',
          category: '',
          regex: '',
          examples: [''],
          description: '',
          color: 'bg-blue-100 text-blue-800',
          isActive: true
        });
      }
    } catch (error) {
      console.error('Error creating pattern:', error);
    }
  };

  const testPattern = async () => {
    if (!selectedPattern || !testText) return;
    
    let result;
    if (enableML) {
      result = await patternTestingService.testPatternWithML(
        testText, 
        selectedPattern, 
        selectedRedactionStyle || undefined,
        enableML
      );
    } else {
      result = patternTestingService.testPattern(
        testText, 
        selectedPattern, 
        selectedRedactionStyle || undefined
      );
    }
    
    setTestResults(result);
  };

  const addExample = () => {
    setNewPattern(prev => ({ ...prev, examples: [...prev.examples, ''] }));
  };

  const updateExample = (index: number, value: string) => {
    setNewPattern(prev => ({
      ...prev,
      examples: prev.examples.map((ex, i) => i === index ? value : ex)
    }));
  };

  const removeExample = (index: number) => {
    setNewPattern(prev => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== index)
    }));
  };

  const startAnnotation = async (dataSource: DataSource) => {
    try {
      // Fetch the data source with full content from external storage
      const response = await fetch(`/api/data-sources/${dataSource.id}?includeFileContent=true`);
      if (response.ok) {
        const fullDataSource = await response.json();
        setSelectedDataSource(fullDataSource);
        setShowAnnotation(true);
      } else {
        console.error('Failed to fetch data source with full content');
        // Fall back to using the existing data source
        setSelectedDataSource(dataSource);
        setShowAnnotation(true);
      }
    } catch (error) {
      console.error('Error fetching data source:', error);
      // Fall back to using the existing data source
      setSelectedDataSource(dataSource);
      setShowAnnotation(true);
    }
  };

  const handlePatternsFromAnnotation = async (annotatedPatterns: SensitivePattern[]) => {
    // Only process patterns that have NEW examples (not just existing ones)
    const patternsToSave: SensitivePattern[] = [];
    
    for (const annotatedPattern of annotatedPatterns) {
      // Find if this pattern already exists
      const existingPattern = patterns.find(p => p.name === annotatedPattern.label);
      
      if (!existingPattern) {
        // Completely new pattern - save it if it has examples
        if (annotatedPattern.examples.length > 0) {
          patternsToSave.push(annotatedPattern);
        }
      } else {
        // Existing pattern - only save if it has NEW examples
        const existingExamples = new Set(existingPattern.examples);
        const newExamples = annotatedPattern.examples.filter(ex => !existingExamples.has(ex));
        
        if (newExamples.length > 0) {
          // Create updated pattern with new examples added
          patternsToSave.push({
            ...annotatedPattern,
            examples: [...existingPattern.examples, ...newExamples] // Combine existing + new
          });
        }
      }
    }
    
    // Only create/update patterns that actually have changes
    for (const patternToSave of patternsToSave) {
      const existingPattern = patterns.find(p => p.name === patternToSave.label);
      
      if (existingPattern) {
        // Update existing pattern with new examples and regenerate regex
        const learnedPatterns = PatternLearningService.learnMultiplePatterns(patternToSave.examples);
        const mainRegex = learnedPatterns.length > 0 ? learnedPatterns[0].regex : existingPattern.regex;
        const regexPatterns = learnedPatterns.map(lp => lp.regex);
        
        try {
          await fetch(`/api/patterns/${existingPattern.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...existingPattern,
              examples: patternToSave.examples,
              regex: mainRegex,
              regexPatterns: regexPatterns.length > 0 ? regexPatterns : existingPattern.regexPatterns
            })
          });
        } catch (error) {
          console.error('Error updating pattern from annotation:', error);
        }
      } else {
        // Create new pattern with learned regex
        const learnedPatterns = PatternLearningService.learnMultiplePatterns(patternToSave.examples);
        
        // Extract the main regex (highest confidence)
        const mainRegex = learnedPatterns.length > 0 ? learnedPatterns[0].regex : undefined;
        
        // Extract all regex patterns
        const regexPatterns = learnedPatterns.map(lp => lp.regex);
        
        // Get context keywords from pattern learning
        const contextKeywords = patternToSave.contextKeywords || 
          PatternLearningService.suggestContextKeywords(patternToSave.examples, patternToSave.label);
        
        const newPatternData = {
          name: patternToSave.label,
          type: patternToSave.type as Pattern['type'],
          category: patternToSave.label,
          regex: mainRegex,
          regexPatterns: regexPatterns.length > 0 ? regexPatterns : undefined,
          examples: patternToSave.examples,
          description: `Pattern identified from data annotation: ${patternToSave.label}`,
          color: patternToSave.color,
          isActive: true,
          contextKeywords: contextKeywords.length > 0 ? contextKeywords : undefined
        };
        
        try {
          await fetch('/api/patterns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPatternData)
          });
        } catch (error) {
          console.error('Error creating pattern from annotation:', error);
        }
      }
    }
    
    // Only refresh if we actually saved something
    if (patternsToSave.length > 0) {
      await loadPatterns();
    }
    
    // Always close annotation interface
    setShowAnnotation(false);
    setSelectedDataSource(null);
  };

  const handleContextPatternSelect = async (patternName: string, examples: string[], isCluster?: boolean, clusterFields?: string[]) => {
    // Map common pattern names to our types
    const typeMapping: Record<string, Pattern['type']> = {
      'Social Security Number': 'PII',
      'Email Address': 'PII',
      'Phone Number': 'PII',
      'Credit Card Number': 'FINANCIAL',
      'Date of Birth': 'PII',
      'Address': 'PII',
      'Personal Identity Information': 'PII',
      'Complete Address': 'PII',
      'Payment Card Information': 'FINANCIAL',
      'Medical Record': 'MEDICAL',
      'Bank Account Information': 'FINANCIAL',
      'Employee Record': 'PII'
    };

    // Try to learn regex from examples
    const learnedRegex = patternTestingService.learnPatternFromExamples ? 
      patternTestingService.learnPatternFromExamples(examples) : null;
    
    const newPatternData = {
      name: patternName,
      type: typeMapping[patternName] || 'CUSTOM',
      category: patternName,
      examples: examples,
      regex: learnedRegex || '',
      description: isCluster 
        ? `Cluster pattern containing ${clusterFields?.length || 0} related fields: ${clusterFields?.join(', ')}`
        : `Pattern detected using context-aware analysis`,
      color: isCluster ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800',
      isActive: true,
      // Store cluster metadata in the pattern
      metadata: isCluster ? JSON.stringify({ isCluster: true, clusterFields }) : undefined
    };
    
    try {
      await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatternData)
      });
      await loadPatterns();
      
      // Show success message for clusters
      if (isCluster) {
        dialog.showAlert({
          title: 'Cluster Pattern Created',
          message: `Successfully created cluster pattern "${patternName}" with ${clusterFields?.length || 0} fields. This pattern will now appear in your pattern list and can be used for comprehensive redaction.`,
          type: 'success'
        });
      }
      
      setShowContextDetector(false);
      setContextDetectorText('');
    } catch (error) {
      console.error('Error creating pattern from context detection:', error);
    }
  };

  const convertDataSourceToFileData = async (dataSource: DataSource): Promise<FileData[]> => {
    // For transformed data sources, get the JSON data from the database
    if (dataSource.hasTransformedData) {
      try {
        const response = await fetch(`/api/data-sources/${dataSource.id}/transform`);
        if (response.ok) {
          const catalog = await response.json();
          
          // For PDFs and documents, use the full text content if available, otherwise use structured data
          const content = catalog.records.map((record: { data: Record<string, unknown> }, index: number) => {
            // Check if this is a document with full text content
            if (record.data.fullTextContent && typeof record.data.fullTextContent === 'string') {
              return record.data.fullTextContent;
            }
            
            // For other data types or if no full text content, use structured format
            const lines = [`Record ${index + 1}:`];
            
            // Extract key-value pairs as readable text
            for (const [key, value] of Object.entries(record.data)) {
              if (value !== null && value !== undefined && key !== 'fullTextContent') {
                lines.push(`${key}: ${String(value)}`);
              }
            }
            
            return lines.join('\n');
          }).join('\n\n');
          
          return [{
            id: `${dataSource.id}-transformed`,
            name: `${dataSource.name}-transformed.json`,
            type: 'application/json',
            size: content.length,
            content
          }];
        }
      } catch (error) {
        console.error('Error loading transformed data for annotation:', error);
      }
    }

    // Handle different data source types
    if (dataSource.type === 'database') {
      // For database sources, try to get sample data
      const sampleData = dataSource.configuration.data || [];
      const content = JSON.stringify(sampleData, null, 2);
      return [{
        id: `${dataSource.id}-database`,
        name: `${dataSource.name} (Database)`,
        type: 'application/json',
        size: content.length,
        content
      }];
    } else if (dataSource.type === 'api') {
      // For API sources, use cached/sample data
      const apiData = dataSource.configuration.data || {};
      const content = JSON.stringify(apiData, null, 2);
      return [{
        id: `${dataSource.id}-api`,
        name: `${dataSource.name} (API)`,
        type: 'application/json',
        size: content.length,
        content
      }];
    } else if ((dataSource.type === 'filesystem' || dataSource.type === 'json_transformed') && dataSource.configuration.files) {
      // Handle file-based sources
      return dataSource.configuration.files.map((file: { 
        name: string; 
        type: string; 
        size: number; 
        content?: string;
        contentTruncated?: boolean;
        originalContentLength?: number;
      }) => {
        return {
          id: `${dataSource.id}-${file.name}`,
          name: file.name,
          type: file.type,
          size: file.size,
          content: file.content || '',
          contentTruncated: file.contentTruncated,
          originalContentLength: file.originalContentLength
        };
      });
    }
    
    // Default fallback - try to extract any data from configuration
    const fallbackData = dataSource.configuration.data || dataSource.configuration || {};
    const content = JSON.stringify(fallbackData, null, 2);
    return [{
      id: dataSource.id,
      name: dataSource.name,
      type: 'application/json',
      size: content.length,
      content
    }];
  };

  // If showing annotation, render the annotation component with AppLayout
  if (showAnnotation && selectedDataSource) {
    return (
      <AppLayout>
        <AnnotationWrapper 
          dataSource={selectedDataSource}
          patterns={patterns}
          onPatternsIdentified={handlePatternsFromAnnotation}
          onBack={() => {
            setShowAnnotation(false);
            setSelectedDataSource(null);
          }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Pattern Definition</h1>
                <p className="text-gray-600 mt-1">Define and manage sensitive data patterns for redaction</p>
              </div>
              <HelpButton 
                content={getHelpContent('redaction')} 
                className="ml-2"
              />
              <MLIndicator className="ml-2" />
            </div>
            <div className="flex gap-3">
              <Tooltip text="Use AI-powered analysis to automatically detect sensitive data patterns in your text">
                <button
                  onClick={() => {
                    setContextDetectorSource(null);
                    setContextDetectorText('');
                    setShowContextDetector(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <ShieldCheckIcon className="h-5 w-5" />
                  Smart Detection
                </button>
              </Tooltip>
              <Tooltip text="Create a new custom pattern for sensitive data detection">
                <button
                  onClick={() => setShowNewPattern(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                New Pattern
              </button>
              </Tooltip>
            </div>
          </div>

          {/* Pattern Filter Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setFilterType('ALL')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filterType === 'ALL'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                All Patterns ({patterns.length})
              </button>
              {patternTypes.map(type => {
                const count = patterns.filter(p => p.type === type.value).length;
                return (
                  <button
                    key={type.value}
                    onClick={() => setFilterType(type.value)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      filterType === type.value
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    {type.label} ({count})
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Pattern List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">Defined Patterns</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {loading ? (
                    <div className="p-12 text-center">
                      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading patterns...</p>
                    </div>
                  ) : filteredPatterns.length === 0 ? (
                    <div className="p-12 text-center">
                      <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-700 mb-4">No patterns defined yet</p>
                      <button
                        onClick={() => setShowNewPattern(true)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Create your first pattern
                      </button>
                    </div>
                  ) : (
                    filteredPatterns.map(pattern => (
                    <div
                      key={pattern.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        selectedPattern?.id === pattern.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedPattern(pattern)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <ShieldCheckIcon className={`h-5 w-5 ${pattern.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                            <h3 className="font-medium text-gray-900">{pattern.name}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${pattern.color}`}>
                              {pattern.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{pattern.description}</p>
                          <ClusterPatternDisplay pattern={pattern} />
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-700">
                            <span>Examples: {pattern.examples.length}</span>
                            {pattern.regex && (
                              <span className="flex items-center gap-1 min-w-0">
                                <span className="flex-shrink-0">Regex:</span>
                                <code className="bg-gray-100 px-1 rounded text-xs truncate min-w-0 max-w-[200px]" title={pattern.regex}>
                                  {pattern.regex}
                                </code>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePattern(pattern.id);
                            }}
                            className={`px-3 py-1 text-xs rounded ${
                              pattern.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {pattern.isActive ? 'Active' : 'Inactive'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePattern(pattern.id);
                            }}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )))
                  }
                </div>
              </div>
            </div>

            {/* Pattern Details */}
            <div>
              {selectedPattern ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Pattern Details</h3>
                  
                  <dl className="space-y-4 text-sm">
                    <div>
                      <dt className="text-gray-700 font-medium">Name</dt>
                      <dd className="font-medium text-gray-900 mt-1">{selectedPattern.name}</dd>
                    </div>
                    
                    <div>
                      <dt className="text-gray-700 font-medium">Type</dt>
                      <dd className="mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${selectedPattern.color}`}>
                          {selectedPattern.type}
                        </span>
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-gray-700 font-medium">Regular Expression</dt>
                      <dd className="font-mono bg-gray-100 p-2 rounded text-xs text-gray-900 mt-1 break-all overflow-hidden">
                        <div className="whitespace-pre-wrap break-words">
                          {selectedPattern.regex || 'None defined'}
                        </div>
                      </dd>
                    </div>
                    
                    {selectedPattern.regexPatterns && selectedPattern.regexPatterns.length > 0 && (
                      <div>
                        <dt className="text-gray-700 font-medium">Additional Regex Patterns</dt>
                        <dd className="space-y-2 mt-1">
                          {selectedPattern.regexPatterns.map((regex, index) => (
                            <div key={index} className="font-mono bg-gray-100 p-2 rounded text-xs text-gray-900 break-all overflow-hidden">
                              <div className="whitespace-pre-wrap break-words">
                                {regex}
                              </div>
                            </div>
                          ))}
                        </dd>
                      </div>
                    )}
                    
                    <div>
                      <dt className="text-gray-700 font-medium mb-2">Examples</dt>
                      <dd className="space-y-1">
                        {selectedPattern.examples.map((example, idx) => (
                          <div key={idx} className="bg-gray-50 px-2 py-1 rounded text-sm text-gray-900">
                            {example}
                          </div>
                        ))}
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-gray-700 font-medium">Created</dt>
                      <dd className="text-gray-900 mt-1">
                        {new Date(selectedPattern.createdAt).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                  
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Test Pattern</h4>
                    <textarea
                      value={testText}
                      onChange={(e) => setTestText(e.target.value)}
                      placeholder="Paste sample text to test pattern matching..."
                      className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-700"
                    />
                    
                    {/* Redaction Style Selector */}
                    {selectedPattern && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-900 mb-1">Redaction Style</label>
                        <div className="flex gap-2 flex-wrap">
                          {patternTestingService.getAvailableRedactionStyles(selectedPattern.type).map((style, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedRedactionStyle(style)}
                              className={`px-3 py-1 text-xs rounded transition-colors ${
                                selectedRedactionStyle?.format === style.format
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {style.format}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* ML Detection Toggle */}
                    <div className="mt-3 space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={enableML && mlStatus.configured}
                          onChange={(e) => setEnableML(e.target.checked)}
                          disabled={!mlStatus.configured}
                          className="rounded border-gray-300"
                        />
                        <span className="text-gray-700">Enable ML Detection</span>
                        <span className="text-xs text-gray-700">(AI-powered pattern recognition)</span>
                      </label>
                      <div className={`text-xs px-2 py-1 rounded ${
                        mlStatus.configured 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}>
                        <span className="font-medium">Status:</span> {mlStatus.message}
                      </div>
                    </div>
                    
                    <button 
                      onClick={testPattern}
                      disabled={!testText}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {enableML ? 'Test Match with AI' : 'Test Match'}
                    </button>
                    
                    {testResults && (
                      <div className="mt-4 space-y-4">
                        {/* Statistics */}
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 mb-2">Match Statistics</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-600">Total Matches:</span>
                              <span className="ml-2 font-medium text-gray-900">{testResults.statistics.totalMatches}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Confidence:</span>
                              <span className="ml-2 font-medium text-gray-900">
                                {Math.round(testResults.statistics.averageConfidence * 100)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Regex Matches:</span>
                              <span className="ml-2 font-medium text-gray-900">{testResults.statistics.regexMatches}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Example Matches:</span>
                              <span className="ml-2 font-medium text-gray-900">{testResults.statistics.exampleMatches}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Context Matches:</span>
                              <span className="ml-2 font-medium text-gray-900">{testResults.statistics.contextMatches}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">ML Matches:</span>
                              <span className="ml-2 font-medium text-gray-900">{testResults.statistics.mlMatches}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Matched Values */}
                        {testResults.matches.length > 0 && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-900 mb-2">Detected Values</p>
                            <div className="space-y-1">
                              {testResults.matches.map((match, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <span className="bg-yellow-200 text-yellow-900 px-2 py-1 rounded">
                                    {match.value}
                                  </span>
                                  <span className={`px-2 py-1 rounded ${
                                    match.method === 'regex' ? 'bg-blue-100 text-blue-700' :
                                    match.method === 'example' ? 'bg-green-100 text-green-700' :
                                    match.method === 'context' ? 'bg-purple-100 text-purple-700' :
                                    match.method.startsWith('ml-') ? 'bg-orange-100 text-orange-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {match.method.startsWith('ml-') ? 'ML' : match.method}
                                  </span>
                                  {match.mlLabel && (
                                    <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-xs border border-orange-200">
                                      {match.mlLabel}
                                    </span>
                                  )}
                                  <span className="text-gray-600">
                                    {Math.round(match.confidence * 100)}% confidence
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Redacted Preview */}
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 mb-2">Redacted Preview</p>
                          <div className="bg-white p-3 rounded border border-gray-200">
                            <pre className="text-xs text-gray-900 whitespace-pre-wrap break-words">
                              {testResults.redactedText}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-center text-gray-700">
                    <ShieldCheckIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>Select a pattern to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Data Source Integration */}
          {dataSources.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Connected Data Sources</h3>
              <div className="space-y-4">
                {dataSources.map((dataSource) => (
                  <div key={dataSource.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {dataSource.type === 'database' ? (
                          <CircleStackIcon className="h-6 w-6 text-purple-600 flex-shrink-0 mt-0.5" />
                        ) : dataSource.type === 'api' ? (
                          <CodeBracketIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : dataSource.type === 's3' || dataSource.type === 'azure' || dataSource.type === 'gcp' ? (
                          <CloudIcon className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <DocumentTextIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{dataSource.name}</h4>
                            {dataSource.type === 'json_transformed' && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                Transformed
                              </span>
                            )}
                            {dataSource.type === 'database' && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                                Database
                              </span>
                            )}
                            {dataSource.type === 'api' && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                API
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-1">
                            {dataSource.type === 'database' ? (
                              `${dataSource.configuration.database || 'Database'} - ${dataSource.configuration.tableName || 'Table'}`
                            ) : dataSource.type === 'api' ? (
                              `${dataSource.configuration.endpoint || 'API endpoint'}`
                            ) : (
                              `${dataSource.configuration.files?.length || 0} ${dataSource.type === 'json_transformed' ? 'transformed dataset' : 'file'}${dataSource.configuration.files?.length !== 1 ? 's' : ''} ${dataSource.type === 'json_transformed' ? 'available' : 'uploaded'}`
                            )}
                          </p>
                          <div className="flex gap-3 mt-3">
                            <button
                              onClick={() => startAnnotation(dataSource)}
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                            >
                              Annotate Data
                            </button>
                            <button
                              onClick={async () => {
                                const fileData = await convertDataSourceToFileData(dataSource);
                                if (fileData.length > 0) {
                                  setContextDetectorText(fileData.map(f => f.content).join('\n\n'));
                                  setContextDetectorSource(dataSource.name);
                                  setShowContextDetector(true);
                                }
                              }}
                              className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                            >
                              Smart Detection
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {dataSources.length === 0 && (
                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                    <div className="flex items-start gap-3">
                      <DocumentTextIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-blue-900 mb-2">
                          No Data Sources Connected
                        </h3>
                        <p className="text-sm text-blue-800 mb-3">
                          Visit Data Discovery to connect data sources for pattern creation.
                        </p>
                        <a
                          href="/discovery"
                          className="inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Go to Data Discovery →
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* New Pattern Modal */}
          {showNewPattern && (
            <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowNewPattern(false)}>
              <div className="bg-white rounded-lg border-2 border-gray-600 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Pattern</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Pattern Name</label>
                    <input
                      type="text"
                      value={newPattern.name}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-700"
                      placeholder="e.g., Social Security Number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Type</label>
                    <select
                      value={newPattern.type}
                      onChange={(e) => {
                        const selectedType = patternTypes.find(pt => pt.value === e.target.value);
                        setNewPattern(prev => ({ 
                          ...prev, 
                          type: e.target.value as Pattern['type'],
                          color: selectedType?.color || 'bg-blue-100 text-blue-800'
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                    >
                      {patternTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Category</label>
                    <input
                      type="text"
                      value={newPattern.category}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-700"
                      placeholder="e.g., Government ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                    <textarea
                      value={newPattern.description}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20 text-gray-900 placeholder-gray-700"
                      placeholder="Describe what this pattern detects..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Regular Expression (Optional)</label>
                    <input
                      type="text"
                      value={newPattern.regex}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, regex: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm text-gray-900 placeholder-gray-700"
                      placeholder="e.g., \\d{3}-\\d{2}-\\d{4}"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Examples</label>
                    {newPattern.examples.map((example, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={example}
                          onChange={(e) => updateExample(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-700"
                          placeholder="Example value..."
                        />
                        {newPattern.examples.length > 1 && (
                          <button
                            onClick={() => removeExample(index)}
                            className="px-3 py-2 text-red-600 hover:text-red-800"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addExample}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      + Add Example
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowNewPattern(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createPattern}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Pattern
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Context-Aware Pattern Detector Modal */}
          {showContextDetector && (
            <div 
              className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => {
                setShowContextDetector(false);
                setContextDetectorText('');
                setContextDetectorSource(null);
              }}
            >
              <div 
                className="bg-white rounded-lg border-2 border-gray-600 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Smart Pattern Detection</h2>
                    {contextDetectorSource && (
                      <p className="text-sm text-gray-700 mt-1">Analyzing: {contextDetectorSource}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowContextDetector(false);
                      setContextDetectorText('');
                      setContextDetectorSource(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {contextDetectorSource 
                      ? 'Data source content loaded for analysis' 
                      : 'Paste or type sample text containing sensitive data'}
                  </label>
                  <textarea
                    value={contextDetectorText}
                    onChange={(e) => setContextDetectorText(e.target.value)}
                    readOnly={!!contextDetectorSource}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg h-32 text-gray-900 placeholder-gray-700 ${
                      contextDetectorSource ? 'bg-gray-50' : ''
                    }`}
                    placeholder="Example: My name is John Smith and my SSN is 123-45-6789. You can reach me at john@example.com or call 555-123-4567..."
                  />
                </div>

                {contextDetectorText && (
                  <ContextAwarePatternDetector
                    text={contextDetectorText}
                    onPatternSelect={handleContextPatternSelect}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}