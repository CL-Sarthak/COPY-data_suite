import { NodeConfig } from './types';

export function validateNodeConfig(nodeType: string, config: NodeConfig): Record<string, string> {
  const errors: Record<string, string> = {};

  switch (nodeType) {
    case 'data':
    case 'source':
      if (config.type === 'database') {
        if (!config.connectionString) {
          errors.connectionString = 'Connection string is required';
        }
        if (!config.query && !config.table) {
          errors.query = 'Query or table name is required';
        }
      } else if (config.type === 'api' || !config.type) {
        if (!config.endpoint) {
          errors.endpoint = 'API endpoint is required';
        } else if (!isValidUrl(String(config.endpoint))) {
          errors.endpoint = 'Please enter a valid URL';
        }
        if (!config.method) {
          errors.method = 'HTTP method is required';
        }
      } else if (config.type === 'file') {
        if (!config.path) {
          errors.path = 'File path is required';
        }
      }
      break;

    case 'transform':
      if (config.transformType === 'custom') {
        if (!config.script) {
          errors.script = 'Transform script is required';
        }
      } else if (config.transformType === 'map') {
        if (!config.mappings) {
          errors.mappings = 'Field mappings are required';
        } else {
          try {
            JSON.parse(String(config.mappings));
          } catch {
            errors.mappings = 'Mappings must be valid JSON';
          }
        }
      } else if (config.transformType === 'filter') {
        if (!config.filterExpression) {
          errors.filterExpression = 'Filter expression is required';
        }
      } else if (config.transformType === 'aggregate') {
        if (!config.groupBy) {
          errors.groupBy = 'Group by fields are required';
        }
        if (!config.aggregations) {
          errors.aggregations = 'Aggregations are required';
        }
      }
      break;

    case 'privacy':
      if (!config.patterns || !Array.isArray(config.patterns) || config.patterns.length === 0) {
        errors.patterns = 'At least one privacy pattern is required';
      }
      if (config.action === 'mask' && !config.maskPattern) {
        errors.maskPattern = 'Mask pattern is required';
      }
      if (config.action === 'encrypt' && !config.encryptionKey) {
        errors.encryptionKey = 'Encryption key is required';
      }
      break;

    case 'output':
      if (!config.format) {
        errors.format = 'Output format is required';
      }
      if (['json', 'csv', 'excel'].includes(String(config.format || '')) && !config.destination) {
        errors.destination = 'Destination file path is required';
      }
      if (config.format === 'database') {
        if (!config.connectionString) {
          errors.connectionString = 'Database connection string is required';
        }
        if (!config.tableName) {
          errors.tableName = 'Table name is required';
        }
      }
      if (['s3', 'azure', 'gcs'].includes(String(config.format || ''))) {
        if (!config.bucket) {
          errors.bucket = 'Bucket/container name is required';
        }
        if (!config.path) {
          errors.path = 'Path/key is required';
        }
      }
      break;
  }

  return errors;
}

export function getDefaultNodeConfig(nodeType: string): NodeConfig {
  switch (nodeType) {
    case 'data':
    case 'source':
      return {
        type: 'database',
        connectionString: '',
        query: ''
      };

    case 'transform':
      return {
        script: '',
        inputFields: [],
        outputFields: []
      };

    case 'privacy':
      return {
        patterns: [],
        action: 'redact'
      };

    case 'output':
      return {
        format: 'json',
        destination: '',
        options: {}
      };

    default:
      return {};
  }
}

export function isConfigValid(nodeType: string, config: NodeConfig): boolean {
  const errors = validateNodeConfig(nodeType, config);
  return Object.keys(errors).length === 0;
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}