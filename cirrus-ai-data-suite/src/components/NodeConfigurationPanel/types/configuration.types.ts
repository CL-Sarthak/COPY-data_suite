import { PipelineNode } from '@/types/pipeline';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { PatternEntity } from '@/entities/PatternEntity';

// Node configuration value types
export type ConfigValue = string | number | boolean | null | undefined | ConfigValue[] | { [key: string]: ConfigValue };

// Node configuration object
export interface NodeConfig {
  [key: string]: ConfigValue;
}

export interface ConfigurationPanelProps {
  isOpen: boolean;
  node: PipelineNode | null;
  onClose: () => void;
  onSave: (config: NodeConfig) => void;
}

export interface NodeConfigurationState {
  config: NodeConfig;
  validation: ValidationState;
}

export interface ValidationState {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface ConfigurationResources {
  dataSources: DataSourceEntity[];
  patterns: PatternEntity[];
  syntheticTemplates: Record<string, unknown>;
  isLoading: boolean;
  error: string | null;
}

export interface NodeTypeConfigProps {
  node: PipelineNode;
  config: NodeConfig;
  resources: ConfigurationResources;
  validation: ValidationState;
  onConfigChange: (updates: NodeConfig) => void;
}

export interface CategoryConfigProps {
  config: NodeConfig;
  resources: ConfigurationResources;
  onConfigChange: (updates: NodeConfig) => void;
  errors?: Record<string, string>;
}