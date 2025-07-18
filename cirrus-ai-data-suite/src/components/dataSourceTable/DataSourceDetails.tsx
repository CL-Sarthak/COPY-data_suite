import React from 'react';
import { DataSourceDetailsProps } from '@/types/dataSourceTable';
import { DataSource } from '@/types/discovery';
import { TransformedDataPreview } from './TransformedDataPreview';
import { FileContentViewer } from './FileContentViewer';
import { DataSourceSummary } from './DataSourceSummary';
import { DataSourceTables } from './DataSourceTables';
import { FieldAnnotatedPreview } from '../fieldAnnotation/FieldAnnotatedPreview';
import { DocumentIcon, CircleStackIcon, SparklesIcon, TagIcon } from '@heroicons/react/24/outline';
import { DataSourceTableService } from '@/services/dataSourceTableService';

export function DataSourceDetails({ source, onAskAI }: DataSourceDetailsProps) {
  const [showAnnotatedView, setShowAnnotatedView] = React.useState(false);
  const [generatingKeywords, setGeneratingKeywords] = React.useState(false);
  const [localKeywords, setLocalKeywords] = React.useState<string[]>([]);
  const [keywordsGeneratedAt, setKeywordsGeneratedAt] = React.useState<Date | undefined>(source.keywordsGeneratedAt);
  
  const formatFileContent = (source: DataSource, file: { content?: string; type?: string; name?: string }) => {
    return <FileContentViewer file={file} sourceId={source.id} />;
  };

  // Parse keywords from aiKeywords field
  const keywords = React.useMemo(() => {
    if (localKeywords.length > 0) return localKeywords;
    if (!source.aiKeywords) return [];
    try {
      return JSON.parse(source.aiKeywords);
    } catch {
      return [];
    }
  }, [source.aiKeywords, localKeywords]);

  const handleGenerateKeywords = async () => {
    setGeneratingKeywords(true);
    try {
      const response = await fetch('/api/admin/regenerate-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataSourceId: source.id })
      });
      
      if (response.ok) {
        // Fetch the updated keywords
        const keywordResponse = await fetch(`/api/data-sources/${source.id}/keywords`);
        if (keywordResponse.ok) {
          const data = await keywordResponse.json();
          setLocalKeywords(data.keywords || []);
          setKeywordsGeneratedAt(new Date());
        }
      }
    } catch (error) {
      console.error('Failed to generate keywords:', error);
    } finally {
      setGeneratingKeywords(false);
    }
  };

  return (
    <div className="w-full">
      {/* Data Source Summary Section */}
      <DataSourceSummary source={source} />
      
      {/* Keywords/Subject Section */}
      <div className="mt-6 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">Keywords/Subject</h4>
          <div className="flex items-center gap-2">
            {(keywordsGeneratedAt || source.keywordsGeneratedAt) && (
              <span className="text-xs text-gray-500">
                Generated {DataSourceTableService.formatRelativeTime(keywordsGeneratedAt || source.keywordsGeneratedAt)}
              </span>
            )}
            {keywords.length === 0 && (
              <button
                onClick={handleGenerateKeywords}
                disabled={generatingKeywords}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {generatingKeywords ? 'Generating...' : 'Generate Keywords'}
              </button>
            )}
          </div>
        </div>
        {keywords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {keyword}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No keywords detected. Click &ldquo;Generate Keywords&rdquo; to analyze this data source.
          </p>
        )}
      </div>
      
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4 mt-8">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium text-gray-900">
            {(source.type === 'filesystem' || source.type === 'json_transformed') ? 'Files' : 'Schema'} Details
          </h3>
          {onAskAI && (source.hasTransformedData || (source.type === 'database' && source.configuration?.data)) && (
            <button
              onClick={() => onAskAI(source)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <SparklesIcon className="h-4 w-4" />
              Ask AI about this data
            </button>
          )}
        </div>
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

      {/* For transformed sources, show full-width preview first */}
      {source.hasTransformedData && (
        <div className="w-full mb-6">
          <div className="flex items-center justify-end mb-2">
            <button
              onClick={() => setShowAnnotatedView(!showAnnotatedView)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showAnnotatedView 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <TagIcon className="h-4 w-4" />
              {showAnnotatedView ? 'Hide Field Catalog' : 'Catalog Fields'}
            </button>
          </div>
          {showAnnotatedView ? (
            <FieldAnnotatedPreview 
              sourceId={source.id}
            />
          ) : (
            <TransformedDataPreview 
              sourceId={source.id} 
              key={`${source.id}-${source.transformationAppliedAt || source.lastSync || 'initial'}`}
            />
          )}
        </div>
      )}

      {(source.type === 'filesystem' || source.type === 'json_transformed' || source.type === 'api') && source.configuration.files && source.configuration.files.length > 0 ? (
        <>
          
          {/* Then show files - full width for large files, grid for small ones */}
          <div className="space-y-4">
            {source.configuration.files.slice(0, 8).map((file, idx: number) => {
              const hasLargeContent = file.content && file.content.length > 1000;
              const isTextDocument = DataSourceTableService.isTextDocument(file);
              
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
      ) : (source.type === 'database' || source.type === 'api') && source.configuration.data !== undefined && !source.hasTransformedData ? (
        <>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {source.type === 'api' ? 'API Data Preview' : 'Data Preview'}
          </h3>
          {source.configuration.data.length > 0 ? (
            <div className="space-y-2">
              <div className="relative">
                <div className="absolute inset-0 overflow-auto border border-gray-200 rounded">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {Object.keys(source.configuration.data[0] || {}).map((key) => (
                          <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {source.configuration.data.slice(0, 10).map((row: Record<string, unknown>, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {Object.entries(row).map(([key, value]) => (
                            <td key={key} className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                              {value !== null && value !== undefined ? String(value) : 
                                <span className="text-gray-400 italic">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="h-64"></div>
              </div>
              {source.configuration.data.length > 10 && (
                <p className="text-sm text-gray-500">
                  Showing 10 of {source.configuration.data.length} records
                </p>
              )}
            </div>
          ) : source.type === 'api' ? (
            <div className="text-center py-8 text-gray-500">
              <CircleStackIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">No data received yet</p>
              <p className="text-xs text-gray-400 mt-1">Data will appear here when sent to the API endpoint</p>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CircleStackIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">No data available</p>
            </div>
          )}
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
      ) : !source.hasTransformedData ? (
        <div className="text-center py-8 text-gray-500">
          <CircleStackIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm">No detailed information available</p>
        </div>
      ) : null}
      
      {/* Table-level summaries section */}
      <DataSourceTables source={source} />
    </div>
  );
}