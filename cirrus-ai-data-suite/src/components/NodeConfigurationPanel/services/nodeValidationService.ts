import { PipelineNode } from '@/types/pipeline';
import { ValidationState, NodeConfig } from '../types/configuration.types';

export const nodeValidationService = {
  validate(node: PipelineNode | null, config: NodeConfig): ValidationState {
    if (!node) {
      return { isValid: false, errors: {} };
    }

    const errors: Record<string, string> = {};
    let isValid = true;

    switch (node.data.nodeType || 'custom') {
      case 'source':
        const sourceErrors = this.validateSourceNode(node, config);
        Object.assign(errors, sourceErrors);
        isValid = Object.keys(sourceErrors).length === 0;
        break;

      case 'privacy':
        const privacyErrors = this.validatePrivacyNode(node, config);
        Object.assign(errors, privacyErrors);
        isValid = Object.keys(privacyErrors).length === 0;
        break;

      case 'transform':
        const transformErrors = this.validateTransformNode(node, config);
        Object.assign(errors, transformErrors);
        isValid = Object.keys(transformErrors).length === 0;
        break;

      case 'output':
        const outputErrors = this.validateOutputNode(node, config);
        Object.assign(errors, outputErrors);
        isValid = Object.keys(outputErrors).length === 0;
        break;

      default:
        isValid = true;
    }

    return { isValid, errors };
  },

  validateSourceNode(node: PipelineNode, config: NodeConfig): Record<string, string> {
    const errors: Record<string, string> = {};

    switch (node.data.category) {
      case 'file':
        if (!config.dataSourceId) {
          errors.dataSourceId = 'Please select a data source';
        }
        break;

      case 'database':
        if (!config.connectionString) {
          errors.connectionString = 'Database connection string is required';
        }
        if (!config.table) {
          errors.table = 'Table name is required';
        }
        break;

      case 'api':
        if (!config.endpoint) {
          errors.endpoint = 'API endpoint is required';
        }
        if (!config.method) {
          errors.method = 'HTTP method is required';
        }
        break;

      case 'stream':
        if (!config.topic) {
          errors.topic = 'Stream topic is required';
        }
        break;
    }

    return errors;
  },

  validatePrivacyNode(node: PipelineNode, config: NodeConfig): Record<string, string> {
    const errors: Record<string, string> = {};

    switch (node.data.category) {
      case 'detection':
        if (!config.patterns || (Array.isArray(config.patterns) && config.patterns.length === 0)) {
          errors.patterns = 'At least one pattern must be selected';
        }
        break;

      case 'redaction':
        if (!config.method) {
          errors.method = 'Redaction method is required';
        }
        break;

      case 'synthetic':
        if (!config.template) {
          errors.template = 'Synthetic data template is required';
        }
        if (!config.count || Number(config.count) < 1) {
          errors.count = 'Record count must be at least 1';
        }
        break;

      case 'anonymization':
        if (!config.level) {
          errors.level = 'Anonymization level is required';
        }
        break;
    }

    return errors;
  },

  validateTransformNode(node: PipelineNode, config: NodeConfig): Record<string, string> {
    const errors: Record<string, string> = {};

    switch (node.data.category) {
      case 'filter':
        if (!config.condition) {
          errors.condition = 'Filter condition is required';
        }
        break;

      case 'aggregate':
        if (!config.groupBy || (Array.isArray(config.groupBy) && config.groupBy.length === 0)) {
          errors.groupBy = 'Group by fields are required';
        }
        if (!config.aggregations || (Array.isArray(config.aggregations) && config.aggregations.length === 0)) {
          errors.aggregations = 'At least one aggregation is required';
        }
        break;

      case 'join':
        if (!config.joinType) {
          errors.joinType = 'Join type is required';
        }
        if (!config.leftKey) {
          errors.leftKey = 'Left join key is required';
        }
        if (!config.rightKey) {
          errors.rightKey = 'Right join key is required';
        }
        break;

      case 'enrich':
        if (!config.enrichmentSource) {
          errors.enrichmentSource = 'Enrichment source is required';
        }
        break;
    }

    return errors;
  },

  validateOutputNode(node: PipelineNode, config: NodeConfig): Record<string, string> {
    const errors: Record<string, string> = {};

    switch (node.data.category) {
      case 'file':
        if (!config.format) {
          errors.format = 'Output format is required';
        }
        if (!config.path) {
          errors.path = 'Output path is required';
        }
        break;

      case 'database':
        if (!config.connectionString) {
          errors.connectionString = 'Database connection string is required';
        }
        if (!config.table) {
          errors.table = 'Output table name is required';
        }
        break;

      case 'api':
        if (!config.endpoint) {
          errors.endpoint = 'API endpoint is required';
        }
        if (!config.method) {
          errors.method = 'HTTP method is required';
        }
        break;

      case 'stream':
        if (!config.topic) {
          errors.topic = 'Output topic is required';
        }
        break;
    }

    return errors;
  }
};