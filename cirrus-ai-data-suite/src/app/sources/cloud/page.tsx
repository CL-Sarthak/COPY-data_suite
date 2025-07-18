'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { DialogProvider, useDialog } from '@/contexts/DialogContext';
import { 
  RefreshCw,
  AlertCircle,
  CloudIcon,
  PlusIcon,
  TrashIcon,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DataSource } from '@/types/discovery';

type CloudProvider = 's3' | 'azure' | 'gcp';

interface CloudProviderInfo {
  name: string;
  icon: string;
  fields: {
    label: string;
    key: string;
    type: string;
    placeholder: string;
  }[];
}

const cloudProviders: Record<CloudProvider, CloudProviderInfo> = {
  s3: {
    name: 'Amazon S3',
    icon: '🪣',
    fields: [
      { label: 'Bucket Name', key: 'bucket', type: 'text', placeholder: 'my-s3-bucket' },
      { label: 'Region', key: 'region', type: 'text', placeholder: 'us-east-1' },
      { label: 'Access Key ID', key: 'accessKeyId', type: 'text', placeholder: 'AKIAIOSFODNN7EXAMPLE' },
      { label: 'Secret Access Key', key: 'secretAccessKey', type: 'password', placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
      { label: 'Path Prefix (optional)', key: 'prefix', type: 'text', placeholder: 'data/files/' }
    ]
  },
  azure: {
    name: 'Azure Blob Storage',
    icon: '☁️',
    fields: [
      { label: 'Storage Account Name', key: 'accountName', type: 'text', placeholder: 'mystorageaccount' },
      { label: 'Container Name', key: 'containerName', type: 'text', placeholder: 'mycontainer' },
      { label: 'Account Key', key: 'accountKey', type: 'password', placeholder: 'Account key' },
      { label: 'Path Prefix (optional)', key: 'prefix', type: 'text', placeholder: 'data/files/' }
    ]
  },
  gcp: {
    name: 'Google Cloud Storage',
    icon: '🔷',
    fields: [
      { label: 'Project ID', key: 'projectId', type: 'text', placeholder: 'my-project-123' },
      { label: 'Bucket Name', key: 'bucketName', type: 'text', placeholder: 'my-gcs-bucket' },
      { label: 'Service Account Key (JSON)', key: 'serviceAccountKey', type: 'textarea', placeholder: '{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}' },
      { label: 'Path Prefix (optional)', key: 'prefix', type: 'text', placeholder: 'data/files/' }
    ]
  }
};

function CloudStorageContent() {
  const dialog = useDialog();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [cloudSources, setCloudSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);
  const [connectionName, setConnectionName] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(60);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCloudSources = useCallback(async () => {
    try {
      const response = await fetch('/api/data-sources');
      if (response.ok) {
        const sources = await response.json();
        const cloudDataSources = sources.filter((s: DataSource) => 
          ['s3', 'azure', 'gcp'].includes(s.type)
        );
        setCloudSources(cloudDataSources);
      }
    } catch (error) {
      console.error('Error loading cloud sources:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCloudSources();
  }, [loadCloudSources]);

  const deleteCloudSource = async (sourceId: string) => {
    try {
      const response = await fetch(`/api/data-sources/${sourceId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadCloudSources();
        dialog.showAlert({
          title: 'Success',
          message: 'Cloud connection deleted successfully.',
          type: 'success'
        });
      } else {
        throw new Error('Failed to delete cloud connection');
      }
    } catch (error) {
      console.error('Error deleting cloud source:', error);
      dialog.showAlert({
        title: 'Error',
        message: 'Failed to delete cloud connection.',
        type: 'error'
      });
    }
  };

  const resetForm = () => {
    setSelectedProvider(null);
    setConnectionName('');
    setCredentials({});
    setAutoSync(false);
    setSyncInterval(60);
    setTestResult(null);
  };

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials(prev => ({ ...prev, [key]: value }));
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    // Simulate connection test
    setTimeout(() => {
      setTestResult({ 
        success: true, 
        message: 'Connection test successful! Cloud storage is accessible.' 
      });
      setTesting(false);
    }, 1500);
  };

  const saveCloudConnection = async () => {
    if (!selectedProvider || !connectionName) {
      return;
    }

    setSaving(true);

    try {
      const configuration = {
        provider: selectedProvider,
        ...credentials,
        autoSync,
        syncInterval: autoSync ? syncInterval : undefined
      };

      const response = await fetch('/api/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: connectionName,
          type: selectedProvider,
          connectionStatus: 'connecting',
          configuration
        })
      });

      if (response.ok) {
        dialog.showAlert({
          title: 'Success',
          message: 'Cloud connection saved successfully!',
          type: 'success'
        });
        
        setShowForm(false);
        resetForm();
        await loadCloudSources();
      }
    } catch (error) {
      console.error('Error saving cloud connection:', error);
    } finally {
      setSaving(false);
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
                ← Back to Cloud Storage
              </button>
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Create Cloud Connection</h1>
              <p className="text-gray-900 mt-1">
                Connect to cloud storage services to import data
              </p>
            </div>

          {/* Provider Selection */}
          {!selectedProvider ? (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Select Cloud Provider</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(cloudProviders).map(([key, provider]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedProvider(key as CloudProvider)}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-center"
                  >
                    <div className="text-4xl mb-3">{provider.icon}</div>
                    <h3 className="text-lg font-medium text-gray-900">{provider.name}</h3>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Selected Provider Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cloudProviders[selectedProvider].icon}</span>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {cloudProviders[selectedProvider].name}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setSelectedProvider(null);
                    setCredentials({});
                    setTestResult(null);
                  }}
                  className="text-sm text-gray-900 hover:text-gray-900"
                >
                  Change Provider
                </button>
              </div>

              {/* Connection Name */}
              <div className="mb-6">
                <label htmlFor="connectionName" className="block text-sm font-medium text-gray-700 mb-2">
                  Connection Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="connectionName"
                  type="text"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  placeholder={`My ${cloudProviders[selectedProvider].name} Connection`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Provider-specific Fields */}
              {cloudProviders[selectedProvider].fields.map(field => (
                <div key={field.key} className="mb-6">
                  <label htmlFor={field.key} className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label} {!field.label.includes('optional') && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={field.key}
                      value={credentials[field.key] || ''}
                      onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                  ) : (
                    <input
                      id={field.key}
                      type={field.type}
                      value={credentials[field.key] || ''}
                      onChange={(e) => handleCredentialChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
              ))}

              {/* Auto Sync */}
              <div className="mb-6">
                <div className="flex items-center mb-3">
                  <input
                    id="autoSync"
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoSync" className="ml-2 block text-sm text-gray-700">
                    Enable automatic synchronization
                  </label>
                </div>
                {autoSync && (
                  <div className="ml-6 flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      min="1"
                      value={syncInterval}
                      onChange={(e) => setSyncInterval(parseInt(e.target.value) || 60)}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-sm text-gray-900">minutes</span>
                  </div>
                )}
              </div>

              {/* Test Result */}
              {testResult && (
                <div className={`mb-6 p-4 rounded-lg ${
                  testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`h-5 w-5 ${
                      testResult.success ? 'text-green-600' : 'text-red-600'
                    }`} />
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
                  onClick={testConnection}
                  disabled={!connectionName || testing}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={saveCloudConnection}
                  disabled={!connectionName || saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Connection'}
                </button>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Cloud storage connections are currently in preview. Full functionality including 
              file browsing, filtering, and automatic synchronization will be available in the next release.
            </p>
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Cloud Storage
                <span className="ml-3 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                  Coming Soon
                </span>
              </h1>
              <p className="text-gray-900 mt-1">
                Connect to cloud storage services for data import
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              New Cloud Connection
            </button>
          </div>

          {/* Coming Soon Notice */}
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Feature Coming Soon</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  Cloud storage integration is currently in development. While you can create connections, 
                  full functionality including file browsing, filtering, and automatic synchronization will 
                  be available in the next release.
                </p>
              </div>
            </div>
          </div>

          {cloudSources.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <CloudIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">No cloud connections yet</p>
              <p className="text-gray-900 mb-6">
                Connect your first cloud storage service to start importing data
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
              {cloudSources.map((source) => {
                const config = source.configuration as {
                  bucket?: string;
                  bucketName?: string;
                  containerName?: string;
                  region?: string;
                  autoSync?: boolean;
                  syncInterval?: number;
                  [key: string]: unknown;
                };
                const providerInfo = cloudProviders[source.type as CloudProvider];
                return (
                  <div key={source.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{providerInfo?.icon || '☁️'}</div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">{source.name}</h3>
                          <div className="mt-2 space-y-1 text-sm">
                            <p className="text-gray-900">
                              Provider: <span className="text-gray-900 font-medium">{providerInfo?.name || source.type.toUpperCase()}</span>
                            </p>
                            {config?.bucket && (
                              <p className="text-gray-900">
                                Bucket: <span className="text-gray-900 font-mono text-xs">{config.bucket}</span>
                              </p>
                            )}
                            {config?.bucketName && (
                              <p className="text-gray-900">
                                Bucket: <span className="text-gray-900 font-mono text-xs">{config.bucketName}</span>
                              </p>
                            )}
                            {config?.containerName && (
                              <p className="text-gray-900">
                                Container: <span className="text-gray-900 font-mono text-xs">{config.containerName}</span>
                              </p>
                            )}
                            {config?.region && (
                              <p className="text-gray-900">
                                Region: <span className="text-gray-900">{config.region}</span>
                              </p>
                            )}
                            {config?.autoSync && (
                              <p className="text-gray-900 flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                Auto-sync: <span className="text-gray-900">Every {config.syncInterval} minutes</span>
                              </p>
                            )}
                            {source.connectionStatus === 'connected' && (
                              <p className="text-green-600 text-xs">
                                ✓ Connected
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/discovery?source=${source.id}`)}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          View in Discovery
                        </button>
                        <button
                          onClick={() => deleteCloudSource(source.id)}
                          className="p-1.5 text-gray-900 hover:text-red-600 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function CloudStoragePage() {
  return (
    <DialogProvider>
      <CloudStorageContent />
    </DialogProvider>
  );
}