import React from 'react';
import { NodeTypeConfigProps } from '../../types/configuration.types';
import { FileSourceConfig } from '../CategoryConfigurations/FileSourceConfig';
import { DatabaseSourceConfig } from '../CategoryConfigurations/DatabaseSourceConfig';
import { ApiSourceConfig } from '../CategoryConfigurations/ApiSourceConfig';
import { StreamSourceConfig } from '../CategoryConfigurations/StreamSourceConfig';

export function SourceNodeConfig({
  node,
  config,
  resources,
  validation,
  onConfigChange
}: NodeTypeConfigProps) {
  const renderCategoryConfig = () => {
    switch (node.data.category) {
      case 'file':
        return (
          <FileSourceConfig
            config={config}
            resources={resources}
            onConfigChange={onConfigChange}
            errors={validation.errors}
          />
        );

      case 'database':
        return (
          <DatabaseSourceConfig
            config={config}
            resources={resources}
            onConfigChange={onConfigChange}
            errors={validation.errors}
          />
        );

      case 'api':
        return (
          <ApiSourceConfig
            config={config}
            resources={resources}
            onConfigChange={onConfigChange}
            errors={validation.errors}
          />
        );

      case 'stream':
        return (
          <StreamSourceConfig
            config={config}
            resources={resources}
            onConfigChange={onConfigChange}
            errors={validation.errors}
          />
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            No configuration available for {node.data.category} source.
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Source Configuration
        </h3>
        <p className="text-sm text-gray-500">
          Configure where data will be sourced from in this pipeline.
        </p>
      </div>
      
      {renderCategoryConfig()}
    </div>
  );
}