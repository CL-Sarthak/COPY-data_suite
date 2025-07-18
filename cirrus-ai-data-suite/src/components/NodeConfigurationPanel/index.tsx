import React from 'react';
import { ConfigurationPanelProps } from './types/configuration.types';
import { useNodeConfiguration } from './hooks/useNodeConfiguration';
import { useConfigurationResources } from './hooks/useConfigurationResources';
import { ConfigurationModal } from './components/ConfigurationModal';
import { ResourceLoader } from './components/ResourceLoader';
import { ValidationErrors } from './components/ValidationErrors';
import {
  SourceNodeConfig,
  TransformNodeConfig,
  PrivacyNodeConfig,
  OutputNodeConfig
} from './components/NodeTypeConfigurations';

export function NodeConfigurationPanel({
  isOpen,
  node,
  onClose,
  onSave
}: ConfigurationPanelProps) {
  const { resources, retry } = useConfigurationResources();
  const {
    config,
    validation,
    updateConfig,
    handleSave,
    handleReset
  } = useNodeConfiguration(node, onSave, onClose);

  const renderNodeConfiguration = () => {
    if (!node) return null;

    switch (node.data.nodeType || 'custom') {
      case 'source':
        return (
          <SourceNodeConfig
            node={node}
            config={config}
            resources={resources}
            validation={validation}
            onConfigChange={updateConfig}
          />
        );

      case 'privacy':
        return (
          <PrivacyNodeConfig
            config={config}
            errors={validation.errors}
            onChange={updateConfig}
            resources={resources}
          />
        );

      case 'transform':
        return (
          <TransformNodeConfig
            config={config}
            errors={validation.errors}
            onChange={updateConfig}
            resources={{
              fields: []  // TODO: Extract fields from selected data source
            }}
          />
        );

      case 'output':
        return (
          <OutputNodeConfig
            config={config}
            errors={validation.errors}
            onChange={updateConfig}
          />
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            No configuration available for this node type.
          </div>
        );
    }
  };

  return (
    <ConfigurationModal
      isOpen={isOpen}
      node={node}
      onClose={onClose}
      canSave={validation.isValid}
      onSave={handleSave}
      onReset={handleReset}
    >
      <ResourceLoader
        isLoading={resources.isLoading}
        error={resources.error}
        onRetry={retry}
      >
        <ValidationErrors errors={validation.errors} />
        {renderNodeConfiguration()}
      </ResourceLoader>
    </ConfigurationModal>
  );
}

// Export the component as default for backward compatibility
export default NodeConfigurationPanel;