import React, { useState } from 'react';
import { Panel, Button, LoadingState } from '@/features/shared/components';
import { DataSourceTable } from './DataSourceTable';
import { AddDataSourceModal } from '../modals/AddDataSourceModal';
import { SchemaAnalyzerModal } from '../modals/SchemaAnalyzerModal';
import { FieldMappingModal } from '../modals/FieldMappingModal';
import { DataProfilingModal } from '../modals/DataProfilingModal';
import { EditDataSourceModal } from '../modals/EditDataSourceModal';
import { AddFilesModal } from '../modals/AddFilesModal';
import { useDataSources } from '../../hooks/useDataSources';
import { useModal } from '@/features/shared/hooks';
import { PlusIcon } from '@heroicons/react/24/outline';
import { DataSource } from '@/types/discovery';

export function DataSourcesPanel() {
  const { dataSources, loading, transformingSource, transformProgress, actions } = useDataSources();
  const addModal = useModal();
  const analyzerModal = useModal();
  const mappingModal = useModal();
  const profilingModal = useModal();
  const editModal = useModal();
  const addFilesModal = useModal();
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);

  const handleTransform = async (source: DataSource) => {
    try {
      const catalog = await actions.transform(source);
      // You could emit an event or use a callback to show the catalog
      console.log('Transformation complete:', catalog);
    } catch (error) {
      console.error('Transform failed:', error);
    }
  };

  const handleAnalyze = (source: DataSource) => {
    setSelectedSource(source);
    analyzerModal.open();
  };

  const handleMapping = (source: DataSource) => {
    setSelectedSource(source);
    mappingModal.open();
  };

  const handleProfile = (source: DataSource) => {
    setSelectedSource(source);
    profilingModal.open();
  };

  const handleEdit = (source: DataSource) => {
    setSelectedSource(source);
    editModal.open();
  };

  const handleAddFiles = (source: DataSource) => {
    setSelectedSource(source);
    addFilesModal.open();
  };

  if (loading && dataSources.length === 0) {
    return (
      <Panel title="Data Sources">
        <LoadingState message="Loading data sources..." />
      </Panel>
    );
  }

  return (
    <>
      <Panel
        title="Data Sources"
        description="Manage and transform your data sources"
        action={
          <Button
            onClick={addModal.open}
            icon={<PlusIcon className="h-4 w-4" />}
            size="sm"
          >
            Add Data Source
          </Button>
        }
        noPadding
      >
        <DataSourceTable
          dataSources={dataSources}
          onTransform={handleTransform}
          onAnalyze={handleAnalyze}
          onMapping={handleMapping}
          onProfile={handleProfile}
          onEdit={handleEdit}
          onAddFiles={handleAddFiles}
          onDelete={actions.delete}
          transformingSource={transformingSource}
          transformProgress={transformProgress}
        />
      </Panel>

      <AddDataSourceModal
        isOpen={addModal.isOpen}
        onClose={addModal.close}
        onAdd={async (name, type, config, files) => {
          await actions.create(name, type, config, files);
          addModal.close();
        }}
      />

      {selectedSource && (
        <SchemaAnalyzerModal
          isOpen={analyzerModal.isOpen}
          onClose={() => {
            analyzerModal.close();
            setSelectedSource(null);
          }}
          dataSource={selectedSource}
        />
      )}

      {selectedSource && (
        <FieldMappingModal
          isOpen={mappingModal.isOpen}
          onClose={() => {
            mappingModal.close();
            setSelectedSource(null);
          }}
          dataSource={selectedSource}
        />
      )}

      {selectedSource && (
        <DataProfilingModal
          isOpen={profilingModal.isOpen}
          onClose={() => {
            profilingModal.close();
            setSelectedSource(null);
          }}
          dataSource={selectedSource}
        />
      )}

      {selectedSource && (
        <EditDataSourceModal
          isOpen={editModal.isOpen}
          onClose={() => {
            editModal.close();
            setSelectedSource(null);
          }}
          dataSource={selectedSource}
          onSave={async (id, updates) => {
            await actions.update(id, updates);
            editModal.close();
            setSelectedSource(null);
          }}
        />
      )}

      {selectedSource && (
        <AddFilesModal
          isOpen={addFilesModal.isOpen}
          onClose={() => {
            addFilesModal.close();
            setSelectedSource(null);
          }}
          dataSource={selectedSource}
          onAddFiles={async (sourceId, files) => {
            await actions.addFiles(sourceId, files);
            addFilesModal.close();
            setSelectedSource(null);
          }}
        />
      )}
    </>
  );
}