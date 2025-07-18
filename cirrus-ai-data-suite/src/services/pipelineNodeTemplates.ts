/**
 * Pipeline Node Templates
 * Defines predefined node types and their configurations for the pipeline builder
 */

import { NodeTemplate, NodeType } from '@/types/pipeline';

export class PipelineNodeTemplates {
  
  private static readonly SOURCE_TEMPLATES: NodeTemplate[] = [
    {
      type: 'source',
      category: 'file',
      name: 'File Upload',
      description: 'Upload and process files (CSV, JSON, Excel)',
      icon: 'DocumentIcon',
      color: '#3b82f6',
      defaultConfig: {
        dataSourceId: '', // Will be populated from existing data sources
        includeTransformed: true, // Use already-transformed JSON
        fieldMappings: '', // Apply existing field mappings from global catalog
        autoProfile: true, // Run quality analysis
        fileTypes: ['csv', 'json', 'xlsx'],
        maxFileSize: '10MB',
        encoding: 'utf-8'
      },
      inputs: [],
      outputs: [
        {
          id: 'data',
          name: 'Raw Data',
          type: 'file',
          description: 'Raw file content'
        }
      ],
      configSchema: {
        type: 'object',
        properties: {
          fileTypes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Allowed file types'
          },
          maxFileSize: {
            type: 'string',
            description: 'Maximum file size'
          }
        }
      }
    },
    {
      type: 'source',
      category: 'database',
      name: 'Database Query',
      description: 'Execute SQL queries against connected databases',
      icon: 'CircleStackIcon',
      color: '#059669',
      defaultConfig: {
        query: 'SELECT * FROM table_name LIMIT 100',
        timeout: 30000,
        batchSize: 1000
      },
      inputs: [],
      outputs: [
        {
          id: 'data',
          name: 'Query Results',
          type: 'database',
          description: 'Database query results'
        }
      ]
    },
    {
      type: 'source',
      category: 'api',
      name: 'REST API',
      description: 'Fetch data from REST APIs',
      icon: 'CloudIcon',
      color: '#7c3aed',
      defaultConfig: {
        url: '',
        method: 'GET',
        headers: {},
        timeout: 30000
      },
      inputs: [],
      outputs: [
        {
          id: 'data',
          name: 'API Response',
          type: 'api',
          description: 'API response data'
        }
      ]
    }
  ];

  private static readonly TRANSFORM_TEMPLATES: NodeTemplate[] = [
    {
      type: 'transform',
      category: 'format',
      name: 'Data Format Converter',
      description: 'Convert between CSV, JSON, and other formats',
      icon: 'ArrowsRightLeftIcon',
      color: '#dc2626',
      defaultConfig: {
        outputFormat: 'json',
        preserveTypes: true,
        dateFormat: 'ISO8601'
      },
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'any',
          required: true,
          description: 'Data to convert'
        }
      ],
      outputs: [
        {
          id: 'output',
          name: 'Converted Data',
          type: 'json',
          description: 'Converted data in target format'
        }
      ]
    },
    {
      type: 'transform',
      category: 'filter',
      name: 'Data Filter',
      description: 'Filter rows based on conditions',
      icon: 'FunnelIcon',
      color: '#ea580c',
      defaultConfig: {
        conditions: [],
        operator: 'AND'
      },
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'any',
          required: true,
          description: 'Data to filter'
        }
      ],
      outputs: [
        {
          id: 'output',
          name: 'Filtered Data',
          type: 'any',
          description: 'Filtered dataset'
        }
      ]
    },
    {
      type: 'transform',
      category: 'mapping',
      name: 'Field Mapper',
      description: 'Map and transform field names and values',
      icon: 'ArrowsPointingOutIcon',
      color: '#0891b2',
      defaultConfig: {
        catalogMappingId: '', // Apply existing field mappings from global catalog
        mappings: {}, // Custom field mappings
        dropUnmapped: false,
        validateDataTypes: true,
        preserveLineage: true // Track data lineage for compliance
      },
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'any',
          required: true,
          description: 'Data to map'
        }
      ],
      outputs: [
        {
          id: 'output',
          name: 'Mapped Data',
          type: 'any',
          description: 'Data with mapped fields'
        }
      ]
    },
    {
      type: 'transform',
      category: 'aggregate',
      name: 'Data Aggregator',
      description: 'Group and aggregate data (sum, count, average)',
      icon: 'ChartBarIcon',
      color: '#7c2d12',
      defaultConfig: {
        groupBy: [],
        aggregations: []
      },
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'any',
          required: true,
          description: 'Data to aggregate'
        }
      ],
      outputs: [
        {
          id: 'output',
          name: 'Aggregated Data',
          type: 'any',
          description: 'Aggregated results'
        }
      ]
    }
  ];

  private static readonly ANALYZE_TEMPLATES: NodeTemplate[] = [
    {
      type: 'analyze',
      category: 'profiling',
      name: 'Data Profiler',
      description: 'Analyze data quality and generate statistics',
      icon: 'ChartPieIcon',
      color: '#059669',
      defaultConfig: {
        includeNulls: true,
        generateSamples: true,
        maxSampleSize: 1000
      },
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'any',
          required: true,
          description: 'Data to profile'
        }
      ],
      outputs: [
        {
          id: 'profile',
          name: 'Data Profile',
          type: 'report',
          description: 'Data quality and statistics report'
        }
      ]
    },
    {
      type: 'analyze',
      category: 'validation',
      name: 'Data Validator',
      description: 'Validate data against business rules',
      icon: 'ShieldCheckIcon',
      color: '#dc2626',
      defaultConfig: {
        rules: [],
        strictMode: false,
        generateReport: true
      },
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'any',
          required: true,
          description: 'Data to validate'
        }
      ],
      outputs: [
        {
          id: 'valid',
          name: 'Valid Data',
          type: 'any',
          description: 'Data that passed validation'
        },
        {
          id: 'invalid',
          name: 'Invalid Data',
          type: 'any',
          description: 'Data that failed validation'
        },
        {
          id: 'report',
          name: 'Validation Report',
          type: 'report',
          description: 'Validation results and errors'
        }
      ]
    }
  ];

  private static readonly PRIVACY_TEMPLATES: NodeTemplate[] = [
    {
      type: 'privacy',
      category: 'detection',
      name: 'PII Detector',
      description: 'Detect personally identifiable information',
      icon: 'EyeIcon',
      color: '#dc2626',
      defaultConfig: {
        patternIds: [], // References to existing pattern library patterns
        confidenceThreshold: 0.8, // User-configured threshold
        contextualAnalysis: true, // Use relationship detection
        complianceFramework: 'GDPR', // Apply compliance rules
        patterns: ['ssn', 'email', 'phone', 'credit_card'], // Fallback patterns
        includeContext: true
      },
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'any',
          required: true,
          description: 'Data to scan for PII'
        }
      ],
      outputs: [
        {
          id: 'detected',
          name: 'PII Detections',
          type: 'report',
          description: 'Detected PII patterns and locations'
        }
      ]
    },
    {
      type: 'privacy',
      category: 'redaction',
      name: 'Data Redactor',
      description: 'Redact or mask sensitive information',
      icon: 'EyeSlashIcon',
      color: '#7c2d12',
      defaultConfig: {
        redactionType: 'mask',
        maskCharacter: '*',
        preserveFormat: true
      },
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'any',
          required: true,
          description: 'Data to redact'
        },
        {
          id: 'patterns',
          name: 'PII Patterns',
          type: 'report',
          required: false,
          description: 'Detected PII patterns'
        }
      ],
      outputs: [
        {
          id: 'output',
          name: 'Redacted Data',
          type: 'any',
          description: 'Data with sensitive information redacted'
        }
      ]
    },
    {
      type: 'privacy',
      category: 'synthetic',
      name: 'Synthetic Generator',
      description: 'Generate synthetic data preserving statistical properties',
      icon: 'SparklesIcon',
      color: '#7c3aed',
      defaultConfig: {
        templateName: '', // Use existing synthetic data template
        preserveDistribution: true, // User-configured settings
        recordCount: 10000, // Assembly target requirements
        outputFormat: 'json', // Target environment format
        maintainRelationships: true,
        anonymizationLevel: 'high' // Privacy preservation level
      },
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'any',
          required: true,
          description: 'Source data for synthesis'
        }
      ],
      outputs: [
        {
          id: 'output',
          name: 'Synthetic Data',
          type: 'any',
          description: 'Generated synthetic dataset'
        }
      ]
    }
  ];

  private static readonly OUTPUT_TEMPLATES: NodeTemplate[] = [
    {
      type: 'output',
      category: 'file',
      name: 'File Export',
      description: 'Export data to files (CSV, JSON, Excel)',
      icon: 'ArrowDownTrayIcon',
      color: '#059669',
      defaultConfig: {
        format: 'csv',
        filename: 'export_{timestamp}',
        compression: false
      },
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'any',
          required: true,
          description: 'Data to export'
        }
      ],
      outputs: []
    },
    {
      type: 'output',
      category: 'database',
      name: 'Database Writer',
      description: 'Write data to database tables',
      icon: 'CircleStackIcon',
      color: '#0891b2',
      defaultConfig: {
        table: '',
        mode: 'insert',
        batchSize: 1000
      },
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'any',
          required: true,
          description: 'Data to write'
        }
      ],
      outputs: []
    },
    {
      type: 'output',
      category: 'api',
      name: 'API Publisher',
      description: 'Send data to external APIs',
      icon: 'PaperAirplaneIcon',
      color: '#7c3aed',
      defaultConfig: {
        url: '',
        method: 'POST',
        headers: {},
        batchSize: 100
      },
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'any',
          required: true,
          description: 'Data to send'
        }
      ],
      outputs: []
    },
    {
      type: 'output',
      category: 'environment',
      name: 'Environment Deploy',
      description: 'Deploy data to configured target environments',
      icon: 'CloudIcon',
      color: '#059669',
      defaultConfig: {
        environmentId: '', // Target environment from environments page
        deploymentStrategy: 'blue_green', // Deployment method
        qualityGates: ['schema_validation'], // Quality checks before deployment
        notificationChannels: [], // Alert channels for deployment status
        dataRetention: '90d', // Data retention policy
        encryptionLevel: 'AES256' // Security requirements
      },
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'any',
          required: true,
          description: 'Data to deploy'
        }
      ],
      outputs: []
    },
    {
      type: 'output',
      category: 'ml',
      name: 'ML Training Data',
      description: 'Format data for machine learning training pipelines',
      icon: 'SparklesIcon',
      color: '#7c3aed',
      defaultConfig: {
        framework: 'tensorflow', // ML framework compatibility
        format: 'tfrecord', // Training data format
        splitRatio: { train: 0.7, validation: 0.2, test: 0.1 }, // Data splits
        featureEngineering: true, // Apply automated feature engineering
        dataValidation: true, // Validate data quality for ML
        versionControl: true // Track dataset versions
      },
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'any',
          required: true,
          description: 'Data to prepare for ML training'
        }
      ],
      outputs: []
    }
  ];

  private static readonly CONTROL_TEMPLATES: NodeTemplate[] = [
    {
      type: 'control',
      category: 'flow',
      name: 'Conditional Branch',
      description: 'Route data based on conditions',
      icon: 'ArrowsUpDownIcon',
      color: '#6b7280',
      defaultConfig: {
        condition: '',
        operator: 'equals'
      },
      inputs: [
        {
          id: 'input',
          name: 'Input Data',
          type: 'any',
          required: true,
          description: 'Data to route'
        }
      ],
      outputs: [
        {
          id: 'true',
          name: 'True Branch',
          type: 'any',
          description: 'Data when condition is true'
        },
        {
          id: 'false',
          name: 'False Branch',
          type: 'any',
          description: 'Data when condition is false'
        }
      ]
    },
    {
      type: 'control',
      category: 'flow',
      name: 'Data Merger',
      description: 'Combine data from multiple sources',
      icon: 'ArrowsPointingInIcon',
      color: '#6b7280',
      defaultConfig: {
        mergeStrategy: 'union',
        deduplication: false
      },
      inputs: [
        {
          id: 'input1',
          name: 'Input 1',
          type: 'any',
          required: true,
          description: 'First data source'
        },
        {
          id: 'input2',
          name: 'Input 2',
          type: 'any',
          required: true,
          description: 'Second data source'
        }
      ],
      outputs: [
        {
          id: 'output',
          name: 'Merged Data',
          type: 'any',
          description: 'Combined dataset'
        }
      ]
    }
  ];

  /**
   * Get all available node templates
   */
  static getAllTemplates(): NodeTemplate[] {
    return [
      ...this.SOURCE_TEMPLATES,
      ...this.TRANSFORM_TEMPLATES,
      ...this.ANALYZE_TEMPLATES,
      ...this.PRIVACY_TEMPLATES,
      ...this.OUTPUT_TEMPLATES,
      ...this.CONTROL_TEMPLATES
    ];
  }

  /**
   * Get templates by node type
   */
  static getTemplatesByType(type: NodeType): NodeTemplate[] {
    switch (type) {
      case 'source':
        return [...this.SOURCE_TEMPLATES];
      case 'transform':
        return [...this.TRANSFORM_TEMPLATES];
      case 'analyze':
        return [...this.ANALYZE_TEMPLATES];
      case 'privacy':
        return [...this.PRIVACY_TEMPLATES];
      case 'output':
        return [...this.OUTPUT_TEMPLATES];
      case 'control':
        return [...this.CONTROL_TEMPLATES];
      default:
        return [];
    }
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(category: string): NodeTemplate[] {
    return this.getAllTemplates().filter(template => template.category === category);
  }

  /**
   * Get template by name
   */
  static getTemplateByName(name: string): NodeTemplate | undefined {
    return this.getAllTemplates().find(template => template.name === name);
  }

  /**
   * Get all unique categories
   */
  static getCategories(): string[] {
    const categories = new Set<string>();
    this.getAllTemplates().forEach(template => categories.add(template.category));
    return Array.from(categories).sort();
  }

  /**
   * Create a new pipeline node from template
   */
  static createNodeFromTemplate(
    template: NodeTemplate,
    position: { x: number; y: number },
    id?: string
  ) {
    return {
      id: id || `${template.type}_${Date.now()}`,
      type: template.type,
      position,
      data: {
        label: template.name,
        description: template.description,
        category: template.category,
        icon: template.icon,
        color: template.color,
        config: { ...template.defaultConfig },
        inputs: [...template.inputs],
        outputs: [...template.outputs],
        metadata: {
          templateName: template.name
        }
      }
    };
  }

  /**
   * Validate node configuration against template schema
   */
  static validateNodeConfig(template: NodeTemplate, config: Record<string, unknown>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!template.configSchema) {
      return { isValid: true, errors: [] };
    }

    // Basic validation - in a real implementation, use a JSON Schema validator
    if (template.configSchema.required) {
      const required = template.configSchema.required as string[];
      for (const field of required) {
        if (!(field in config)) {
          errors.push(`Required field '${field}' is missing`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}