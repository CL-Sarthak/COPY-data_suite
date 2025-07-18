'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QueryResult } from '@/types/connector';
import AppLayout from '@/components/AppLayout';
import { 
  ArrowLeft, 
  Table as TableIcon,
  Download,
  Loader2,
  AlertCircle
} from 'lucide-react';

export default function TablePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const connectionId = params?.id as string;
  const tableName = decodeURIComponent(params?.tableName as string);

  const [data, setData] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTableData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, tableName]);

  const loadTableData = async () => {
    try {
      const response = await fetch(
        `/api/database-connections/${connectionId}/tables/${encodeURIComponent(tableName)}/preview`
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to load table data');
      }
      
      const result = await response.json();
      setData(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load table data';
      setError(message);
      console.error('Failed to load table data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCellValue = (value: unknown): string => {
    if (value === null) return 'NULL';
    if (value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/sources/databases/${connectionId}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Database
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <TableIcon className="h-8 w-8 text-gray-700" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{tableName}</h1>
                <p className="text-gray-600">
                  Table Preview
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/sources/databases/${connectionId}/tables/${encodeURIComponent(tableName)}/import`)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="mr-2 h-4 w-4" />
              Import Data
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Error Loading Data</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Data Preview */}
        {data && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Data Preview</h2>
              <p className="text-gray-600 text-sm mt-1">
                Showing {data.rowCount} rows • {data.columns.length} columns
                {data.executionTime && (
                  <> • Query took {data.executionTime}ms</>
                )}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {data.columns.map((column, index) => (
                      <th
                        key={index}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {formatCellValue(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {data.rowCount > 100 && (
              <div className="p-4 text-center border-t">
                <p className="text-sm text-gray-600">
                  Showing first 100 rows. Import the table to access all data.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}