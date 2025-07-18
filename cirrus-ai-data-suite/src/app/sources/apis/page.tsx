'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { DialogProvider, useDialog } from '@/contexts/DialogContext';
import { HelpButton } from '@/components/HelpSystem';
import { getHelpContent } from '@/content/helpContent';
import { 
  PlusIcon,
  TrashIcon,
  RefreshCw,
  AlertCircle,
  Globe,
  Loader2,
  CheckCircle,
  XCircle,
  Download,
  Eye,
  Edit2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import ApiConnectionEditDialog from '@/components/ApiConnectionEditDialog';
interface ApiConnection {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  authType: string;
  authConfig?: Record<string, unknown>;
  headers?: Record<string, string>;
  refreshEnabled: boolean;
  refreshInterval?: number;
  status: 'active' | 'inactive' | 'error';
  errorMessage?: string;
  lastRefreshAt?: Date;
  nextRefreshAt?: Date;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiHeader {
  key: string;
  value: string;
}

// Helper function to safely format relative time
function formatSafeRelativeTime(date: Date | string | undefined): string {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    
    const now = Date.now();
    const then = dateObj.getTime();
    const diffMs = now - then;
    
    // Handle future dates
    if (diffMs < 0) {
      return 'just now';
    }
    
    const minutes = Math.floor(diffMs / 1000 / 60);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    // For older dates, show the actual date
    return dateObj.toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

function ApiIntegrationsContent() {
  const dialog = useDialog();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [apiConnections, setApiConnections] = useState<ApiConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiName, setApiName] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [httpMethod, setHttpMethod] = useState('GET');
  const [headers, setHeaders] = useState<ApiHeader[]>([{ key: '', value: '' }]);
  const [authType, setAuthType] = useState<'none' | 'api-key' | 'bearer' | 'basic'>('none');
  const [apiKey, setApiKey] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [dataPath, setDataPath] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<ApiConnection | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ApiConnection | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [importName, setImportName] = useState('');
  const [importDescription, setImportDescription] = useState('');
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const loadApiConnections = useCallback(async () => {
    try {
      const response = await fetch('/api/api-connections');
      if (response.ok) {
        const connections = await response.json();
        setApiConnections(connections);
      }
    } catch (error) {
      console.error('Error loading API connections:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApiConnections();
  }, [loadApiConnections]);

  const deleteApiConnection = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/api-connections/${connectionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadApiConnections();
        dialog.showAlert({
          title: 'Success',
          message: 'API connection deleted successfully.',
          type: 'success'
        });
      } else {
        throw new Error('Failed to delete API connection');
      }
    } catch (error) {
      console.error('Error deleting API connection:', error);
      dialog.showAlert({
        title: 'Error',
        message: 'Failed to delete API connection.',
        type: 'error'
      });
    }
  };

  const handleEditConnection = async (connection: ApiConnection) => {
    try {
      const response = await fetch(`/api/api-connections/${connection.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(connection)
      });

      if (response.ok) {
        await loadApiConnections();
        setShowEditDialog(false);
        setEditingConnection(null);
        dialog.showAlert({
          title: 'Success',
          message: 'API connection updated successfully.',
          type: 'success'
        });
      } else {
        throw new Error('Failed to update API connection');
      }
    } catch (error) {
      console.error('Error updating API connection:', error);
      dialog.showAlert({
        title: 'Error',
        message: 'Failed to update API connection.',
        type: 'error'
      });
    }
  };

  const resetForm = () => {
    setApiName('');
    setApiEndpoint('');
    setHttpMethod('GET');
    setHeaders([{ key: '', value: '' }]);
    setAuthType('none');
    setApiKey('');
    setBearerToken('');
    setBasicUsername('');
    setBasicPassword('');
    setRefreshInterval(0);
    setDataPath('');
    setTestResult(null);
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const testConnection = async (connectionId?: string) => {
    setTesting(true);
    setTestResult(null);

    try {
      let testData;
      
      if (connectionId) {
        // Testing existing connection - fetch its data
        const existingConnection = apiConnections.find(c => c.id === connectionId);
        if (!existingConnection) {
          throw new Error('Connection not found');
        }
        
        const response = await fetch(`/api/api-connections/${connectionId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch connection details');
        }
        
        const connectionDetails = await response.json();
        
        testData = {
          id: connectionId,
          endpoint: connectionDetails.endpoint,
          method: connectionDetails.method,
          authType: connectionDetails.authType,
          authConfig: connectionDetails.authConfig,
          headers: connectionDetails.headers,
          timeout: connectionDetails.timeout || 30000,
          retryCount: connectionDetails.retryCount || 3
        };
      } else {
        // Testing new connection from form
        const requestHeaders: Record<string, string> = {};
        headers.forEach(header => {
          if (header.key && header.value) {
            requestHeaders[header.key] = header.value;
          }
        });

        let authConfig = undefined;
        if (authType === 'api-key' && apiKey) {
          authConfig = { apiKey };
        } else if (authType === 'bearer' && bearerToken) {
          authConfig = { token: bearerToken };
        } else if (authType === 'basic' && basicUsername && basicPassword) {
          authConfig = { username: basicUsername, password: basicPassword };
        }

        testData = {
          endpoint: apiEndpoint,
          method: httpMethod,
          authType,
          authConfig,
          headers: requestHeaders,
          timeout: 30000,
          retryCount: 3
        };
      }

      const response = await fetch('/api/api-connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      const result = await response.json();
      setTestResult(result);
      
      if (connectionId && result.success) {
        await loadApiConnections();
      }
    } catch {
      setTestResult({ 
        success: false, 
        message: 'Connection test failed. Please check your settings.' 
      });
    } finally {
      setTesting(false);
    }
  };

  const saveApiConnection = async () => {
    if (!apiName || !apiEndpoint) {
      return;
    }

    setSaving(true);

    try {
      // Build headers object
      const requestHeaders: Record<string, string> = {};
      headers.forEach(header => {
        if (header.key && header.value) {
          requestHeaders[header.key] = header.value;
        }
      });

      // Build auth config
      let authConfig = undefined;
      if (authType === 'api-key' && apiKey) {
        authConfig = { apiKey };
      } else if (authType === 'bearer' && bearerToken) {
        authConfig = { token: bearerToken };
      } else if (authType === 'basic' && basicUsername && basicPassword) {
        authConfig = { username: basicUsername, password: basicPassword };
      }

      const response = await fetch('/api/api-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: apiName,
          endpoint: apiEndpoint,
          method: httpMethod,
          authType,
          authConfig,
          headers: requestHeaders,
          refreshEnabled: refreshInterval > 0,
          refreshInterval: refreshInterval > 0 ? refreshInterval : undefined,
          timeout: 30000,
          retryCount: 3,
          responseMapping: dataPath ? { dataPath } : undefined
        })
      });

      if (response.ok) {
        dialog.showAlert({
          title: 'Success',
          message: 'API connection saved successfully!',
          type: 'success'
        });
        
        setShowForm(false);
        resetForm();
        await loadApiConnections();
      }
    } catch (error) {
      console.error('Error saving API connection:', error);
      dialog.showAlert({
        title: 'Error',
        message: 'Failed to save API connection.',
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const loadPreviewData = async (connectionId: string) => {
    setLoadingPreview(true);
    setPreviewData(null);
    
    try {
      const response = await fetch(`/api/api-connections/${connectionId}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Preview',
          description: 'Preview only',
          maxRecords: 5  // Only fetch 5 records for preview
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        // Fetch the actual data from the created data source
        const dataResponse = await fetch(`/api/data-sources/${result.dataSourceId}`);
        if (dataResponse.ok) {
          const dataSource = await dataResponse.json();
          setPreviewData(dataSource.configuration.data || []);
        }
        // Delete the temporary data source
        await fetch(`/api/data-sources/${result.dataSourceId}`, {
          method: 'DELETE'
        });
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      dialog.showAlert({
        title: 'Error',
        message: 'Failed to load preview data.',
        type: 'error'
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const importData = async () => {
    if (!selectedConnection || !importName) {
      return;
    }

    setImporting(true);

    try {
      const response = await fetch(`/api/api-connections/${selectedConnection.id}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: importName,
          description: importDescription
        })
      });

      if (response.ok) {
        const result = await response.json();
        dialog.showAlert({
          title: 'Success',
          message: `Successfully imported ${result.recordCount} records!`,
          type: 'success'
        });
        
        setShowImportDialog(false);
        setImportName('');
        setImportDescription('');
        setSelectedConnection(null);
        
        // Navigate to discovery page with the new data source
        router.push(`/discovery?source=${result.dataSourceId}`);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }
    } catch (error) {
      console.error('Error importing data:', error);
      dialog.showAlert({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to import data.',
        type: 'error'
      });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    );
  }

  if (showPreviewDialog && selectedConnection) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => {
                  setShowPreviewDialog(false);
                  setPreviewData(null);
                  setSelectedConnection(null);
                }}
                className="text-gray-900 hover:text-gray-900 flex items-center gap-2"
              >
                ← Back to API Connections
              </button>
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Preview Data</h1>
              <p className="text-gray-900 mt-1">
                Preview data from {selectedConnection.name}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {loadingPreview ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading preview...</span>
                </div>
              ) : previewData && previewData.length > 0 ? (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Showing first {previewData.length} records
                    </p>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="max-h-96 overflow-auto">
                      <pre className="p-4 text-xs text-gray-900 bg-gray-50 font-mono">
                        {JSON.stringify(previewData, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => {
                        setShowPreviewDialog(false);
                        setShowImportDialog(true);
                        setImportName(`${selectedConnection.name} Import`);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Import Full Data
                    </button>
                    <button
                      onClick={() => {
                        setShowPreviewDialog(false);
                        setPreviewData(null);
                        setSelectedConnection(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No data available for preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (showImportDialog && selectedConnection) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportName('');
                  setImportDescription('');
                  setSelectedConnection(null);
                }}
                className="text-gray-900 hover:text-gray-900 flex items-center gap-2"
              >
                ← Back to API Connections
              </button>
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Import Data</h1>
              <p className="text-gray-900 mt-1">
                Import data from {selectedConnection.name}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <label htmlFor="importName" className="block text-sm font-medium text-gray-700 mb-2">
                  Import Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="importName"
                  type="text"
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  placeholder="My Data Import"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="importDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  id="importDescription"
                  value={importDescription}
                  onChange={(e) => setImportDescription(e.target.value)}
                  placeholder="Describe this data import..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Connection Details</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-900">
                    Endpoint: <span className="font-mono text-xs">{selectedConnection.endpoint}</span>
                  </p>
                  <p className="text-gray-900">
                    Method: <span className="font-medium">{selectedConnection.method}</span>
                  </p>
                  <p className="text-gray-900">
                    Status: <span className="font-medium text-green-600">Active</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowImportDialog(false);
                    setImportName('');
                    setImportDescription('');
                    setSelectedConnection(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={importData}
                  disabled={!importName || importing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Import Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (showForm) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-900 hover:text-gray-900 flex items-center gap-2"
              >
                ← Back to API Connections
              </button>
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Create API Connection</h1>
                  <p className="text-gray-900 mt-1">
                    Connect to a REST API to import data automatically
                  </p>
                </div>
                <HelpButton 
                  content={getHelpContent('apiSources')} 
                  className="ml-2"
                />
              </div>
            </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* API Name */}
            <div className="mb-6">
              <label htmlFor="apiName" className="block text-sm font-medium text-gray-700 mb-2">
                API Name <span className="text-red-500">*</span>
              </label>
              <input
                id="apiName"
                type="text"
                value={apiName}
                onChange={(e) => setApiName(e.target.value)}
                placeholder="My API Connection"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* API Endpoint */}
            <div className="mb-6">
              <label htmlFor="apiEndpoint" className="block text-sm font-medium text-gray-700 mb-2">
                API Endpoint <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={httpMethod}
                  onChange={(e) => setHttpMethod(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </select>
                <input
                  id="apiEndpoint"
                  type="url"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder="https://api.example.com/data"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Authentication */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Authentication
              </label>
              <select
                value={authType}
                onChange={(e) => setAuthType(e.target.value as 'none' | 'api-key' | 'bearer' | 'basic')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
              >
                <option value="none">No Authentication</option>
                <option value="api-key">API Key</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
              </select>

              {authType === 'api-key' && (
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API Key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}

              {authType === 'bearer' && (
                <input
                  type="password"
                  value={bearerToken}
                  onChange={(e) => setBearerToken(e.target.value)}
                  placeholder="Enter Bearer Token"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}

              {authType === 'basic' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={basicUsername}
                    onChange={(e) => setBasicUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="password"
                    value={basicPassword}
                    onChange={(e) => setBasicPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Headers */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Headers
                </label>
                <button
                  onClick={addHeader}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Header
                </button>
              </div>
              <div className="space-y-2">
                {headers.map((header, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={header.key}
                      onChange={(e) => updateHeader(index, 'key', e.target.value)}
                      placeholder="Header Name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={header.value}
                      onChange={(e) => updateHeader(index, 'value', e.target.value)}
                      placeholder="Header Value"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => removeHeader(index)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Refresh Interval */}
            <div className="mb-6">
              <label htmlFor="refreshInterval" className="block text-sm font-medium text-gray-700 mb-2">
                Auto Refresh (optional)
              </label>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-gray-400" />
                <input
                  id="refreshInterval"
                  type="number"
                  min="0"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 0)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-gray-900">minutes (0 = disabled)</span>
              </div>
            </div>

            {/* Response Mapping */}
            <div className="mb-6">
              <label htmlFor="dataPath" className="block text-sm font-medium text-gray-700 mb-2">
                Data Path (optional)
              </label>
              <input
                id="dataPath"
                type="text"
                value={dataPath}
                onChange={(e) => setDataPath(e.target.value)}
                placeholder="e.g., data.items or Results"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-sm text-gray-600 mt-1">
                JSON path to the data array in the API response. Use dot notation for nested objects (e.g., &quot;data.items&quot;). Leave empty if data is at the root level.
              </p>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`mb-6 p-4 rounded-lg ${
                testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <p className={`text-sm ${
                    testResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {testResult.message}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => testConnection()}
                disabled={!apiEndpoint || testing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={saveApiConnection}
                disabled={!apiName || !apiEndpoint || saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save API Connection'}
              </button>
            </div>
          </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">API Integrations</h1>
                <p className="text-gray-900 mt-1">
                  Connect to REST APIs for automated data import
                </p>
              </div>
              <HelpButton 
                content={getHelpContent('apiSources')} 
                className="ml-2"
              />
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              New API Connection
            </button>
          </div>

          {apiConnections.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">No API connections yet</p>
              <p className="text-gray-900 mb-6">
                Connect your first API to start importing data automatically
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Create Connection
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {apiConnections.map((connection) => (
                <div key={connection.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Globe className="h-5 w-5 text-gray-500 mt-1" />
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{connection.name}</h3>
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="text-gray-900">
                            Endpoint: <span className="text-gray-900 font-mono text-xs">{connection.endpoint}</span>
                          </p>
                          <p className="text-gray-900">
                            Method: <span className="text-gray-900 font-medium">{connection.method}</span>
                          </p>
                          {connection.refreshEnabled && connection.refreshInterval && (
                            <p className="text-gray-900 flex items-center gap-1">
                              <RefreshCw className="h-3 w-3" />
                              Auto-refresh: <span className="text-gray-900">Every {connection.refreshInterval} minutes</span>
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {connection.status === 'active' ? (
                              <span className="text-green-600 text-xs flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Connected
                              </span>
                            ) : connection.status === 'error' ? (
                              <span className="text-red-600 text-xs flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                {connection.errorMessage || 'Connection Error'}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Not Tested
                              </span>
                            )}
                            {connection.lastTestedAt && (
                              <span className="text-gray-500 text-xs">
                                Last tested: {formatSafeRelativeTime(connection.lastTestedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => testConnection(connection.id)}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Test Connection
                      </button>
                      {connection.status === 'active' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedConnection(connection);
                              setShowPreviewDialog(true);
                              loadPreviewData(connection.id);
                            }}
                            className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                          </button>
                          <button
                            onClick={() => {
                              setSelectedConnection(connection);
                              setShowImportDialog(true);
                              setImportName(`${connection.name} Import`);
                            }}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                          >
                            <Download className="h-4 w-4" />
                            Import Data
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setEditingConnection(connection);
                          setShowEditDialog(true);
                        }}
                        className="p-1.5 text-gray-900 hover:text-blue-600 transition-colors"
                        title="Edit Connection"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteApiConnection(connection.id)}
                        className="p-1.5 text-gray-900 hover:text-red-600 transition-colors"
                        title="Delete Connection"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Dialog */}
      {editingConnection && (
        <ApiConnectionEditDialog
          connection={{...editingConnection} as Parameters<typeof ApiConnectionEditDialog>[0]['connection']}
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setEditingConnection(null);
          }}
          onSave={(conn) => handleEditConnection(conn as unknown as ApiConnection)}
        />
      )}
    </AppLayout>
  );
}

export default function ApiIntegrationsPage() {
  return (
    <DialogProvider>
      <ApiIntegrationsContent />
    </DialogProvider>
  );
}