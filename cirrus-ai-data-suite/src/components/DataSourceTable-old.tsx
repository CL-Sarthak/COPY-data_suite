'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { DataSource } from '@/types/discovery';
import { Tooltip } from '@/components/HelpSystem';
import { TagManager, TagFilter } from '@/components/TagManager';
import {
  ServerIcon,
  CloudIcon,
  CircleStackIcon,
  GlobeAltIcon,
  FolderIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  PencilIcon,
  TrashIcon,
  MapIcon,
  ChartBarIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

interface DataSourceTableProps {
  dataSources: DataSource[];
  loading: boolean;
  transformingSource: string | null;
  transformProgress: { [key: string]: string };
  onSourceSelect: (source: DataSource) => void;
  onTransform: (sourceId: string) => void;
  onEdit: (source: DataSource) => void;
  onDelete: (sourceId: string) => void;
  onAnalyze: (source: DataSource) => void;
  onMap: (source: DataSource) => void;
  onAddFiles: (source: DataSource) => void;
  onTagsUpdate: (sourceId: string, tags: string[]) => void;
  onProfile: (source: DataSource) => void;
}

type SortField = 'name' | 'type' | 'status' | 'recordCount' | 'lastSync' | 'transformedAt';
type SortDirection = 'asc' | 'desc';

// Component for showing transformed data preview inline
function TransformedDataPreview({ sourceId }: { sourceId: string }) {
  const [previewData, setPreviewData] = useState<{ records: Array<{ data: Record<string, unknown> }>; totalRecords: number; schema: { fields: Array<unknown> } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  useEffect(() => {
    loadPreviewData();
  }, [sourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPreviewData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/data-sources/${sourceId}/transform`);
      if (response.ok) {
        const catalog = await response.json();
        setPreviewData(catalog);
      } else {
        setError('Failed to load preview data');
      }
    } catch (err) {
      console.error('Error loading preview data:', err);
      setError('Error loading preview data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-blue-600 font-medium">
          📊 Loading transformed JSON data...
        </div>
        <div className="animate-pulse bg-gray-200 h-16 rounded"></div>
      </div>
    );
  }

  if (error || !previewData) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-red-600 font-medium">
          ⚠️ Unable to load transformed data preview
        </div>
        <div className="text-xs text-gray-500">
          Click the &quot;View Catalog&quot; button to explore the full dataset.
        </div>
      </div>
    );
  }

  // Show first 2 records for inline display
  const previewRecords = previewData.records.slice(0, 2);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-blue-600 font-medium">
          📊 Transformed JSON data ({previewData.totalRecords.toLocaleString()} total records)
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {previewData.schema.fields.length} normalized fields available
          </div>
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('formatted')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'formatted'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Formatted
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === 'raw'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Raw JSON
            </button>
          </div>
        </div>
      </div>
      
      {/* Preview Content - Full width */}
      <div className="w-full bg-white rounded border p-4 max-h-64 overflow-y-auto">
        <div className="text-sm font-medium text-gray-700 mb-4">
          Sample Records (showing {previewRecords.length} of {previewData.totalRecords}):
        </div>
        
        {viewMode === 'formatted' ? (
          /* Formatted View */
          <div className="w-full space-y-4">
            {previewRecords.map((record: Record<string, unknown> | { data: Record<string, unknown> }, index: number) => {
              // Handle both wrapped records (with .data) and raw JSON records
              const recordData = record.data || record;
              const isValidRecord = recordData && typeof recordData === 'object';
              
              if (!isValidRecord) {
                return (
                  <div key={index} className="w-full bg-gray-50 rounded p-4 border">
                    <div className="text-sm text-gray-600">Invalid record format</div>
                  </div>
                );
              }
              
              return (
                <div key={index} className="w-full bg-gray-50 rounded p-4 border">
                  <div className="text-sm font-medium text-gray-600 mb-3">Record {index + 1}:</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-2">
                    {Object.entries(recordData).map(([key, value]) => (
                      <div key={key} className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-gray-600 truncate">{key}</span>
                        <span className="text-sm text-gray-900 break-words">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Raw JSON View */
          <div className="w-full space-y-4">
            {previewRecords.map((record: Record<string, unknown> | { data: Record<string, unknown> }, index: number) => {
              const recordData = record.data || record;
              return (
                <div key={index} className="w-full bg-gray-50 rounded p-4 border">
                  <div className="text-sm font-medium text-gray-600 mb-3">Record {index + 1} (Raw JSON):</div>
                  <pre className="text-xs font-mono bg-gray-900 text-green-400 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(recordData, null, 2)}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Component for file content with toggle between preview and full text
function FileContentViewer({ file, sourceId }: { file: { content?: string; type?: string; name?: string; storageKey?: string }; sourceId: string }) {
  const [viewMode, setViewMode] = useState<'preview' | 'full'>('preview');
  const [content, setContent] = useState<string | null>(file.content || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // If content is not available but we have a storageKey or it's stored externally, fetch it
  useEffect(() => {
    if (!content && (file.storageKey || !file.content)) {
      fetchFileContent();
    }
  }, [sourceId, file.storageKey]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const fetchFileContent = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch the data source with file content included
      const response = await fetch(`/api/data-sources/${sourceId}?includeFileContent=true`);
      if (response.ok) {
        const dataSource = await response.json();
        const fileData = dataSource.configuration?.files?.find((f: { name: string }) => f.name === file.name);
        if (fileData?.content) {
          setContent(fileData.content);
        } else {
          setError('File content not available');
        }
      } else {
        setError('Failed to load file content');
      }
    } catch (err) {
      console.error('Error loading file content:', err);
      setError('Error loading file content');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600 text-sm">
        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        Loading file content...
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-red-600 text-sm">
        {error}
        <button 
          onClick={fetchFileContent}
          className="ml-2 text-blue-600 hover:text-blue-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!content) {
    return <div className="text-gray-400 italic text-sm">No content preview available</div>;
  }

  // More comprehensive file type detection for text documents
  const isTextDocument = file.type === 'application/pdf' || 
                         file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                         file.type === 'text/plain' ||
                         file.type === 'text/csv' ||
                         file.type === 'application/json' ||
                         file.name?.toLowerCase().endsWith('.pdf') ||
                         file.name?.toLowerCase().endsWith('.docx') ||
                         file.name?.toLowerCase().endsWith('.txt') ||
                         file.name?.toLowerCase().endsWith('.csv') ||
                         file.name?.toLowerCase().endsWith('.json');
  
  let preview = content;
  
  // Try to format JSON nicely
  if (file.type === 'application/json') {
    try {
      const parsed = JSON.parse(content);
      preview = JSON.stringify(parsed, null, 2);
    } catch {
      // Keep original content if JSON parsing fails
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {viewMode === 'preview' ? `Content preview (first 500 characters):` : `Full document content:`}
          <span className="ml-2 text-gray-400">
            ({content.length.toLocaleString()} chars, {file.type || 'unknown type'})
          </span>
        </div>
        {isTextDocument && content.length > 200 && (
          <div className="flex items-center bg-gray-100 rounded p-0.5">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                viewMode === 'preview'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setViewMode('full')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                viewMode === 'full'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Full Text
            </button>
          </div>
        )}
      </div>
      
      <div className={`p-4 bg-gray-50 rounded text-sm leading-relaxed overflow-x-auto border whitespace-pre-wrap text-gray-900 ${
        viewMode === 'full' ? 'max-h-96' : 'max-h-32'
      } overflow-y-auto`}>
        {viewMode === 'preview' 
          ? `${preview.substring(0, 500)}${preview.length > 500 ? '\n\n... [Click "Full Text" to see complete content] ...' : ''}`
          : preview
        }
      </div>
    </div>
  );
}

// Component to show inline details for a data source
function DataSourceDetails({ source }: { source: DataSource }) {
  const formatFileContent = (source: DataSource, file: { content?: string; type?: string; name?: string }) => {
    return <FileContentViewer file={file} sourceId={source.id} />;
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {(source.type === 'filesystem' || source.type === 'json_transformed') ? 'Files' : 'Schema'} Details
        </h3>
        {source.tags && source.tags.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Tags:</span>
            <div className="flex flex-wrap gap-1">
              {source.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {(source.type === 'filesystem' || source.type === 'json_transformed') && source.configuration.files ? (
        <>
          {/* For transformed sources, show full-width preview first */}
          {source.hasTransformedData && (
            <div className="w-full mb-6">
              <TransformedDataPreview sourceId={source.id} />
            </div>
          )}
          
          {/* Then show files - full width for large files, grid for small ones */}
          <div className="space-y-4">
            {source.configuration.files.slice(0, 8).map((file, idx: number) => {
              const hasLargeContent = file.content && file.content.length > 1000;
              const isTextDocument = file.type === 'application/pdf' || 
                                     file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                                     file.type === 'text/plain' ||
                                     file.type === 'text/csv' ||
                                     file.type === 'application/json' ||
                                     file.name?.toLowerCase().endsWith('.pdf') ||
                                     file.name?.toLowerCase().endsWith('.docx') ||
                                     file.name?.toLowerCase().endsWith('.txt') ||
                                     file.name?.toLowerCase().endsWith('.csv') ||
                                     file.name?.toLowerCase().endsWith('.json');
              
              if (hasLargeContent && isTextDocument) {
                // Full-width layout for large text documents
                return (
                  <div key={idx} className="w-full border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
                      <DocumentIcon className="h-5 w-5 text-gray-400" />
                      <div className="flex-1">
                        <h4 className="text-base font-medium text-gray-900">{file.name}</h4>
                        <div className="text-sm text-gray-600 mt-1">
                          Type: {file.type || 'Unknown'} • Size: {(file.size / 1024).toFixed(1)} KB
                          {file.content && (
                            <span className="ml-2">
                              • Content: {file.content.length.toLocaleString()} characters
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {formatFileContent(source, file)}
                  </div>
                );
              } else {
                // Grid layout for smaller files
                return (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-white" style={{ minWidth: '300px' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <DocumentIcon className="h-4 w-4 text-gray-400" />
                      <h4 className="text-sm font-medium text-gray-900 truncate">{file.name}</h4>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      Type: {file.type || 'Unknown'}
                      {file.content && (
                        <span className="ml-2 text-gray-500">
                          ({file.content.length.toLocaleString()} chars)
                        </span>
                      )}
                    </div>
                    {formatFileContent(source, file)}
                  </div>
                );
              }
            })}
            
            {/* Show remaining files in grid if any */}
            {source.configuration.files.length > 8 && (
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <DocumentIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-600">
                    +{source.configuration.files.length - 8} more files
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : source.metadata?.tables ? (
        <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {source.metadata.tables.slice(0, 8).map((table) => (
            <div key={table.name} className="border border-gray-200 rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">{table.schema}.{table.name}</h4>
                <span className="text-xs text-gray-500">
                  {table.rowCount.toLocaleString()} rows
                </span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {table.columns.slice(0, 6).map((column) => (
                  <div key={column.name} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 truncate">{column.name}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-gray-500">{column.type}</span>
                      {column.containsPII && (
                        <span className="px-1 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                          {column.piiType}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {table.columns.length > 6 && (
                  <div className="text-xs text-gray-500 italic">
                    +{table.columns.length - 6} more columns
                  </div>
                )}
              </div>
            </div>
          ))}
          {source.metadata.tables.length > 8 && (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <CircleStackIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <div className="text-sm text-gray-600">
                  +{source.metadata.tables.length - 8} more tables
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <CircleStackIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm">No detailed information available</p>
        </div>
      )}
    </div>
  );
}

export default function DataSourceTable({
  dataSources,
  loading,
  transformingSource,
  transformProgress,
  onSourceSelect,
  onTransform,
  onEdit,
  onDelete,
  onAnalyze,
  onMap,
  onAddFiles,
  onTagsUpdate,
  onProfile,
}: DataSourceTableProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get all available tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    dataSources.forEach(source => {
      source.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [dataSources]);

  // Filter and sort data sources
  const filteredAndSortedDataSources = useMemo(() => {
    // First filter by tags
    let filtered = dataSources;
    if (selectedTagFilters.length > 0) {
      filtered = dataSources.filter(source => 
        selectedTagFilters.some(filterTag => source.tags?.includes(filterTag))
      );
    }

    // Then sort
    return [...filtered].sort((a, b) => {
      let aValue: string | number | Date | undefined;
      let bValue: string | number | Date | undefined;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'status':
          aValue = a.connectionStatus;
          bValue = b.connectionStatus;
          break;
        case 'recordCount':
          aValue = a.recordCount || 0;
          bValue = b.recordCount || 0;
          break;
        case 'lastSync':
          aValue = a.lastSync ? new Date(a.lastSync).getTime() : 0;
          bValue = b.lastSync ? new Date(b.lastSync).getTime() : 0;
          break;
        case 'transformedAt':
          aValue = a.transformedAt ? new Date(a.transformedAt).getTime() : 0;
          bValue = b.transformedAt ? new Date(b.transformedAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [dataSources, sortField, sortDirection, selectedTagFilters]);

  const getSourceIcon = (type: DataSource['type']) => {
    switch (type) {
      case 'database': return <CircleStackIcon className="h-4 w-4" />;
      case 's3':
      case 'azure':
      case 'gcp': return <CloudIcon className="h-4 w-4" />;
      case 'api': return <GlobeAltIcon className="h-4 w-4" />;
      case 'filesystem': return <FolderIcon className="h-4 w-4" />;
      case 'json_transformed': return <ArrowsRightLeftIcon className="h-4 w-4" />;
      default: return <ServerIcon className="h-4 w-4" />;
    }
  };

  const getSourceTypeLabel = (type: DataSource['type']) => {
    switch (type) {
      case 'database': return 'Database';
      case 's3': return 'Amazon S3';
      case 'azure': return 'Azure Blob';
      case 'gcp': return 'Google Cloud';
      case 'api': return 'API';
      case 'filesystem': return 'Filesystem';
      case 'json_transformed': return 'Transformed JSON';
      default: return type;
    }
  };

  const getStatusIcon = (status: DataSource['connectionStatus']) => {
    switch (status) {
      case 'connected': return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'connecting': return <ArrowPathIcon className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <ExclamationCircleIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: DataSource['connectionStatus']) => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'error': return 'Error';
      case 'connecting': return 'Connecting';
      case 'disconnected': return 'Disconnected';
      default: return status;
    }
  };

  const formatTime = (date?: Date | string) => {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    const minutes = Math.floor((Date.now() - dateObj.getTime()) / 1000 / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field && (
          sortDirection === 'asc' ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )
        )}
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading data sources...</p>
      </div>
    );
  }

  if (dataSources.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-12 text-center">
          <CircleStackIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Sources Connected</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Your data sources will appear here as a sortable table. Connect your first data source to get started.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto">
            <p className="text-sm text-blue-800">
              <strong>Pro Tip:</strong> The table view allows you to sort by name, type, status, record count, and last activity to easily manage multiple data sources.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Tag Filter Header */}
      {allTags.length > 0 && (
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedTagFilters.length > 0 
                  ? `Showing ${filteredAndSortedDataSources.length} of ${dataSources.length} data sources`
                  : `${dataSources.length} data sources`
                }
              </span>
              {selectedTagFilters.length > 0 && (
                <button
                  onClick={() => setSelectedTagFilters([])}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear filters
                </button>
              )}
            </div>
            <TagFilter
              allTags={allTags}
              selectedTags={selectedTagFilters}
              onTagFilterChange={setSelectedTagFilters}
            />
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="pl-4 pr-2 py-3 w-8"></th>
              <SortHeader field="name">Name & Type</SortHeader>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="recordCount">Records</SortHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <SortHeader field="lastSync">Last Activity</SortHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Transform
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedDataSources.map((source) => (
              <React.Fragment key={source.id}>
                <tr
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Expand/Collapse Button */}
                  <td className="pl-4 pr-2 py-4 whitespace-nowrap">
                    <button
                      onClick={() => {
                        if (expandedRow === source.id) {
                          setExpandedRow(null);
                        } else {
                          setExpandedRow(source.id);
                          onSourceSelect(source);
                        }
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {expandedRow === source.id ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                {/* Name & Type */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-3 text-gray-400">
                      {getSourceIcon(source.type)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900">{source.name}</div>
                        {source.metadata && typeof source.metadata === 'object' && 'isEnhanced' in source.metadata && (source.metadata as { isEnhanced: boolean }).isEnhanced && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Enhanced
                          </span>
                        )}
                        {source.hasTransformedData && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            JSON Ready
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{getSourceTypeLabel(source.type)}</div>
                      {(source.type === 'filesystem' || source.type === 'json_transformed') && source.configuration.files && (
                        <div className="text-xs text-gray-400 mt-1">
                          {source.configuration.files.length} file{source.configuration.files.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getStatusIcon(source.connectionStatus)}
                    <span className="ml-2 text-sm text-gray-900">{getStatusLabel(source.connectionStatus)}</span>
                  </div>
                </td>

                {/* Records */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {source.recordCount ? source.recordCount.toLocaleString() : '-'}
                </td>

                {/* Tags */}
                <td className="px-6 py-4">
                  <TagManager
                    tags={source.tags || []}
                    availableTags={allTags}
                    onTagsChange={(tags) => onTagsUpdate(source.id, tags)}
                    size="sm"
                  />
                </td>

                {/* Last Activity */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(source.hasTransformedData ? source.transformedAt : source.lastSync)}
                </td>

                {/* Transform */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {transformProgress[source.id] ? (
                    <div className="flex items-center space-x-2">
                      <ArrowPathIcon className="h-4 w-4 text-blue-600 animate-spin" />
                      <span className="text-sm text-blue-700">Processing...</span>
                    </div>
                  ) : (
                    <Tooltip text={
                      source.type === 'json_transformed' 
                        ? 'This source is already transformed' 
                        : source.hasTransformedData
                        ? 'View the transformed data catalog'
                        : 'Transform this data to unified JSON format'
                    }>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTransform(source.id);
                        }}
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors ${
                          source.type === 'json_transformed' 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : source.hasTransformedData
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                        disabled={transformingSource === source.id || source.type === 'json_transformed'}
                      >
                        {transformingSource === source.id ? (
                          <>
                            <ArrowPathIcon className="h-3 w-3 animate-spin mr-1" />
                            Processing
                          </>
                        ) : source.hasTransformedData ? (
                          <>
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            View Catalog
                          </>
                        ) : (
                          <>
                            <ArrowsRightLeftIcon className="h-3 w-3 mr-1" />
                            Transform
                          </>
                        )}
                      </button>
                    </Tooltip>
                  )}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    {source.hasTransformedData && (
                      <>
                        <Tooltip text="Map fields to global catalog schema">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMap(source);
                            }}
                            className="text-gray-400 hover:text-purple-600 transition-colors"
                          >
                            <MapIcon className="h-4 w-4" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Analyze data schema and field relationships">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnalyze(source);
                            }}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <ChartBarIcon className="h-4 w-4" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Generate comprehensive data quality profile">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onProfile(source);
                            }}
                            className="text-gray-400 hover:text-purple-600 transition-colors"
                          >
                            <ClipboardDocumentCheckIcon className="h-4 w-4" />
                          </button>
                        </Tooltip>
                      </>
                    )}
                    {source.type === 'filesystem' && (
                      <Tooltip text="Add additional files to this data source">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddFiles(source);
                          }}
                          className="text-gray-400 hover:text-green-600 transition-colors"
                        >
                          <FolderIcon className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip text="Edit data source name">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(source);
                        }}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Delete this data source permanently">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(source.id);
                        }}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
              
              {/* Expandable Details Row */}
              {expandedRow === source.id && (
                <tr className="bg-gray-50">
                  <td colSpan={8} className="p-0">
                    <div className="w-full px-6 py-6">
                      <DataSourceDetails source={source} />
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}