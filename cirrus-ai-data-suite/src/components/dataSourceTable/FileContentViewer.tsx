import React from 'react';
import { useFileContent } from '@/hooks/useFileContent';
import { FileContentViewerProps } from '@/types/dataSourceTable';
import { DataSourceTableService } from '@/services/dataSourceTableService';

export function FileContentViewer({ file, sourceId }: FileContentViewerProps) {
  const { content, loading, error, viewMode, setViewMode, reload } = useFileContent(sourceId, file);
  
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
          onClick={reload}
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

  const isTextDocument = DataSourceTableService.isTextDocument(file);
  
  let preview = content;
  
  // Try to format JSON nicely
  if (file.type === 'application/json') {
    preview = DataSourceTableService.formatJsonContent(content);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {viewMode === 'preview' ? `Content preview (first 500 characters):` : `Full document content:`}
        </div>
        {isTextDocument && content.length > 500 && (
          <button
            onClick={() => setViewMode(viewMode === 'preview' ? 'full' : 'preview')}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            {viewMode === 'preview' ? 'Show full content' : 'Show preview'}
          </button>
        )}
      </div>
      
      {/* Content Display */}
      <div className="border border-gray-200 rounded p-3 bg-gray-50">
        <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-700 max-h-64 overflow-y-auto">
          {viewMode === 'preview' && content.length > 500 
            ? preview.substring(0, 500) + '...' 
            : preview}
        </pre>
      </div>
      
      {viewMode === 'preview' && content.length > 500 && (
        <div className="text-xs text-gray-500">
          Document contains {content.length.toLocaleString()} characters total
        </div>
      )}
    </div>
  );
}