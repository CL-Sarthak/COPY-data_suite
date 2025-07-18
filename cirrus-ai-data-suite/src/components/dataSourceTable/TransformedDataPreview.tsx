import React from 'react';
import { useTransformedPreview } from '@/hooks/useTransformedPreview';
import { TransformedDataPreviewProps } from '@/types/dataSourceTable';

export function TransformedDataPreview({ sourceId }: TransformedDataPreviewProps) {
  const { previewData, loading, error, viewMode, setViewMode } = useTransformedPreview(sourceId);

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
  const previewRecords = previewData.records?.slice(0, 2) || [];

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-blue-600 font-medium">
          📊 Transformed JSON data ({(previewData.totalRecords || 0).toLocaleString()} total records)
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {previewData.schema?.fields?.length || 0} normalized fields available
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
              const recordData = record && typeof record === 'object' && 'data' in record ? record.data : record;
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
                    {Object.entries(recordData).map(([key, value]) => {
                      // Convert technical names to display names
                      const displayKey = key.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ');
                      
                      // Format the value based on its type
                      let displayValue: React.ReactNode;
                      if (value === null || value === undefined) {
                        displayValue = <span className="text-gray-400">—</span>;
                      } else if (Array.isArray(value)) {
                        // Handle arrays
                        if (value.length === 0) {
                          displayValue = <span className="text-gray-400">Empty list</span>;
                        } else if (typeof value[0] === 'object') {
                          // Array of objects - show count and preview
                          displayValue = (
                            <div className="space-y-1">
                              <span className="text-xs text-blue-600">{value.length} items</span>
                              <details className="cursor-pointer">
                                <summary className="text-xs text-gray-500 hover:text-gray-700">
                                  Click to expand
                                </summary>
                                <div className="mt-1 text-xs bg-gray-100 p-2 rounded max-h-32 overflow-y-auto">
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(value, null, 2)}
                                  </pre>
                                </div>
                              </details>
                            </div>
                          );
                        } else {
                          // Array of primitives
                          displayValue = value.join(', ');
                        }
                      } else if (typeof value === 'object') {
                        // Handle nested objects
                        const objKeys = Object.keys(value as object);
                        if (objKeys.includes('_ref')) {
                          // Reference object
                          displayValue = (
                            <span className="text-xs text-purple-600">
                              → {(value as { _ref: string })._ref} (ref)
                            </span>
                          );
                        } else {
                          // Regular object - show expandable preview
                          displayValue = (
                            <details className="cursor-pointer">
                              <summary className="text-xs text-gray-500 hover:text-gray-700">
                                {objKeys.length} fields
                              </summary>
                              <div className="mt-1 text-xs bg-gray-100 p-2 rounded max-h-32 overflow-y-auto">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(value, null, 2)}
                                </pre>
                              </div>
                            </details>
                          );
                        }
                      } else if (typeof value === 'boolean') {
                        displayValue = (
                          <span className={value ? 'text-green-600' : 'text-red-600'}>
                            {value ? '✓' : '✗'} {String(value)}
                          </span>
                        );
                      } else {
                        // Primitive values
                        displayValue = String(value);
                      }
                      
                      return (
                        <div key={key} className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-gray-600 truncate">{displayKey}</span>
                          <div className="text-sm text-gray-900 break-words">
                            {displayValue}
                          </div>
                        </div>
                      );
                    })}
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