'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseConnection } from '@/types/connector';
import { DatabaseConnectionForm } from '@/components/DatabaseConnectionForm';
import Dialog from '@/components/Dialog';
import AppLayout from '@/components/AppLayout';
import { HelpButton } from '@/components/HelpSystem';
import { getHelpContent } from '@/content/helpContent';
import { 
  Database, 
  Plus, 
  Settings, 
  Trash2,
  ChevronRight,
  Loader2,
  AlertCircle,
  WifiIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ConnectorsPage() {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<DatabaseConnection | null>(null);
  const [deletingConnection, setDeletingConnection] = useState<DatabaseConnection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const response = await fetch('/api/database-connections');
      if (!response.ok) throw new Error('Failed to load connections');
      const data = await response.json();
      setConnections(data);
    } catch (error) {
      setError('Failed to load database connections');
      console.error('Failed to load connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConnection = async (connectionData: Partial<DatabaseConnection>) => {
    try {
      const response = await fetch('/api/database-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionData),
      });

      if (!response.ok) throw new Error('Failed to create connection');
      
      const newConnection = await response.json();
      setConnections([newConnection, ...connections]);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create connection:', error);
    }
  };

  const handleUpdateConnection = async (connectionData: Partial<DatabaseConnection>) => {
    if (!editingConnection) return;

    try {
      const response = await fetch(`/api/database-connections/${editingConnection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionData),
      });

      if (!response.ok) throw new Error('Failed to update connection');
      
      const updatedConnection = await response.json();
      setConnections(connections.map(c => 
        c.id === updatedConnection.id ? updatedConnection : c
      ));
      setEditingConnection(null);
    } catch (error) {
      console.error('Failed to update connection:', error);
    }
  };

  const handleDeleteConnection = async () => {
    if (!deletingConnection) return;

    try {
      const response = await fetch(`/api/database-connections/${deletingConnection.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete connection');
      
      setConnections(connections.filter(c => c.id !== deletingConnection.id));
      setDeletingConnection(null);
    } catch (error) {
      console.error('Failed to delete connection:', error);
    }
  };

  const handleTestConnection = async (connection: DatabaseConnection) => {
    setTestingConnection(connection.id);
    
    try {
      const response = await fetch('/api/database-connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: connection.id }),
      });

      const result = await response.json();
      
      // Reload connections to get the latest data from the database
      // This ensures we get the error message that was saved to the database
      await loadConnections();
      
      // Show a toast or notification if needed
      if (result.success) {
        setTestSuccess(connection.id);
        // Clear success message after 3 seconds
        setTimeout(() => setTestSuccess(null), 3000);
      } else if (result.message) {
        console.error('Connection test failed:', result.message);
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      // Still try to reload to get any updates
      await loadConnections();
    } finally {
      setTestingConnection(null);
    }
  };

  const getStatusBadge = (connection: DatabaseConnection) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    
    // If recently tested (within last 5 minutes) and successful
    if (connection.status === 'active' && connection.lastTestedAt) {
      const testAge = Date.now() - new Date(connection.lastTestedAt).getTime();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (testAge < fiveMinutes) {
        return (
          <div className="flex items-center gap-2">
            <span className={`${baseClasses} bg-green-100 text-green-800`}>Connected</span>
            <span className="text-xs text-green-600">✓ Tested</span>
          </div>
        );
      }
    }
    
    switch (connection.status) {
      case 'active':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Active</span>;
      case 'error':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Error</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Inactive</span>;
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

  if (showForm || editingConnection) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <DatabaseConnectionForm
              connection={editingConnection || undefined}
              onSubmit={editingConnection ? handleUpdateConnection : handleCreateConnection}
              onCancel={() => {
                setShowForm(false);
                setEditingConnection(null);
              }}
            />
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
                <h1 className="text-3xl font-bold text-gray-900">Database Connections</h1>
                <p className="text-gray-600 mt-1">
                  Connect to your databases to import and analyze data
                </p>
              </div>
              <HelpButton 
                content={getHelpContent('databaseSources')} 
                className="ml-2"
              />
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              New Connection
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {connections.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">No database connections yet</p>
              <p className="text-gray-600 mb-6">
                Create your first connection to start importing data
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Create Connection
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {connections.map((connection) => (
                <div key={connection.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Database className="h-5 w-5 text-gray-500 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{connection.name}</h3>
                    <p className="text-gray-600 mt-1">
                      {connection.type.toUpperCase()} • {connection.host}:{connection.port}/{connection.database}
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p className="text-gray-600">
                        Username: <span className="text-gray-700">{connection.username}</span>
                      </p>
                      {connection.lastTestedAt && (
                        <p className="text-gray-600">
                          Last tested: <span className="text-gray-700">
                            {new Date(connection.lastTestedAt).toLocaleString()}
                          </span>
                        </p>
                      )}
                      {connection.errorMessage && (
                        <p className="text-red-500 mt-2">
                          Error: {connection.errorMessage}
                        </p>
                      )}
                      {testSuccess === connection.id && (
                        <p className="text-green-600 mt-2">
                          ✓ Connection test successful!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(connection)}
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  onClick={() => handleTestConnection(connection)}
                  disabled={testingConnection === connection.id}
                  className="text-gray-400 hover:text-blue-600 transition-colors disabled:text-gray-300 disabled:cursor-not-allowed"
                  title="Test connection"
                >
                  {testingConnection === connection.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <WifiIcon className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => router.push(`/sources/databases/${connection.id}`)}
                  className="text-gray-400 hover:text-green-600 transition-colors"
                  title="Browse database tables"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingConnection(connection)}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit connection"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeletingConnection(connection)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete connection"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
              ))}
            </div>
          )}

          {deletingConnection && (
            <Dialog
              isOpen={!!deletingConnection}
              onClose={() => setDeletingConnection(null)}
              title="Delete Connection"
              message={`Are you sure you want to delete "${deletingConnection.name}"? This action cannot be undone.`}
              type="confirm"
              confirmText="Delete"
              onConfirm={handleDeleteConnection}
              onCancel={() => setDeletingConnection(null)}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}