import React, { useState } from 'react';
import { Panel, Button, LoadingState, ErrorState } from '@/features/shared/components';
import { useModal } from '@/features/shared/hooks';
import { PlusIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { DataSourceTable } from './components/DataSourceTable';
import { DataSourceModal } from './components/DataSourceModal';
import { FileUploadModal } from './components/FileUploadModal';
import { useDataSources } from './hooks/useDataSources';
import { DataSource } from '@/types/discovery';
import { DataSourceFormData } from './types';

export function DataSourcesFeature() {
  const {
    dataSources,
    loading,
    error,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    uploadFile,
    refresh
  } = useDataSources();

  const createModal = useModal();
  const uploadModal = useModal();
  const [editingDataSource, setEditingDataSource] = useState<DataSource | null>(null);

  const handleCreateOrUpdate = async (data: DataSourceFormData) => {
    if (editingDataSource) {
      await updateDataSource(editingDataSource.id, data);
    } else {
      await createDataSource(data);
    }
    setEditingDataSource(null);
  };

  const handleEdit = (dataSource: DataSource) => {
    setEditingDataSource(dataSource);
    createModal.open();
  };

  const handleDelete = async (dataSource: DataSource) => {
    if (window.confirm(`Are you sure you want to delete "${dataSource.name}"?`)) {
      try {
        await deleteDataSource(dataSource.id);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete data source');
      }
    }
  };

  // Test connection functionality removed - not available in API

  const handleUpload = async (file: File) => {
    await uploadFile(file);
  };

  if (loading) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        <LoadingState message="Loading data sources..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        <ErrorState 
          error={error} 
          onRetry={refresh}
          message="Failed to load data sources" 
        />
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Sources</h1>
          <p className="text-gray-600 mt-1">Connect and manage your data sources</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={<CloudArrowUpIcon className="h-4 w-4" />}
            onClick={uploadModal.open}
          >
            Upload File
          </Button>
          <Button
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => {
              setEditingDataSource(null);
              createModal.open();
            }}
          >
            New Connection
          </Button>
        </div>
      </div>

      {/* Data Sources Table */}
      <Panel title="Connected Sources" noPadding>
        <DataSourceTable
          dataSources={dataSources}
          onEdit={handleEdit}
          onDelete={handleDelete}
          // onTest removed - not available in API
        />
      </Panel>

      {/* Modals */}
      <DataSourceModal
        isOpen={createModal.isOpen}
        onClose={() => {
          createModal.close();
          setEditingDataSource(null);
        }}
        dataSource={editingDataSource}
        onSave={handleCreateOrUpdate}
      />

      <FileUploadModal
        isOpen={uploadModal.isOpen}
        onClose={uploadModal.close}
        onUpload={handleUpload}
      />
    </div>
  );
}