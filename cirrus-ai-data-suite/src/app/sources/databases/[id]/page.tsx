'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DatabaseConnection, DatabaseSchema } from '@/types/connector';
import AppLayout from '@/components/AppLayout';
import RelationalImportDialog from '@/components/RelationalImportDialog';
import { 
  ArrowLeft, 
  Database, 
  Table,
  Eye,
  Download,
  Search,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Loader2,
  GitBranch,
  Code
} from 'lucide-react';
import { formatBytes } from '@/utils/format';

export default function DatabaseBrowserPage() {
  const params = useParams();
  const router = useRouter();
  const connectionId = params?.id as string;

  const [connection, setConnection] = useState<DatabaseConnection | null>(null);
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showRelationalImport, setShowRelationalImport] = useState(false);
  const [importingRelational, setImportingRelational] = useState(false);

  useEffect(() => {
    loadConnection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId]);

  const loadConnection = async () => {
    try {
      const response = await fetch(`/api/database-connections/${connectionId}`);
      if (!response.ok) throw new Error('Failed to load connection');
      const data = await response.json();
      setConnection(data);
      
      // Automatically load schema if connection is active
      if (data.status === 'active') {
        loadSchema();
      }
    } catch (error) {
      setError('Failed to load database connection');
      console.error('Failed to load connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSchema = async () => {
    setLoadingSchema(true);
    try {
      const response = await fetch(`/api/database-connections/${connectionId}/schema`);
      if (!response.ok) throw new Error('Failed to load schema');
      const data = await response.json();
      setSchema(data);
    } catch (error) {
      setError('Failed to load database schema');
      console.error('Failed to load schema:', error);
    } finally {
      setLoadingSchema(false);
    }
  };

  const filteredTables = schema?.tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.schema?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const handleRelationalImport = async (settings: {
    relationalImport: boolean;
    primaryTable: string;
    name: string;
    description?: string;
    includedTables?: string[];
    excludedTables?: string[];
    maxDepth: number;
    followReverse: boolean;
    sampleSize: number;
    enableClusterDetection?: boolean;
  }) => {
    setImportingRelational(true);
    setShowRelationalImport(false);
    
    try {
      const response = await fetch(`/api/database-connections/${connectionId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }

      const result = await response.json();
      
      // If clusters were detected, show them in the URL parameters
      if (result.detectedClusters && result.detectedClusters.length > 0) {
        const clustersParam = encodeURIComponent(JSON.stringify(result.detectedClusters));
        router.push(`/discovery?source=${result.dataSourceId}&clusters=${clustersParam}`);
      } else {
        // Navigate to the new data source in discovery
        router.push(`/discovery?source=${result.dataSourceId}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      setError(message);
      console.error('Relational import failed:', error);
    } finally {
      setImportingRelational(false);
    }
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

  if (!connection) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">Database connection not found</p>
            <button
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={() => router.push('/sources/databases')}
            >
              Back to Connections
            </button>
          </div>
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
            onClick={() => router.push('/sources/databases')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Connections
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Database className="h-8 w-8 text-gray-700" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{connection.name}</h1>
                <p className="text-gray-600">
                  {connection.type.toUpperCase()} • {connection.host}:{connection.port}/{connection.database}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connection.status === 'active' ? (
                <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                  Connected
                </span>
              ) : (
                <span className="px-3 py-1 text-sm font-medium bg-red-100 text-red-800 rounded-full">
                  Disconnected
                </span>
              )}
              <button
                onClick={loadSchema}
                disabled={loadingSchema}
                className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingSchema ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh Schema
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Error</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Schema Browser */}
        {loadingSchema ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          </div>
        ) : schema ? (
          <div className="grid gap-6">
            {/* Search and Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Database Schema</h2>
                  <p className="text-gray-600 text-sm mt-1">
                    {schema.tables.length} tables found
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push(`/sources/databases/${connectionId}/query-import`)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Code className="mr-2 h-4 w-4" />
                    Query Import
                  </button>
                  <button
                    onClick={() => setShowRelationalImport(true)}
                    disabled={importingRelational}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {importingRelational ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <GitBranch className="mr-2 h-4 w-4" />
                    )}
                    Relational Import
                  </button>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tables..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tables List */}
            <div className="grid gap-3">
              {filteredTables.map((table) => (
                <div 
                  key={`${table.schema}.${table.name}`}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer p-4"
                  onClick={() => router.push(`/sources/databases/${connectionId}/tables/${encodeURIComponent(table.name)}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Table className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {table.schema && table.schema !== 'public' && (
                            <span className="text-gray-600">{table.schema}.</span>
                          )}
                          {table.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {table.columns.length} columns
                          {table.rowCount !== undefined && (
                            <> • {formatNumber(table.rowCount)} rows</>
                          )}
                          {table.sizeInBytes !== undefined && (
                            <> • {formatBytes(table.sizeInBytes)}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/sources/databases/${connectionId}/tables/${encodeURIComponent(table.name)}/preview`);
                        }}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Preview table data"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/sources/databases/${connectionId}/tables/${encodeURIComponent(table.name)}/import`);
                        }}
                        className="text-gray-400 hover:text-green-600 transition-colors"
                        title="Import table as data source"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredTables.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-600">
                  {searchTerm ? 'No tables found matching your search' : 'No tables found in this database'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No schema loaded</p>
            <p className="text-gray-600 mb-4">
              Click &quot;Refresh Schema&quot; to load the database structure
            </p>
            <button
              onClick={loadSchema}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Load Schema
            </button>
          </div>
        )}
      </div>
      
      {/* Relational Import Dialog */}
      {showRelationalImport && (
        <RelationalImportDialog
          connectionId={connectionId}
          onClose={() => setShowRelationalImport(false)}
          onImport={handleRelationalImport}
        />
      )}
    </AppLayout>
  );
}