import React, { useState } from 'react';
import { Panel, Button } from '@/features/shared/components';
import { ConfigList } from './ConfigList';
import { CreateConfigModal } from '../modals/CreateConfigModal';
import { EditConfigModal } from '../modals/EditConfigModal';
import { useConfigurations, useJobs } from '../../hooks';
import { useModal } from '@/features/shared/hooks';
import { useDialog } from '@/contexts/DialogContext';
import { SyntheticDataConfig } from '../../types';
import { PlusIcon } from '@heroicons/react/24/outline';

export function ConfigurationPanel() {
  const { configs, loading, error, deleteConfig } = useConfigurations();
  const { startGeneration } = useJobs();
  const dialog = useDialog();
  
  const createModal = useModal();
  const editModal = useModal();
  
  const [generatingConfigId, setGeneratingConfigId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<SyntheticDataConfig | null>(null);

  const handleGenerate = async (configId: string) => {
    try {
      setGeneratingConfigId(configId);
      const config = configs.find(c => c.id === configId);
      await startGeneration(configId, config?.name);
    } catch (error) {
      console.error('Failed to start generation:', error);
    } finally {
      setGeneratingConfigId(null);
    }
  };

  const handleEdit = (config: SyntheticDataConfig) => {
    setEditingConfig(config);
    editModal.open();
  };

  const handleDelete = async (configId: string) => {
    const config = configs.find(c => c.id === configId);
    
    const confirmed = await dialog.showConfirm({
      title: 'Delete Configuration',
      message: `Are you sure you want to delete "${config?.name}"? This action cannot be undone.`,
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      await deleteConfig(configId);
    }
  };

  const handleClearAll = async () => {
    const totalConfigs = configs.length;
    
    const confirmed = await dialog.showConfirm({
      title: 'Clear All Configurations',
      message: `Are you sure you want to delete all ${totalConfigs} configurations? This action cannot be undone and will delete all generated files.`,
      type: 'warning',
      confirmText: 'Delete All',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      try {
        await Promise.all(configs.map(config => deleteConfig(config.id)));
      } catch (error) {
        console.error('Error clearing all configurations:', error);
      }
    }
  };

  return (
    <>
      <Panel
        title="Configurations"
        description="Manage your synthetic data generation configurations"
        action={
          <div className="flex gap-2">
            {configs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
              >
                Clear All
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              icon={<PlusIcon className="h-4 w-4" />}
              onClick={createModal.open}
            >
              New Configuration
            </Button>
          </div>
        }
      >
        <ConfigList
          configs={configs}
          loading={loading}
          error={error}
          generatingConfigId={generatingConfigId}
          onGenerate={handleGenerate}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreateNew={createModal.open}
        />
      </Panel>

      <CreateConfigModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
      />

      {editingConfig && (
        <EditConfigModal
          isOpen={editModal.isOpen}
          onClose={() => {
            editModal.close();
            setEditingConfig(null);
          }}
          config={editingConfig}
        />
      )}
    </>
  );
}