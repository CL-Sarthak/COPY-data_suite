'use client';

import React, { useState } from 'react';
import { DatabaseConnection, DatabaseType } from '@/types/connector';
import { AlertCircle, CheckCircle2, Database, Loader2, RefreshCw } from 'lucide-react';

interface DatabaseConnectionFormProps {
  connection?: Partial<DatabaseConnection>;
  onSubmit: (connection: Partial<DatabaseConnection>) => Promise<void>;
  onCancel: () => void;
}

const DATABASE_TYPES: { value: DatabaseType; label: string; defaultPort: number; supported: boolean }[] = [
  { value: 'postgresql', label: 'PostgreSQL', defaultPort: 5432, supported: true },
  { value: 'mysql', label: 'MySQL', defaultPort: 3306, supported: true },
  { value: 'mongodb', label: 'MongoDB', defaultPort: 27017, supported: false },
  { value: 'mssql', label: 'SQL Server', defaultPort: 1433, supported: false },
  { value: 'oracle', label: 'Oracle', defaultPort: 1521, supported: false },
  { value: 'db2', label: 'IBM DB2', defaultPort: 50000, supported: false },
  { value: 'snowflake', label: 'Snowflake', defaultPort: 443, supported: false },
  { value: 'redshift', label: 'Amazon Redshift', defaultPort: 5439, supported: false },
  { value: 'bigquery', label: 'Google BigQuery', defaultPort: 443, supported: false },
];

export const DatabaseConnectionForm: React.FC<DatabaseConnectionFormProps> = ({
  connection = {},
  onSubmit,
  onCancel,
}) => {
  // Find the first supported database type to use as default
  const defaultDbType = DATABASE_TYPES.find(t => t.supported) || DATABASE_TYPES[0];
  
  // Check if the provided connection type is supported
  const initialType = connection.type && DATABASE_TYPES.find(t => t.value === connection.type && t.supported)
    ? connection.type
    : defaultDbType.value;
  
  const [formData, setFormData] = useState<Partial<DatabaseConnection>>({
    name: '',
    type: initialType,
    host: '',
    port: defaultDbType.defaultPort,
    database: '',
    username: '',
    password: '',
    ssl: false,
    refreshEnabled: false,
    refreshInterval: 60,
    ...connection,
    ...(connection.type && { type: initialType }) // Override type with supported one only if provided
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleTypeChange = (type: DatabaseType) => {
    const dbType = DATABASE_TYPES.find(t => t.value === type);
    setFormData({
      ...formData,
      type,
      port: dbType?.defaultPort || 5432,
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Clean up the form data before testing
      const cleanedData = {
        ...formData,
        password: formData.password && formData.password.trim() !== '' ? formData.password : undefined,
        sslCert: formData.sslCert && formData.sslCert.trim() !== '' ? formData.sslCert : undefined,
      };
      
      const response = await fetch('/api/database-connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      });

      const result = await response.json();
      setTestResult({
        success: result.success,
        message: result.message || (result.success ? 'Connection successful!' : 'Connection failed'),
      });
    } catch {
      setTestResult({
        success: false,
        message: 'Failed to test connection',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Clean up the form data before submitting
      const cleanedData = {
        ...formData,
        password: formData.password && formData.password.trim() !== '' ? formData.password : undefined,
        sslCert: formData.sslCert && formData.sslCert.trim() !== '' ? formData.sslCert : undefined,
      };
      await onSubmit(cleanedData);
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = formData.name && formData.host && formData.port && formData.database && formData.username;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-gray-700" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {connection?.id ? 'Update' : 'Create'} Database Connection
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Configure connection settings for your database
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Connection Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            placeholder="e.g., Production Database"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Database Type <span className="text-red-500">*</span>
          </label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) => handleTypeChange(e.target.value as DatabaseType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {DATABASE_TYPES.map((dbType) => (
              <option 
                key={dbType.value} 
                value={dbType.value}
                disabled={!dbType.supported}
                className={!dbType.supported ? 'text-gray-400' : ''}
              >
                {dbType.label}{!dbType.supported ? ' (Coming Soon)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-1">
              Host <span className="text-red-500">*</span>
            </label>
            <input
              id="host"
              type="text"
              required
              placeholder="e.g., localhost or db.example.com"
              value={formData.host}
              onChange={(e) => setFormData({ ...formData, host: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-1">
              Port <span className="text-red-500">*</span>
            </label>
            <input
              id="port"
              type="number"
              required
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="database" className="block text-sm font-medium text-gray-700 mb-1">
            Database Name <span className="text-red-500">*</span>
          </label>
          <input
            id="database"
            type="text"
            required
            placeholder="e.g., myapp_production"
            value={formData.database}
            onChange={(e) => setFormData({ ...formData, database: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              id="username"
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password || ''}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="ssl"
            checked={formData.ssl}
            onChange={(e) => setFormData({ ...formData, ssl: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="ssl" className="text-sm font-medium text-gray-700">
            Use SSL
          </label>
        </div>

        {formData.ssl && (
          <div>
            <label htmlFor="sslCert" className="block text-sm font-medium text-gray-700 mb-1">
              SSL Certificate (optional)
            </label>
            <textarea
              id="sslCert"
              placeholder="Paste your SSL certificate here..."
              value={formData.sslCert || ''}
              onChange={(e) => setFormData({ ...formData, sslCert: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            id="description"
            placeholder="Add notes about this connection..."
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-medium">Scheduled Refresh</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="refreshEnabled"
              checked={formData.refreshEnabled || false}
              onChange={(e) => setFormData({ ...formData, refreshEnabled: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="refreshEnabled" className="text-sm font-medium text-gray-700">
              Enable automatic data refresh
            </label>
          </div>

          {formData.refreshEnabled && (
            <div className="ml-6">
              <label htmlFor="refreshInterval" className="block text-sm font-medium text-gray-700 mb-1">
                Refresh Interval (minutes)
              </label>
              <input
                id="refreshInterval"
                type="number"
                min={5}
                max={10080}
                value={formData.refreshInterval || 60}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  refreshInterval: parseInt(e.target.value) || 60 
                })}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum: 5 minutes, Maximum: 1 week (10,080 minutes)
              </p>
            </div>
          )}
        </div>

        {testResult && (
          <div className={`p-4 rounded-lg flex items-start gap-3 ${
            testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="h-5 w-5 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 mt-0.5" />
            )}
            <div className="text-sm">{testResult.message}</div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={!isFormValid || testing}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </button>

          <div className="space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />}
              {connection?.id ? 'Update' : 'Create'} Connection
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};