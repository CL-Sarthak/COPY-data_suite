import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@/features/shared/components';
import { DataSource } from '@/types/discovery';
import { DataSourceFormData, DataSourceType } from '../types';

interface DataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSource?: DataSource | null;
  onSave: (data: DataSourceFormData) => Promise<void>;
}

const sourceTypes: { value: DataSourceType; label: string; description: string }[] = [
  { value: 'file', label: 'File Upload', description: 'CSV, JSON, Excel files' },
  { value: 'database', label: 'Database', description: 'PostgreSQL, MySQL, SQLite' },
  { value: 'api', label: 'API', description: 'REST API endpoints' },
  { value: 's3', label: 'Amazon S3', description: 'S3 buckets and objects' },
  { value: 'azure_blob', label: 'Azure Blob', description: 'Azure Blob Storage' },
  { value: 'gcs', label: 'Google Cloud Storage', description: 'GCS buckets' }
];

export function DataSourceModal({ isOpen, onClose, dataSource, onSave }: DataSourceModalProps) {
  const [formData, setFormData] = useState<DataSourceFormData>({
    name: '',
    type: 'file',
    configuration: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dataSource) {
      setFormData({
        name: dataSource.name,
        type: dataSource.type as DataSourceType,
        configuration: (dataSource.configuration || {}) as Record<string, unknown>
      });
    } else {
      setFormData({
        name: '',
        type: 'file',
        configuration: {}
      });
    }
  }, [dataSource]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data source');
    } finally {
      setLoading(false);
    }
  };

  const renderConfigFields = () => {
    switch (formData.type) {
      case 'database':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Database Type</label>
              <select
                value={String(formData.configuration?.dbType || 'postgresql')}
                onChange={(e) => setFormData({
                  ...formData,
                  configuration: { ...formData.configuration, dbType: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="sqlite">SQLite</option>
              </select>
            </div>
            {formData.configuration?.dbType !== 'sqlite' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Host</label>
                  <input
                    type="text"
                    value={String(formData.configuration?.host || '')}
                    onChange={(e) => setFormData({
                      ...formData,
                      configuration: { ...formData.configuration, host: e.target.value }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Port</label>
                  <input
                    type="number"
                    value={String(formData.configuration?.port || '')}
                    onChange={(e) => setFormData({
                      ...formData,
                      configuration: { ...formData.configuration, port: parseInt(e.target.value) }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="5432"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Database</label>
                  <input
                    type="text"
                    value={String(formData.configuration?.database || '')}
                    onChange={(e) => setFormData({
                      ...formData,
                      configuration: { ...formData.configuration, database: e.target.value }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    value={String(formData.configuration?.username || '')}
                    onChange={(e) => setFormData({
                      ...formData,
                      configuration: { ...formData.configuration, username: e.target.value }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={String(formData.configuration?.password || '')}
                    onChange={(e) => setFormData({
                      ...formData,
                      configuration: { ...formData.configuration, password: e.target.value }
                    })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </>
            )}
          </>
        );

      case 'api':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">API URL</label>
              <input
                type="url"
                value={String(formData.configuration?.url || '')}
                onChange={(e) => setFormData({
                  ...formData,
                  configuration: { ...formData.configuration, url: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="https://api.example.com/data"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">API Key (optional)</label>
              <input
                type="password"
                value={String(formData.configuration?.apiKey || '')}
                onChange={(e) => setFormData({
                  ...formData,
                  configuration: { ...formData.configuration, apiKey: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </>
        );

      case 's3':
      case 'azure_blob':
      case 'gcs':
        return (
          <div className="text-sm text-gray-500">
            Cloud storage configuration coming soon...
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={dataSource ? 'Edit Data Source' : 'New Data Source'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ 
              ...formData, 
              type: e.target.value as DataSourceType,
              configuration: {} // Reset configuration when type changes
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            disabled={!!dataSource} // Can't change type when editing
          >
            {sourceTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label} - {type.description}
              </option>
            ))}
          </select>
        </div>

        {renderConfigFields()}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {dataSource ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}