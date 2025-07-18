import { useState, useEffect, useCallback } from 'react';
import { PipelineNode } from '@/types/pipeline';
import { NodeConfigurationState, NodeConfig } from '../types/configuration.types';
import { nodeValidationService } from '../services/nodeValidationService';

export function useNodeConfiguration(
  node: PipelineNode | null,
  onSave: (config: NodeConfig) => void,
  onClose: () => void
) {
  const [state, setState] = useState<NodeConfigurationState>({
    config: {},
    validation: { isValid: true, errors: {} }
  });

  // Initialize config when node changes
  useEffect(() => {
    if (node) {
      const initialConfig = (node.data.config || {}) as NodeConfig;
      setState({
        config: initialConfig,
        validation: nodeValidationService.validate(node, initialConfig)
      });
    }
  }, [node]);

  // Update configuration
  const updateConfig = useCallback((updates: NodeConfig) => {
    setState(prev => {
      const newConfig = { ...prev.config, ...updates };
      const validation = nodeValidationService.validate(node, newConfig);
      return {
        config: newConfig,
        validation
      };
    });
  }, [node]);

  // Handle save
  const handleSave = useCallback(() => {
    if (state.validation.isValid) {
      onSave(state.config);
      onClose();
    }
  }, [state, onSave, onClose]);

  // Handle reset
  const handleReset = useCallback(() => {
    if (node) {
      const originalConfig = (node.data.config || {}) as NodeConfig;
      setState({
        config: originalConfig,
        validation: nodeValidationService.validate(node, originalConfig)
      });
    }
  }, [node]);

  return {
    config: state.config,
    validation: state.validation,
    updateConfig,
    handleSave,
    handleReset
  };
}