'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { DialogProvider, useDialog } from '@/contexts/DialogContext';
import { HelpButton } from '@/components/HelpSystem';
import { getHelpContent } from '@/content/helpContent';
import { 
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

interface InboundApiConnection {
  id: string;
  name: string;
  description?: string;
  apiKey: string;
  status: string;
  dataMode?: string;
  customUrl?: string;
  apiKeyHeader?: string;
  requireApiKey?: boolean;
  dataSourceId?: string;
  requestCount: number;
  lastRequestAt?: string;
  createdAt: string;
  updatedAt: string;
}

function InboundApiContent() {
  const dialog = useDialog();
  const [connections, setConnections] = useState<InboundApiConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingConnection, setEditingConnection] = useState<InboundApiConnection | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dataMode: 'append',
    customUrl: '',
    apiKeyHeader: 'X-API-Key',
    requireApiKey: true
  });

  const loadConnections = async () => {
    try {
      const response = await fetch('/api/inbound-connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      }
    } catch (error) {
      console.error('Error loading inbound connections:', error);
    } finally {
      setLoading(false);
    }
  };

  // SSE connection for real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    
    const setupSSE = () => {
      eventSource = new EventSource('/api/inbound-connections/updates');
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.connections) {
            setConnections(data.connections);
            setLoading(false);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource?.close();
        // Fallback to regular polling
        setTimeout(() => {
          loadConnections();
        }, 1000);
      };
    };
    
    // Initial load and setup SSE
    loadConnections().then(() => {
      setupSSE();
    });
    
    return () => {
      eventSource?.close();
    };
  }, []);

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/inbound-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowCreateDialog(false);
        setFormData({ name: '', description: '', dataMode: 'append', customUrl: '', apiKeyHeader: 'X-API-Key', requireApiKey: true });
        await loadConnections();
        dialog.showAlert({
          title: 'Success',
          message: 'Inbound API endpoint created successfully.',
          type: 'success'
        });
      } else {
        const error = await response.json();
        dialog.showAlert({
          title: 'Error',
          message: error.error || 'Failed to create inbound API endpoint.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error creating inbound connection:', error);
      dialog.showAlert({
        title: 'Error',
        message: 'Failed to create inbound API endpoint.',
        type: 'error'
      });
    }
  };

  const handleEdit = (connection: InboundApiConnection) => {
    setEditingConnection(connection);
    setFormData({
      name: connection.name,
      description: connection.description || '',
      dataMode: connection.dataMode || 'append',
      customUrl: connection.customUrl || '',
      apiKeyHeader: connection.apiKeyHeader || 'X-API-Key',
      requireApiKey: connection.requireApiKey !== false
    });
    setShowEditDialog(true);
  };

  const handleUpdateConnection = async () => {
    if (!editingConnection) return;

    try {
      const response = await fetch(`/api/inbound-connections/${editingConnection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowEditDialog(false);
        setEditingConnection(null);
        setFormData({ name: '', description: '', dataMode: 'append', customUrl: '', apiKeyHeader: 'X-API-Key', requireApiKey: true });
        await loadConnections();
        dialog.showAlert({
          title: 'Success',
          message: 'Inbound API endpoint updated successfully.',
          type: 'success'
        });
      } else {
        const error = await response.json();
        dialog.showAlert({
          title: 'Error',
          message: error.error || 'Failed to update inbound API endpoint.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error updating inbound connection:', error);
      dialog.showAlert({
        title: 'Error',
        message: 'Failed to update inbound API endpoint.',
        type: 'error'
      });
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await dialog.showConfirm({
      title: 'Delete Inbound API',
      message: 'Are you sure you want to delete this inbound API endpoint? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      try {
        const response = await fetch(`/api/inbound-connections/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await loadConnections();
          dialog.showAlert({
            title: 'Success',
            message: 'Inbound API endpoint deleted successfully.',
            type: 'success'
          });
        }
      } catch (error) {
        console.error('Error deleting inbound connection:', error);
        dialog.showAlert({
          title: 'Error',
          message: 'Failed to delete inbound API endpoint.',
          type: 'error'
        });
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      dialog.showAlert({
        title: 'Copied',
        message: 'API endpoint copied to clipboard.',
        type: 'success'
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const getEndpointUrl = (connection: InboundApiConnection) => {
    let baseUrl = '';
    if (typeof window !== 'undefined' && window.location.origin) {
      baseUrl = window.location.origin;
    } else {
      // Fallback for server-side rendering
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    }
    // Use custom URL if available, otherwise fall back to API key
    const path = connection.customUrl || connection.apiKey;
    return `${baseUrl}/api/inbound/${path}`;
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Inbound API</h1>
                  <p className="text-gray-600 mt-2">
                    Create endpoints to receive data from external sources
                  </p>
                </div>
                <HelpButton 
                  content={getHelpContent('inboundApi')} 
                  className="ml-2"
                />
              </div>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Create Endpoint
              </button>
            </div>
          </div>

          {/* Connections List */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : connections.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 mb-4">No inbound API endpoints created yet.</p>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Create Your First Endpoint
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {connections.map((connection) => (
                <div key={connection.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{connection.name}</h3>
                      {connection.description && (
                        <p className="text-gray-600 mt-1">{connection.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {connection.status === 'active' ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          <CheckCircleIcon className="h-4 w-4" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                          <XCircleIcon className="h-4 w-4" />
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Endpoint URL</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 px-3 py-2 bg-gray-50 rounded border border-gray-200 text-sm font-mono text-gray-900">
                          {getEndpointUrl(connection)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(getEndpointUrl(connection))}
                          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                          title="Copy endpoint URL"
                        >
                          <DocumentDuplicateIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">API Key</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 px-3 py-2 bg-gray-50 rounded border border-gray-200 text-sm font-mono text-gray-900">
                          {connection.apiKey}
                        </code>
                        <button
                          onClick={() => copyToClipboard(connection.apiKey)}
                          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                          title="Copy API key"
                        >
                          <DocumentDuplicateIcon className="h-5 w-5" />
                        </button>
                      </div>
                      {connection.requireApiKey !== false && (
                        <p className="text-xs text-gray-600 mt-1">
                          Send as header: <code className="bg-gray-100 px-1 rounded">{connection.apiKeyHeader || 'X-API-Key'}: {connection.apiKey}</code>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Total Requests:</span>
                        <span className="ml-2 font-medium text-gray-900">{connection.requestCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Data Mode:</span>
                        <span className={`ml-2 font-medium text-gray-900 px-2 py-1 rounded-full text-xs ${
                          connection.dataMode === 'replace' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {connection.dataMode || 'append'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Request:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {connection.lastRequestAt ? new Date(connection.lastRequestAt).toLocaleString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div className="flex gap-2">
                      {connection.dataSourceId && (
                        <a
                          href={`/discovery?source=${connection.dataSourceId}`}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          View Data Source
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(connection)}
                        className="text-gray-600 hover:text-gray-700 transition-colors"
                        title="Edit endpoint"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(connection.id)}
                        className="text-red-600 hover:text-red-700 transition-colors"
                        title="Delete endpoint"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Dialog */}
        {showCreateDialog && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
              <div 
                className="fixed inset-0 backdrop-blur-sm bg-gray-900/50 transition-opacity" 
                onClick={() => setShowCreateDialog(false)}
              />

              <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-6 py-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Create Inbound API Endpoint
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Customer Data Import"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (optional)
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Describe the purpose of this endpoint..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data Mode
                      </label>
                      <select
                        value={formData.dataMode}
                        onChange={(e) => setFormData({ ...formData, dataMode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="append">Append - Add new data to existing data</option>
                        <option value="replace">Replace - Overwrite all existing data</option>
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        Choose how new data should be handled when sent to this endpoint.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom URL Path (optional)
                      </label>
                      <input
                        type="text"
                        value={formData.customUrl}
                        onChange={(e) => setFormData({ ...formData, customUrl: e.target.value.replace(/^\/+/, '').replace(/[^a-zA-Z0-9-_\/]/g, '') })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., customer-data or webhooks/stripe"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Creates a friendly URL like /api/inbound/customer-data instead of using the API key
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="requireApiKey"
                          checked={formData.requireApiKey}
                          onChange={(e) => setFormData({ ...formData, requireApiKey: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="requireApiKey" className="ml-2 text-sm text-gray-700">
                          Require API key authentication
                        </label>
                      </div>

                      {formData.requireApiKey && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            API Key Header Name
                          </label>
                          <input
                            type="text"
                            value={formData.apiKeyHeader}
                            onChange={(e) => setFormData({ ...formData, apiKeyHeader: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="X-API-Key"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            The header name clients should use to send the API key
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => setShowCreateDialog(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={!formData.name}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Endpoint
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        {showEditDialog && editingConnection && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
              <div 
                className="fixed inset-0 backdrop-blur-sm bg-gray-900/50 transition-opacity" 
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingConnection(null);
                  setFormData({ name: '', description: '', dataMode: 'append', customUrl: '', apiKeyHeader: 'X-API-Key', requireApiKey: true });
                }}
              />

              <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-6 py-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Edit Inbound API Endpoint
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Customer Data Import"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (optional)
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Describe the purpose of this endpoint..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data Mode
                      </label>
                      <select
                        value={formData.dataMode}
                        onChange={(e) => setFormData({ ...formData, dataMode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="append">Append - Add new data to existing data</option>
                        <option value="replace">Replace - Overwrite all existing data</option>
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        Choose how new data should be handled when sent to this endpoint.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom URL Path (optional)
                      </label>
                      <input
                        type="text"
                        value={formData.customUrl}
                        onChange={(e) => setFormData({ ...formData, customUrl: e.target.value.replace(/^\/+/, '').replace(/[^a-zA-Z0-9-_\/]/g, '') })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., customer-data or webhooks/stripe"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Creates a friendly URL like /api/inbound/customer-data instead of using the API key
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="editRequireApiKey"
                          checked={formData.requireApiKey}
                          onChange={(e) => setFormData({ ...formData, requireApiKey: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="editRequireApiKey" className="ml-2 text-sm text-gray-700">
                          Require API key authentication
                        </label>
                      </div>

                      {formData.requireApiKey && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            API Key Header Name
                          </label>
                          <input
                            type="text"
                            value={formData.apiKeyHeader}
                            onChange={(e) => setFormData({ ...formData, apiKeyHeader: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="X-API-Key"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            The header name clients should use to send the API key
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => {
                        setShowEditDialog(false);
                        setEditingConnection(null);
                        setFormData({ name: '', description: '', dataMode: 'append', customUrl: '', apiKeyHeader: 'X-API-Key', requireApiKey: true });
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateConnection}
                      disabled={!formData.name}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Update Endpoint
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function InboundApiPage() {
  return (
    <DialogProvider>
      <InboundApiContent />
    </DialogProvider>
  );
}