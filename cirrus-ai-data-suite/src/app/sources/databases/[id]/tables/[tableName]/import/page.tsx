'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { 
  ArrowLeft, 
  Table as TableIcon,
  Download,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function TableImportPage() {
  const params = useParams();
  const router = useRouter();
  const connectionId = params?.id as string;
  const tableName = decodeURIComponent(params?.tableName as string);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importSettings, setImportSettings] = useState({
    name: tableName,
    description: `Imported from database table: ${tableName}`,
    includeSchema: true,
    sampleSize: 10000,
    fullImport: false
  });

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);
    setError(null);
    
    try {
      const response = await fetch(`/api/database-connections/${connectionId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName,
          ...importSettings
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }

      // Simulate progress for demo (in real implementation, use SSE or WebSocket)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const result = await response.json();
      clearInterval(progressInterval);
      setProgress(100);
      
      // Navigate to the new data source in discovery
      setTimeout(() => {
        router.push(`/discovery?source=${result.dataSourceId}`);
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      setError(message);
      console.error('Import failed:', error);
      setImporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/sources/databases/${connectionId}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Database
          </button>

          <div className="flex items-start gap-3">
            <TableIcon className="h-8 w-8 text-gray-700" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Import Table: {tableName}</h1>
              <p className="text-gray-600">
                Configure import settings and create a new data source
              </p>
            </div>
          </div>
        </div>

        {/* Import Settings */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Import Settings</h2>
            <p className="text-gray-600 text-sm mt-1">
              Configure how the table data should be imported
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Data Source Name
              </label>
              <input
                id="name"
                type="text"
                value={importSettings.name}
                onChange={(e) => setImportSettings({ ...importSettings, name: e.target.value })}
                placeholder="Enter a name for this data source"
                disabled={importing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                id="description"
                type="text"
                value={importSettings.description}
                onChange={(e) => setImportSettings({ ...importSettings, description: e.target.value })}
                placeholder="Optional description"
                disabled={importing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeSchema"
                checked={importSettings.includeSchema}
                onChange={(e) => 
                  setImportSettings({ ...importSettings, includeSchema: e.target.checked })
                }
                disabled={importing}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="includeSchema" className="text-sm font-medium text-gray-700">
                Include table schema information
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="fullImport"
                  checked={importSettings.fullImport}
                  onChange={(e) => 
                    setImportSettings({ ...importSettings, fullImport: e.target.checked })
                  }
                  disabled={importing}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="fullImport" className="text-sm font-medium text-gray-700">
                  Import all rows (may take longer for large tables)
                </label>
              </div>
              
              {!importSettings.fullImport && (
                <div className="ml-6">
                  <label htmlFor="sampleSize" className="block text-sm font-medium text-gray-700 mb-1">
                    Sample Size (rows)
                  </label>
                  <input
                    id="sampleSize"
                    type="number"
                    value={importSettings.sampleSize}
                    onChange={(e) => setImportSettings({ 
                      ...importSettings, 
                      sampleSize: parseInt(e.target.value) || 10000 
                    })}
                    placeholder="Number of rows to import"
                    disabled={importing}
                    min={1}
                    max={1000000}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Import Progress */}
        {importing && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Progress</h3>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                {progress < 100 ? 'Importing data...' : 'Import complete!'}
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Import Error</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => router.push(`/sources/databases/${connectionId}`)}
            disabled={importing}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !importSettings.name.trim()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Import Table
              </>
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}