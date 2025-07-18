'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Table as TableIcon, 
  GitBranch,
  Loader2,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface TableRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  relationshipType: string;
}

interface RelationalImportDialogProps {
  connectionId: string;
  initialTable?: string;
  onClose: () => void;
  onImport: (settings: RelationalImportSettings) => void;
}

interface RelationalImportSettings {
  relationalImport: true;
  primaryTable: string;
  name: string;
  description?: string;
  includedTables?: string[];
  excludedTables?: string[];
  maxDepth: number;
  followReverse: boolean;
  sampleSize: number;
  enableClusterDetection?: boolean;
}

export default function RelationalImportDialog({ 
  connectionId, 
  initialTable,
  onClose, 
  onImport 
}: RelationalImportDialogProps) {
  const [primaryTable, setPrimaryTable] = useState(initialTable || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingTables, setLoadingTables] = useState(true);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [relationships, setRelationships] = useState<TableRelationship[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [relationshipDiagram, setRelationshipDiagram] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [settings, setSettings] = useState({
    name: '',
    description: '',
    maxDepth: 2,  // Reduced from 3 to prevent exponential growth
    followReverse: true,  // Default to true to include one-to-many relationships
    sampleSize: 100,
    includedTables: [] as string[],
    excludedTables: [] as string[],
    enableClusterDetection: false  // New option for cluster detection
  });

  // Load available tables on mount
  useEffect(() => {
    loadAvailableTables();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAvailableTables = async () => {
    try {
      const response = await fetch(`/api/database-connections/${connectionId}/schema`);
      if (!response.ok) throw new Error('Failed to load schema');
      
      const schema = await response.json();
      const tableNames = schema.tables.map((t: { name: string }) => t.name).sort();
      setAvailableTables(tableNames);
      
      // If initial table provided, validate it exists
      if (initialTable && tableNames.includes(initialTable)) {
        setPrimaryTable(initialTable);
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
      setError('Failed to load available tables');
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    if (primaryTable) {
      analyzeRelationships();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryTable]);

  const analyzeRelationships = async () => {
    setAnalyzing(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/database-connections/${connectionId}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryTable,
          maxDepth: settings.maxDepth
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to analyze relationships');
      }

      const data = await response.json();
      setRelationships(data.relationships);
      setTables(data.tables.map((t: { name: string }) => t.name));
      setRelationshipDiagram(data.relationshipDiagram);
      
      // Auto-generate name if not set
      if (!settings.name) {
        setSettings({
          ...settings,
          name: `${primaryTable} with relationships`,
          description: `Relational import from ${primaryTable} including ${data.tables.length} related tables`
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to analyze relationships';
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImport = () => {
    onImport({
      relationalImport: true,
      primaryTable,
      name: settings.name,
      description: settings.description,
      includedTables: settings.includedTables.length > 0 ? settings.includedTables : undefined,
      excludedTables: settings.excludedTables.length > 0 ? settings.excludedTables : undefined,
      maxDepth: settings.maxDepth,
      followReverse: settings.followReverse,
      sampleSize: settings.sampleSize,
      enableClusterDetection: settings.enableClusterDetection
    });
  };

  const toggleTableInclusion = (tableName: string) => {
    if (settings.includedTables.includes(tableName)) {
      setSettings({
        ...settings,
        includedTables: settings.includedTables.filter(t => t !== tableName)
      });
    } else {
      setSettings({
        ...settings,
        includedTables: [...settings.includedTables, tableName]
      });
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border-2 border-gray-600 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Relational Import</h2>
            <p className="text-gray-600 mt-1">
              Import data with foreign key relationships as nested JSON
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Primary Table Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Table
            </label>
            {loadingTables ? (
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading tables...</span>
              </div>
            ) : (
              <select
                value={primaryTable}
                onChange={(e) => setPrimaryTable(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loadingTables || availableTables.length === 0}
              >
                <option value="">Select a table...</option>
                {availableTables.map(table => (
                  <option key={table} value={table}>{table}</option>
                ))}
              </select>
            )}
            <p className="text-sm text-gray-500 mt-1">
              This is the root table from which relationships will be followed
            </p>
          </div>

          {/* Relationship Analysis */}
          {analyzing && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <p className="text-blue-800">Analyzing database relationships...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Analysis Error</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {relationships.length > 0 && (
            <>
              {/* Relationship Diagram */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Discovered Relationships
                </h3>
                <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">
                  {relationshipDiagram}
                </pre>
              </div>

              {/* Import Settings */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Source Name
                  </label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    placeholder="Enter a name for this data source"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={settings.description}
                    onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                    placeholder="Optional description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sample Size (records from primary table)
                  </label>
                  <input
                    type="number"
                    value={settings.sampleSize}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      sampleSize: parseInt(e.target.value) || 100 
                    })}
                    min={1}
                    max={10000}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="border-t pt-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Advanced Settings
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4 pl-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Maximum Relationship Depth
                      </label>
                      <input
                        type="number"
                        value={settings.maxDepth}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          maxDepth: parseInt(e.target.value) || 3 
                        })}
                        min={1}
                        max={5}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        How many levels deep to follow relationships
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="followReverse"
                        checked={settings.followReverse}
                        onChange={(e) => 
                          setSettings({ ...settings, followReverse: e.target.checked })
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="followReverse" className="text-sm font-medium text-gray-700">
                        Include reverse relationships (one-to-many)
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enableClusterDetection"
                        checked={settings.enableClusterDetection}
                        onChange={(e) => 
                          setSettings({ ...settings, enableClusterDetection: e.target.checked })
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="enableClusterDetection" className="text-sm font-medium text-gray-700">
                        Enable cluster pattern detection
                      </label>
                    </div>
                    {settings.enableClusterDetection && (
                      <p className="text-sm text-gray-500 ml-6">
                        Automatically detect patterns of related sensitive data fields across imported tables
                      </p>
                    )}

                    {/* Table Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Tables to Include
                      </label>
                      <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                        {tables.map(table => (
                          <label key={table} className="flex items-center gap-2 py-1 hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={settings.includedTables.length === 0 || settings.includedTables.includes(table)}
                              onChange={() => toggleTableInclusion(table)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <TableIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{table}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        By default, all related tables are included
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 rounded-lg p-4 mt-6">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">How Relational Import Works</p>
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                      <li>Data from the primary table is fetched first</li>
                      <li>Foreign key relationships are followed to fetch related data</li>
                      <li>Results are combined into nested JSON documents</li>
                      <li>Related tables appear as nested objects or arrays</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!primaryTable || !settings.name || analyzing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import with Relationships
          </button>
        </div>
      </div>
    </div>
  );
}