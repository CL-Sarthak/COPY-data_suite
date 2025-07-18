import React, { useState, useEffect } from 'react';
import { DataSource } from '@/types/discovery';
import { 
  TableCellsIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  SparklesIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface DataSourceTablesProps {
  source: DataSource;
  onUpdate?: () => void;
}

interface DataTable {
  id: string;
  tableName: string;
  tableType?: string;
  tableIndex: number;
  recordCount?: number;
  schemaInfo?: string;
  aiSummary?: string;
  userSummary?: string;
  summaryGeneratedAt?: string;
  summaryUpdatedAt?: string;
  summaryVersion?: number;
}

interface TableSummaryProps {
  table: DataTable;
  dataSourceId: string;
  onUpdate: () => void;
}

function TableSummary({ table, dataSourceId, onUpdate }: TableSummaryProps) {
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState({
    aiSummary: table.aiSummary,
    userSummary: table.userSummary,
    summaryGeneratedAt: table.summaryGeneratedAt,
    summaryUpdatedAt: table.summaryUpdatedAt,
    summaryVersion: table.summaryVersion
  });

  const generateSummary = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      // Use the current origin to ensure we're hitting the right server
      const apiUrl = `${window.location.origin}/api/data-sources/${dataSourceId}/tables/${table.id}/summary`;
      console.log('Generating summary with URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' })
      });

      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid response type:', contentType);
        console.error('Response text:', responseText);
        throw new Error('Server returned invalid response format');
      }
      
      if (!response.ok) {
        let error;
        try {
          error = JSON.parse(responseText);
        } catch {
          error = { message: responseText };
        }
        throw new Error(error.message || 'Failed to generate summary');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        console.error('Failed to parse response:', responseText);
        throw new Error('Failed to parse server response');
      }
      setSummaryData(prev => ({
        ...prev,
        aiSummary: data.aiSummary,
        summaryGeneratedAt: data.summaryGeneratedAt,
        summaryVersion: data.summaryVersion
      }));
      
      onUpdate();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  const startEditing = () => {
    setEditing(true);
    setEditedSummary(summaryData.userSummary || summaryData.aiSummary || '');
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditedSummary('');
    setError(null);
  };

  const saveSummary = async () => {
    try {
      setError(null);
      
      const apiUrl = `${window.location.origin}/api/data-sources/${dataSourceId}/tables/${table.id}/summary`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update',
          userSummary: editedSummary 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save summary');
      }

      const data = await response.json();
      setSummaryData(prev => ({
        ...prev,
        userSummary: data.userSummary,
        summaryUpdatedAt: data.summaryUpdatedAt,
        summaryVersion: data.summaryVersion
      }));
      
      setEditing(false);
      onUpdate();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save summary');
    }
  };

  const displaySummary = summaryData.userSummary || summaryData.aiSummary;

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <InformationCircleIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
          <h4 className="text-sm font-medium text-gray-900">Table Summary</h4>
          {summaryData.userSummary && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              User Edited
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              {!summaryData.aiSummary && (
                <button
                  onClick={generateSummary}
                  disabled={generating}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <SparklesIcon className="h-3 w-3 animate-pulse" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-3 w-3" />
                      Generate
                    </>
                  )}
                </button>
              )}
              
              {displaySummary && (
                <>
                  {summaryData.aiSummary && (
                    <button
                      onClick={generateSummary}
                      disabled={generating}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-900 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Regenerate AI summary"
                    >
                      <ArrowPathIcon className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    <PencilIcon className="h-3 w-3" />
                    Edit
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={editedSummary}
            onChange={(e) => setEditedSummary(e.target.value)}
            placeholder="Enter a description of this table..."
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
            rows={3}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={saveSummary}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              <CheckIcon className="h-3 w-3" />
              Save
            </button>
            <button
              onClick={cancelEditing}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
            >
              <XMarkIcon className="h-3 w-3" />
              Cancel
            </button>
          </div>
        </div>
      ) : displaySummary ? (
        <p className="text-sm text-gray-700 break-words whitespace-pre-wrap">{displaySummary}</p>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-2">No summary available</p>
          <button
            onClick={generateSummary}
            disabled={generating}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <SparklesIcon className="h-3 w-3 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="h-3 w-3" />
                Generate Summary
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export function DataSourceTables({ source, onUpdate }: DataSourceTablesProps) {
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<DataTable[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTables();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.id]);

  const loadTables = async () => {
    try {
      setLoading(true);
      const apiUrl = `${window.location.origin}/api/data-sources/${source.id}/tables`;
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        setTables(data.tables);
        
        // If tables were just detected, notify parent
        if (data.detected && onUpdate) {
          onUpdate();
        }
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
      setError('Failed to load table information');
    } finally {
      setLoading(false);
    }
  };

  const toggleTable = (tableId: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  };

  // Hide the section if there's only one table/sheet
  if (!tables || tables.length <= 1) {
    return null;
  }
  
  const handleRedetect = async () => {
    try {
      const apiUrl = `${window.location.origin}/api/data-sources/${source.id}/tables/redetect`;
      const response = await fetch(apiUrl, {
        method: 'POST'
      });
      if (response.ok) {
        loadTables();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Failed to re-detect tables:', error);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TableCellsIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">
            Tables/Sheets ({tables.length})
          </h3>
        </div>
        <button
          onClick={handleRedetect}
          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Re-detect Tables
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {tables.map((table) => (
            <div
              key={table.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleTable(table.id)}
                className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedTables.has(table.id) ? (
                    <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="font-medium text-gray-900">{table.tableName}</span>
                  {table.tableType && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {table.tableType}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {table.recordCount?.toLocaleString()} records
                </div>
              </button>
              
              {expandedTables.has(table.id) && (
                <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                  <TableSummary
                    table={table}
                    dataSourceId={source.id}
                    onUpdate={loadTables}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}