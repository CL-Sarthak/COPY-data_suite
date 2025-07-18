import React from 'react';
import { SyntheticDataConfig } from '../../types';
import { ConfigCard } from './ConfigCard';
import { LoadingState, ErrorState, EmptyState } from '@/features/shared/components';
import { DocumentPlusIcon } from '@heroicons/react/24/outline';

interface ConfigListProps {
  configs: SyntheticDataConfig[];
  loading: boolean;
  error: Error | null;
  generatingConfigId: string | null;
  onGenerate: (configId: string) => void;
  onEdit: (config: SyntheticDataConfig) => void;
  onDelete: (configId: string) => void;
  onCreateNew: () => void;
}

export function ConfigList({
  configs,
  loading,
  error,
  generatingConfigId,
  onGenerate,
  onEdit,
  onDelete,
  onCreateNew
}: ConfigListProps) {
  if (loading) {
    return <LoadingState message="Loading configurations..." />;
  }

  if (error) {
    return (
      <ErrorState 
        error={error}
        title="Failed to load configurations"
      />
    );
  }

  if (configs.length === 0) {
    return (
      <EmptyState
        icon={<DocumentPlusIcon />}
        title="No configurations yet"
        description="Create your first synthetic data configuration to get started"
        action={{
          label: "Create Configuration",
          onClick: onCreateNew,
          icon: <DocumentPlusIcon className="h-4 w-4" />
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {configs.map((config) => (
        <ConfigCard
          key={config.id}
          config={config}
          onGenerate={onGenerate}
          onEdit={onEdit}
          onDelete={onDelete}
          isGenerating={generatingConfigId === config.id}
        />
      ))}
    </div>
  );
}