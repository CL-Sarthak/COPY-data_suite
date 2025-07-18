'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EditableApiConnection {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  authType: string;
  authConfig?: Record<string, unknown>;
  headers?: Record<string, string>;
  refreshEnabled: boolean;
  refreshInterval?: number;
  timeout?: number;
  retryCount?: number;
  responseMapping?: { dataPath?: string };
  [key: string]: unknown;
}

interface ApiConnectionEditDialogProps {
  connection: EditableApiConnection;
  isOpen: boolean;
  onClose: () => void;
  onSave: (connection: EditableApiConnection) => void;
}

export default function ApiConnectionEditDialog({
  connection,
  isOpen,
  onClose,
  onSave
}: ApiConnectionEditDialogProps) {
  const [formData, setFormData] = useState({
    name: connection.name,
    endpoint: connection.endpoint,
    method: connection.method,
    authType: connection.authType,
    apiKey: (connection.authConfig?.apiKey as string) || '',
    bearerToken: (connection.authConfig?.bearerToken as string) || '',
    username: (connection.authConfig?.username as string) || '',
    password: (connection.authConfig?.password as string) || '',
    headers: connection.headers || {},
    timeout: connection.timeout || 30000,
    retryCount: connection.retryCount || 3,
    refreshEnabled: connection.refreshEnabled || false,
    refreshInterval: connection.refreshInterval || 60,
    dataPath: connection.responseMapping?.dataPath || ''
  });

  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>(
    Object.entries(formData.headers).map(([key, value]) => ({ key, value: value as string }))
  );

  useEffect(() => {
    setFormData({
      name: connection.name,
      endpoint: connection.endpoint,
      method: connection.method,
      authType: connection.authType,
      apiKey: (connection.authConfig?.apiKey as string) || '',
      bearerToken: (connection.authConfig?.bearerToken as string) || '',
      username: (connection.authConfig?.username as string) || '',
      password: (connection.authConfig?.password as string) || '',
      headers: connection.headers || {},
      timeout: connection.timeout || 30000,
      retryCount: connection.retryCount || 3,
      refreshEnabled: connection.refreshEnabled || false,
      refreshInterval: connection.refreshInterval || 60,
      dataPath: connection.responseMapping?.dataPath || ''
    });
    setCustomHeaders(
      Object.entries(connection.headers || {}).map(([key, value]) => ({ key, value: value as string }))
    );
  }, [connection]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build auth config based on auth type
    let authConfig: Record<string, unknown> | undefined;
    switch (formData.authType) {
      case 'apiKey':
        authConfig = { apiKey: formData.apiKey };
        break;
      case 'bearer':
        authConfig = { bearerToken: formData.bearerToken };
        break;
      case 'basic':
        authConfig = { username: formData.username, password: formData.password };
        break;
    }

    // Convert custom headers array to object
    const headers: Record<string, string> = {};
    customHeaders.forEach(({ key, value }) => {
      if (key && value) {
        headers[key] = value;
      }
    });

    const updatedConnection = {
      ...connection,
      name: formData.name,
      endpoint: formData.endpoint,
      method: formData.method,
      authType: formData.authType,
      authConfig,
      headers,
      timeout: formData.timeout,
      retryCount: formData.retryCount,
      refreshEnabled: formData.refreshEnabled,
      refreshInterval: formData.refreshInterval,
      responseMapping: formData.dataPath ? { dataPath: formData.dataPath } : undefined
    };

    onSave(updatedConnection);
  };

  const addHeader = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customHeaders];
    updated[index][field] = value;
    setCustomHeaders(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-gray-900/50 transition-opacity" 
          onClick={onClose}
        />

        {/* This empty element maintains the vertical centering */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit API Connection
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Basic Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Connection Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      API Endpoint
                    </label>
                    <input
                      type="url"
                      value={formData.endpoint}
                      onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      HTTP Method
                    </label>
                    <select
                      value={formData.method}
                      onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                </div>

                {/* Authentication */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Authentication Type
                  </label>
                  <select
                    value={formData.authType}
                    onChange={(e) => setFormData({ ...formData, authType: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="none">None</option>
                    <option value="apiKey">API Key</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>

                {formData.authType === 'apiKey' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      API Key
                    </label>
                    <input
                      type="text"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter API key"
                    />
                  </div>
                )}

                {formData.authType === 'bearer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Bearer Token
                    </label>
                    <input
                      type="text"
                      value={formData.bearerToken}
                      onChange={(e) => setFormData({ ...formData, bearerToken: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter bearer token"
                    />
                  </div>
                )}

                {formData.authType === 'basic' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Username
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Custom Headers */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Custom Headers
                    </label>
                    <button
                      type="button"
                      onClick={addHeader}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Header
                    </button>
                  </div>
                  <div className="space-y-2">
                    {customHeaders.map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={header.key}
                          onChange={(e) => updateHeader(index, 'key', e.target.value)}
                          className="flex-1 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Header name"
                        />
                        <input
                          type="text"
                          value={header.value}
                          onChange={(e) => updateHeader(index, 'value', e.target.value)}
                          className="flex-1 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Header value"
                        />
                        <button
                          type="button"
                          onClick={() => removeHeader(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={formData.timeout}
                      onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                      className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1000"
                      max="300000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Retry Count
                    </label>
                    <input
                      type="number"
                      value={formData.retryCount}
                      onChange={(e) => setFormData({ ...formData, retryCount: parseInt(e.target.value) })}
                      className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      max="10"
                    />
                  </div>
                </div>

                {/* Response Mapping */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Data Path (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.dataPath}
                    onChange={(e) => setFormData({ ...formData, dataPath: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., data.items or Results"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    JSON path to the data array in the API response. Use dot notation for nested objects.
                  </p>
                </div>

                {/* Auto Refresh */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Auto Refresh
                      </label>
                      <p className="text-sm text-gray-500">
                        Automatically refresh data at regular intervals
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.refreshEnabled}
                      onChange={(e) => setFormData({ ...formData, refreshEnabled: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>

                  {formData.refreshEnabled && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Refresh Interval (minutes)
                      </label>
                      <input
                        type="number"
                        value={formData.refreshInterval}
                        onChange={(e) => setFormData({ ...formData, refreshInterval: parseInt(e.target.value) })}
                        className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        max="10080"
                        placeholder="60"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}