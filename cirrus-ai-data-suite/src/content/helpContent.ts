import { HelpContent } from '@/components/HelpSystem';

export const helpContent = {
  dashboard: {
    title: 'Dashboard Help',
    sections: [
      {
        heading: 'Overview',
        content: 'The Dashboard provides a high-level overview of your data preparation activities, showing key metrics and recent activity across all your data sources.',
        tips: [
          'Check the dashboard regularly to monitor your data processing progress',
          'Use the quick actions to navigate to commonly used features',
          'Review data quality metrics to identify sources that need attention'
        ]
      },
      {
        heading: 'Key Metrics',
        content: 'The dashboard displays important statistics including total data sources connected, records processed, patterns defined, and recent transformations.',
        steps: [
          'Total Sources: Number of connected data sources',
          'Records Processed: Total records across all sources', 
          'Active Patterns: Number of defined sensitive data patterns',
          'Recent Activity: Latest transformations and activities'
        ]
      },
      {
        heading: 'Quick Actions',
        content: 'Use the action buttons to quickly access common tasks without navigating through multiple pages.',
        tips: [
          'Click "Add Data Source" to quickly connect new data',
          'Use "Create Pattern" to define new sensitive data patterns',
          'Access "View Catalog" to explore your transformed data'
        ]
      }
    ]
  } as HelpContent,

  discovery: {
    title: 'Data Discovery Help',
    sections: [
      {
        heading: 'Overview',
        content: 'Data Discovery provides a comprehensive view of your data sources in a sortable table format. Connect files, databases, and cloud storage, then explore your data with inline previews and automatic JSON transformation.',
        tips: [
          'Start with local file uploads for quick testing',
          'Click any row to expand and see detailed previews',
          'Use tags to organize and filter your data sources',
          'Transform data sources to unlock advanced analysis features'
        ]
      },
      {
        heading: 'Table View & Navigation',
        content: 'The main interface displays data sources in a sortable table with inline expansion for detailed previews. Click column headers to sort, use tags to filter, and expand rows to explore content.',
        steps: [
          'Click column headers (Name, Status, Records, etc.) to sort data sources',
          'Use the tag filter to show only sources with specific tags',
          'Click the arrow icon (>) next to any row to expand and see details',
          'View both transformed JSON data and original file content in expanded rows',
          'Use the view toggles to switch between formatted and raw data views'
        ],
        tips: [
          'Sorting helps manage large numbers of data sources',
          'Tag filtering is useful for organizing sources by project or type',
          'Expanded previews show full-width content for better readability',
          'Large text documents automatically get full-width preview treatment'
        ]
      },
      {
        heading: 'Adding Data Sources',
        content: 'Connect various types of data sources including local files, databases, cloud storage, and APIs. Files are automatically transformed to JSON format upon upload.',
        steps: [
          'Click "Add Data Source" to open the connection dialog',
          'Select your data source type (Local Filesystem is recommended for beginners)',
          'Upload files or configure connection details',
          'Files are automatically processed and transformed to JSON',
          'Use tags to organize your sources during or after creation'
        ],
        tips: [
          'Supported file types: CSV, JSON, PDF, DOCX, TXT',
          'Multiple files can be uploaded together under one data source',
          'PDF and DOCX files have text automatically extracted',
          'Maximum file size: 10MB with external database, 4MB with in-memory storage',
          'Adding files to existing sources also triggers automatic transformation'
        ]
      },
      {
        heading: 'Data Previews & Toggles',
        content: 'Expanded rows show comprehensive data previews with toggle options for different viewing modes, optimized for both structured and unstructured content.',
        steps: [
          'Expand any data source row to see inline previews',
          'For transformed data: Use "Formatted/Raw JSON" toggle to switch views',
          'For text documents: Use "Preview/Full Text" toggle to see complete content',
          'Large documents automatically get full-width treatment for better readability',
          'Character counts and file types are displayed for reference'
        ],
        tips: [
          'Formatted view shows data in an easy-to-read grid layout',
          'Raw JSON view shows the exact data structure for technical users',
          'Full text mode is available for PDF, DOCX, and TXT files over 200 characters',
          'Preview mode shows first 500 characters with truncation indicator',
          'Both views utilize full screen width for maximum information density'
        ]
      },
      {
        heading: 'Tagging & Organization',
        content: 'Use tags to categorize and organize your data sources. Tags support filtering, color-coding, and quick identification of related sources.',
        steps: [
          'Click "Add tag" on any data source to create or assign tags',
          'Type to create new tags or select from existing ones',
          'Use the tag filter dropdown to show only sources with specific tags',
          'Tags are color-coded automatically for visual organization',
          'Remove tags by clicking the X on any tag'
        ],
        tips: [
          'Common tag examples: "production", "test", "personal-data", "financial"',
          'Tags help when managing many data sources across different projects',
          'Tag suggestions appear as you type based on existing tags',
          'Multiple tags can be applied to a single data source'
        ]
      },
      {
        heading: 'Data Transformation',
        content: 'Data is automatically transformed to unified JSON format upon upload. Manual transformation is available for viewing catalogs and accessing advanced features.',
        steps: [
          'Files are automatically transformed when uploaded or added to existing sources',
          'Click "View Catalog" button on transformed sources to see the full data catalog',
          'Use "Map Fields" to standardize field names across sources',
          'Analyze the schema to understand data relationships',
          'Export transformed data for use in other applications'
        ],
        tips: [
          'Automatic transformation happens immediately for most file types',
          'PDF and DOCX content is extracted and structured automatically',
          'View Catalog opens a detailed modal with export and save options',
          'Transformed data shows "JSON Ready" badge in the table'
        ],
        warnings: [
          'Large files may take longer to transform automatically',
          'PDF content limits may truncate very large documents for storage efficiency',
          'Transformation is required for advanced features like field mapping'
        ]
      },
      {
        heading: 'Managing Files & Sources',
        content: 'Easily manage your data sources with built-in tools for adding files, editing names, and organizing content.',
        steps: [
          'Click the folder icon on filesystem sources to add more files',
          'Click the pencil icon to edit data source names',
          'Click the trash icon to delete sources (with confirmation)',
          'Use the "Add Files" option to expand existing sources',
          'Added files are automatically transformed just like initial uploads'
        ],
        tips: [
          'Adding files to existing sources maintains the same organization',
          'File additions trigger automatic JSON transformation',
          'Source names can be updated to better reflect their contents',
          'Deleting a source removes all associated files and transformations'
        ]
      },
      {
        heading: 'Field Mapping',
        content: 'Map your data source fields to a global catalog schema for consistency across sources. This enables better pattern detection and data analysis.',
        steps: [
          'Ensure your data source is transformed (shows "JSON Ready" badge)',
          'Click the "Map" icon (map symbol) on transformed sources',
          'Review auto-suggested field mappings',
          'Use "Auto Map" for high-confidence suggestions',
          'Manually create or adjust mappings as needed',
          'Save your mappings for consistent data processing'
        ],
        tips: [
          'Auto-mapping works best with common field names like "email", "name", "address"',
          'Higher confidence scores indicate better automatic mapping suggestions',
          'Custom mappings can be created for unique field names in your data',
          'Field mapping is only available for transformed data sources'
        ]
      },
      {
        heading: 'Schema Analysis',
        content: 'Analyze the structure and relationships in your transformed data to better understand data quality and field relationships.',
        steps: [
          'Click the "Chart" icon on transformed data sources',
          'Review the Fields tab for field types and categories',
          'Check the Mappings tab for field mapping details',
          'Explore the Relationships tab for data connections'
        ]
      },
      {
        heading: 'AI-Powered Q&A',
        content: 'Ask questions about your data using natural language and get instant AI-powered insights. The AI can analyze patterns, calculate statistics, and help you understand your data better.',
        steps: [
          'Click the sparkles icon (✨) or "Ask AI about this data" button',
          'Type your question in natural language',
          'Toggle "Explain methodology" for detailed explanations',
          'Click Send or press Enter to get answers',
          'For large datasets, the AI may offer to fetch more data for accuracy',
          'Continue the conversation with follow-up questions'
        ],
        tips: [
          'Ask about averages, distributions, patterns, or specific values',
          'Questions like "What\'s the average age?" work great',
          'The AI remembers context, so you can ask follow-ups like "What about by state?"',
          'Enable "Explain methodology" to understand how calculations were done',
          'Conversations persist when you close and reopen the modal'
        ],
        warnings: [
          'Very large categorical data may be too complex to fully analyze',
          'The AI works with samples for initial answers, then can fetch full data',
          'Statistical calculations are performed server-side for accuracy'
        ]
      },
      {
        heading: 'AI Summaries',
        content: 'Generate AI-powered summaries of your data sources to quickly understand what each dataset contains.',
        steps: [
          'Expand any data source row in the table',
          'Look for the Data Summary section at the top',
          'Click "Generate with AI" to create an automatic summary',
          'Click "Edit" to modify the summary manually',
          'Click "Regenerate" to get a fresh AI summary',
          'Summaries help team members understand data without exploring it'
        ],
        tips: [
          'AI summaries analyze sample data and metadata',
          'Edit summaries to add business context or notes',
          'User-edited summaries show a "User Edited" badge',
          'Regenerating replaces the existing AI summary'
        ]
      }
    ]
  } as HelpContent,

  redaction: {
    title: 'Pattern Definition & Annotation Help',
    sections: [
      {
        heading: 'Overview',
        content: 'Define sensitive data patterns and annotate your data to identify information that needs protection. This page helps you create detection rules for PII, financial data, medical information, and classified content.',
        tips: [
          'Start with predefined patterns for common data types',
          'Use real examples from your data for better accuracy',
          'Test patterns thoroughly before deploying them'
        ]
      },
      {
        heading: 'Pattern Types',
        content: 'Different types of sensitive data require different detection approaches. Choose the appropriate pattern type for your data.',
        steps: [
          'PII (Personal Information): Names, emails, phone numbers, addresses',
          'Financial Data: Credit cards, bank accounts, tax IDs',
          'Medical/HIPAA: Medical records, insurance IDs, diagnosis codes',
          'Classification: Government classifications, proprietary information',
          'Custom: Your organization-specific sensitive data types'
        ]
      },
      {
        heading: 'Creating Patterns',
        content: 'Create new patterns by providing examples and optional regular expressions. The system can learn patterns from your examples.',
        steps: [
          'Click "New Pattern" to create a custom pattern',
          'Choose the appropriate pattern type and category',
          'Provide multiple examples of the sensitive data',
          'Add a regular expression if you know the format',
          'Test the pattern with sample text',
          'Save and activate the pattern'
        ],
        tips: [
          'Provide at least 3-5 examples for better pattern learning',
          'Include variations in formatting (e.g., with/without dashes for SSN)',
          'Test patterns with edge cases and false positives',
          'Regular expressions are optional - examples alone often work well'
        ]
      },
      {
        heading: 'Data Annotation',
        content: 'Annotate your actual data to train patterns and identify sensitive information. Select text and tag it with the appropriate pattern type.',
        steps: [
          'Click "Annotate Data" on any connected data source',
          'Select text in the document that contains sensitive data',
          'Choose the appropriate pattern type from the dropdown',
          'Click "Add Example" to train the pattern',
          'Continue annotating throughout the document',
          'Review highlighted matches to verify accuracy'
        ],
        tips: [
          'Annotate diverse examples from different parts of your documents',
          'Use the full text viewer for PDFs to see complete content',
          'Previously annotated patterns will be highlighted automatically',
          'Green highlights show existing examples, new annotations appear differently'
        ]
      },
      {
        heading: 'Smart Detection',
        content: 'Use AI-powered pattern detection to automatically identify sensitive data types in your content.',
        steps: [
          'Click "Smart Detection" to open the AI analysis tool',
          'Paste sample text or load from a data source',
          'Review the AI-detected patterns and confidence scores',
          'Accept suggestions to create new patterns automatically',
          'Refine patterns with additional examples as needed'
        ],
        warnings: [
          'AI detection requires a configured ML provider',
          'Review AI suggestions carefully before accepting',
          'Combine AI detection with manual annotation for best results'
        ]
      },
      {
        heading: 'Data Annotation',
        content: 'Annotate your data to identify sensitive information and train pattern detection. Works with large datasets through pagination.',
        steps: [
          'Select a data source and click "Annotate Data"',
          'Navigate through documents using arrow keys or pagination controls',
          'Select text and tag it with the appropriate pattern type',
          'Simple highlighting shows regex and example matches instantly',
          'Click "ML Detection" for advanced AI-powered pattern matching',
          'Review and refine detected patterns before continuing'
        ],
        tips: [
          'For large datasets (>10 records), pagination keeps the interface responsive',
          'Patterns with regex definitions highlight automatically without examples',
          'ML Detection provides more comprehensive matching but takes a few seconds',
          'The green "ML Active" indicator shows when AI detection is enabled',
          'Use the loading spinner to know when ML processing is running'
        ],
        warnings: [
          'Very large datasets are paginated to prevent browser crashes',
          'ML Detection requires defined pattern examples to work effectively',
          'Simple highlighting is instant but may miss complex patterns'
        ]
      },
      {
        heading: 'Pattern Testing',
        content: 'Test your patterns against sample text to verify they work correctly and adjust redaction styles.',
        steps: [
          'Select a pattern from the list',
          'Paste test text in the testing area',
          'Choose a redaction style (mask, replace, remove)',
          'Click "Test Match" to see results',
          'Review detected matches and confidence scores',
          'Adjust pattern examples if needed'
        ]
      }
    ]
  } as HelpContent,

  synthetic: {
    title: 'Synthetic Data Generation Help',
    sections: [
      {
        heading: 'Overview',
        content: 'Generate realistic synthetic data that maintains the statistical properties of your original data while protecting sensitive information. Perfect for testing, development, and sharing data safely.',
        tips: [
          'Use synthetic data for development and testing environments',
          'Verify that generated data matches your expected patterns',
          'Download synthetic datasets in multiple formats'
        ]
      },
      {
        heading: 'Creating Synthetic Data',
        content: 'Generate synthetic datasets based on your real data sources while preserving data relationships and statistical distributions.',
        steps: [
          'Select a data source to use as a template',
          'Choose the number of synthetic records to generate',
          'Configure field-specific generation rules if needed',
          'Click "Generate" to create the synthetic dataset',
          'Review the generated data for quality and accuracy',
          'Download or save the synthetic dataset'
        ],
        warnings: [
          'Synthetic data generation may take several minutes for large datasets',
          'Always review generated data to ensure it meets your requirements',
          'Some complex data relationships may not be perfectly preserved'
        ]
      },
      {
        heading: 'Generation Templates',
        content: 'Use pre-built templates for common data types or create custom templates for your specific needs.',
        tips: [
          'Templates ensure consistent data generation across projects',
          'Customize templates to match your organization\'s data patterns',
          'Save successful configurations as templates for reuse'
        ]
      }
    ]
  } as HelpContent,

  quality: {
    title: 'Data Quality Help',
    sections: [
      {
        heading: 'Overview',
        content: 'Monitor and assess the quality of your data sources with automated quality checks, validation rules, and quality metrics.',
        tips: [
          'Regular quality checks help maintain data integrity',
          'Set up automated quality monitoring for critical data sources',
          'Address quality issues before they impact downstream processes'
        ]
      },
      {
        heading: 'Quality Metrics',
        content: 'Understand the various quality dimensions that are measured for your data sources.',
        steps: [
          'Completeness: Percentage of non-null values in each field',
          'Consistency: Data format and value consistency across records',
          'Accuracy: Validity of data values against expected patterns',
          'Uniqueness: Detection of duplicate records or values',
          'Timeliness: Freshness and currency of the data'
        ]
      },
      {
        heading: 'Quality Rules',
        content: 'Define custom quality rules and validation checks for your specific data requirements.',
        steps: [
          'Create validation rules for critical fields',
          'Set acceptable thresholds for quality metrics',
          'Configure automated alerts for quality issues',
          'Review and update rules as data requirements change'
        ]
      }
    ]
  } as HelpContent,

  compliance: {
    title: 'Compliance Management Help',
    sections: [
      {
        heading: 'Overview',
        content: 'Manage compliance with data protection regulations including GDPR, HIPAA, SOX, and other privacy laws. Track data lineage and ensure proper data handling.',
        warnings: [
          'Compliance requirements vary by jurisdiction and industry',
          'Consult with legal experts for specific compliance needs',
          'Regular audits are essential for maintaining compliance'
        ]
      },
      {
        heading: 'Regulation Support',
        content: 'The platform supports various data protection regulations with specific features and controls.',
        steps: [
          'GDPR: Right to be forgotten, data portability, consent management',
          'HIPAA: Protected health information handling and audit trails',
          'SOX: Financial data controls and audit requirements',
          'CCPA: California privacy rights and data subject requests',
          'Custom: Define your own compliance requirements'
        ]
      },
      {
        heading: 'Data Lineage',
        content: 'Track how data flows through your systems and transformations to ensure compliance and enable impact analysis.',
        tips: [
          'Data lineage helps with compliance audits',
          'Use lineage tracking to understand data dependencies',
          'Maintain lineage records for regulatory requirements'
        ]
      }
    ]
  } as HelpContent,

  assembly: {
    title: 'Data Assembly Help',
    sections: [
      {
        heading: 'Overview',
        content: 'Combine and merge data from multiple sources into unified datasets. Handle data conflicts, resolve duplicates, and create comprehensive data views.',
        tips: [
          'Map fields consistently before assembly',
          'Review merge conflicts carefully',
          'Test assembled datasets before production use'
        ]
      },
      {
        heading: 'Data Merging',
        content: 'Merge datasets based on common keys and resolve conflicts between overlapping data.',
        steps: [
          'Select data sources to merge',
          'Define merge keys and relationships',
          'Configure conflict resolution rules',
          'Execute the merge operation',
          'Review and validate the merged dataset'
        ]
      },
      {
        heading: 'Conflict Resolution',
        content: 'Handle conflicts when the same data exists in multiple sources with different values.',
        tips: [
          'Choose appropriate conflict resolution strategies',
          'Consider data source reliability and recency',
          'Document resolution decisions for audit trails'
        ]
      }
    ]
  } as HelpContent,

  environments: {
    title: 'Environment Management Help',
    sections: [
      {
        heading: 'Overview',
        content: 'Manage different deployment environments (development, staging, production) with environment-specific configurations and data controls.',
        tips: [
          'Use separate environments for different stages of development',
          'Apply appropriate security controls for each environment',
          'Maintain consistent configurations across environments'
        ]
      },
      {
        heading: 'Environment Types',
        content: 'Different environments serve different purposes in your data preparation workflow.',
        steps: [
          'Development: For building and testing new features',
          'Staging: For final testing before production deployment',
          'Production: For live data processing and user access',
          'Sandbox: For experimentation and training'
        ]
      },
      {
        heading: 'Configuration Management',
        content: 'Manage environment-specific settings, security policies, and access controls.',
        warnings: [
          'Never use production data in development environments',
          'Implement proper access controls for each environment',
          'Regular backup and disaster recovery planning is essential'
        ]
      }
    ]
  } as HelpContent,

  catalog: {
    title: 'Global Catalog Help',
    sections: [
      {
        heading: 'Overview',
        content: 'The Global Catalog defines standardized field definitions that all data sources can map to. This ensures consistent field naming and validation across your entire data preparation pipeline.',
        tips: [
          'Start by reviewing the 26 pre-defined standard fields',
          'Use categories to organize fields logically',
          'Add custom fields for domain-specific data requirements',
          'Export your catalog for backup or sharing with team members'
        ]
      },
      {
        heading: 'Standard vs Custom Fields',
        content: 'The catalog contains both standard fields (pre-defined) and custom fields (user-created). Standard fields provide common data types across industries.',
        steps: [
          'Standard Fields: 26 pre-defined fields covering identity, contact, location, financial, temporal, business, and technical data',
          'Custom Fields: User-defined fields for specific business requirements',
          'Field Categories: Organize fields into logical groups for easier management',
          'Field Validation: Define data type rules, patterns, and constraints'
        ]
      },
      {
        heading: 'Field Management',
        content: 'Create, edit, and organize catalog fields to match your data requirements.',
        tips: [
          'Use snake_case for field names (e.g., first_name, email_address)',
          'Choose appropriate data types (string, number, date, email, etc.)',
          'Add descriptive display names and descriptions',
          'Use tags for searchability and organization',
          'Set validation rules to ensure data quality'
        ]
      },
      {
        heading: 'Categories & Organization',
        content: 'Fields are organized into 8 categories to help with discovery and management.',
        steps: [
          'Identity & Personal: Names, IDs, demographic information',
          'Contact Information: Email, phone, communication details',
          'Geographic Location: Addresses, cities, postal codes',
          'Financial Data: Account numbers, transaction amounts',
          'Time & Dates: Timestamps, event dates, temporal data',
          'Business Data: Organization info, departments, business-specific fields',
          'System & Technical: Record IDs, system metadata, technical fields',
          'Custom Fields: User-defined fields for specific requirements'
        ]
      },
      {
        heading: 'Data Types & Validation',
        content: 'Each field can have a specific data type and validation rules to ensure data quality.',
        steps: [
          'String: Text data with optional length and pattern constraints',
          'Number: Numeric data with min/max value ranges',
          'Boolean: True/false values',
          'Date/DateTime: Temporal data with format validation',
          'Email: Email addresses with format validation',
          'URL: Web addresses with format validation',
          'Enum: Predefined list of allowed values',
          'Array/Object: Complex data structures'
        ]
      },
      {
        heading: 'Import & Export',
        content: 'Share catalog definitions and maintain backups using JSON import/export functionality.',
        steps: [
          'Export: Download current catalog as JSON file for backup or sharing',
          'Template: Download example template with sample custom fields',
          'Import: Upload JSON file to add custom fields to your catalog',
          'Version Control: Track changes and maintain catalog history'
        ],
        tips: [
          'Download the template first to understand the required JSON format',
          'Only custom fields (isStandard: false) will be imported',
          'Imported fields must have unique names in snake_case format',
          'Include validation rules for better data quality enforcement'
        ]
      },
      {
        heading: 'Field Mapping Integration',
        content: 'The Global Catalog works with the Field Mapping interface in Data Discovery to transform source data.',
        steps: [
          'Data Discovery: Upload and connect your data sources',
          'Field Mapping: Map source fields to catalog fields with confidence scoring',
          'Transformation: Convert source data to use standardized catalog field names',
          'Consistency: All mapped data uses the same field names across sources'
        ],
        tips: [
          'Review field mappings regularly to ensure accuracy',
          'Use high-confidence automatic mappings when available',
          'Manually review and adjust low-confidence mappings',
          'Add new catalog fields when source data has unique requirements'
        ]
      },
      {
        heading: 'Best Practices',
        content: 'Follow these guidelines for effective catalog management and data standardization.',
        tips: [
          'Establish naming conventions early and stick to them consistently',
          'Document field purposes and business rules in descriptions',
          'Use validation rules to catch data quality issues early',
          'Regularly review and update field definitions as requirements evolve',
          'Coordinate with team members when adding or modifying shared fields',
          'Back up your catalog regularly using the export feature'
        ],
        warnings: [
          'Changing standard field definitions may affect existing mappings',
          'Deleting fields will remove all associated field mappings',
          'Field name changes require updating existing data transformations',
          'Validation rule changes may cause existing data to fail validation'
        ]
      }
    ]
  } as HelpContent,

  pipeline: {
    title: 'Pipeline Builder Help',
    sections: [
      {
        heading: 'Overview',
        content: 'The Pipeline Builder is the orchestration layer that automates your complete data preparation workflow. Transform manual, multi-step processes into automated, repeatable pipelines that connect existing data sources, patterns, and environments.',
        tips: [
          'Use pipelines to automate repetitive data preparation tasks',
          'Connect pipelines to existing data sources and pattern libraries',
          'Deploy pipelines to different environments for scalable processing',
          'Monitor pipeline execution and track data lineage for compliance'
        ]
      },
      {
        heading: 'Getting Started',
        content: 'Create your first pipeline by dragging nodes from the palette and connecting them with edges. Each node represents a step in your data processing workflow.',
        steps: [
          'Click "New Pipeline" to create a pipeline or select an existing one',
          'Use the node palette on the left to browse available node types',
          'Drag nodes from the palette onto the canvas',
          'Connect nodes by dragging from output handles (right side) to input handles (left side)',
          'Configure each node by clicking the "Configure" button',
          'Save your pipeline and test it with the "Run" button'
        ],
        tips: [
          'Start with a simple source → transform → output pipeline',
          'Use template pipelines for common workflows',
          'Name your pipeline descriptively for easy identification',
          'Save frequently to avoid losing work'
        ]
      },
      {
        heading: 'Node Types & Categories',
        content: 'Pipeline nodes are organized into five main categories, each serving different purposes in your data workflow.',
        steps: [
          'Source Nodes: Import data from files, databases, or APIs',
          'Transform Nodes: Convert, filter, aggregate, and map data',
          'Analyze Nodes: Profile data quality and validate against business rules', 
          'Privacy Nodes: Detect PII, redact sensitive data, generate synthetic data',
          'Output Nodes: Export to files, deploy to environments, format for ML training',
          'Control Nodes: Manage workflow logic with conditions and merging'
        ]
      },
      {
        heading: 'Node Configuration',
        content: 'Each node can be configured to work with your existing application resources and settings.',
        steps: [
          'Click the "Configure" button on any node to open configuration panel',
          'Source nodes: Select from existing data sources in Data Discovery',
          'Privacy nodes: Choose detection patterns from your pattern library',
          'Output nodes: Deploy to environments defined in Environment Management',
          'Transform nodes: Apply field mappings from the Global Catalog',
          'All configurations are validated before saving'
        ],
        tips: [
          'Green checkmarks indicate successful resource connections',
          'Red warnings show configuration issues that need attention',
          'Use existing resources whenever possible for consistency',
          'Configuration changes are saved automatically when valid'
        ]
      },
      {
        heading: 'Application Integration',
        content: 'Pipelines seamlessly integrate with all other parts of the Data Preparedness Studio, eliminating the need to reconfigure resources.',
        steps: [
          'Data Sources: File Upload nodes automatically list your uploaded data sources',
          'Pattern Libraries: PII Detector nodes use patterns defined in Pattern Definition',
          'Synthetic Templates: Synthetic Generator nodes reference templates from Synthetic Data',
          'Target Environments: Environment Deploy nodes use environments from Environment Management',
          'Field Mappings: Field Mapper nodes apply mappings from the Global Catalog'
        ],
        tips: [
          'Configure resources in their respective sections before building pipelines',
          'Pipelines will automatically stay updated as you modify underlying resources',
          'Use the same data sources across multiple pipelines for consistency',
          'Complex field mappings should be defined in the Global Catalog first'
        ]
      },
      {
        heading: 'Workflow Orchestration',
        content: 'Design sophisticated workflows using node connections, conditional logic, and parallel processing.',
        steps: [
          'Sequential Processing: Connect nodes in series for step-by-step processing',
          'Parallel Processing: Split data flows to process multiple branches simultaneously',
          'Conditional Logic: Use Conditional Branch nodes to route data based on criteria',
          'Data Merging: Combine multiple data streams with Data Merger nodes',
          'Error Handling: Design fallback paths for robust pipeline execution'
        ],
        warnings: [
          'Avoid circular connections that could cause infinite loops',
          'Test complex workflows thoroughly before production use',
          'Consider memory and processing requirements for large datasets'
        ]
      },
      {
        heading: 'Pipeline Execution',
        content: 'Run pipelines manually for testing or integrate with external systems for automated execution.',
        steps: [
          'Manual Execution: Click "Run" to execute pipeline immediately',
          'Status Monitoring: Track execution progress and identify bottlenecks',
          'Error Handling: Review execution logs to troubleshoot issues',
          'Result Validation: Verify output data meets quality expectations',
          'Performance Optimization: Adjust node configurations for better performance'
        ],
        tips: [
          'Start with small datasets when testing new pipelines',
          'Monitor resource usage during execution',
          'Set up alerts for long-running or failed executions',
          'Document successful pipeline configurations for reuse'
        ]
      },
      {
        heading: 'AIOps Integration',
        content: 'Pipelines can be triggered by external ML systems via REST API for seamless AIOps workflows.',
        steps: [
          'API Endpoints: External systems can execute pipelines via /api/pipelines/{id}/execute',
          'Status Monitoring: Check execution progress via /api/pipelines/{id}/execution/{executionId}',
          'Data Lineage: Retrieve complete data lineage via /api/pipelines/{id}/lineage',
          'Webhook Integration: Receive notifications when pipeline execution completes',
          'Context Passing: External systems can pass job context and requirements'
        ],
        tips: [
          'Design pipelines to accept dynamic parameters from external systems',
          'Use environment-specific configurations for different deployment scenarios',
          'Implement proper authentication and authorization for API access',
          'Monitor API usage and performance for production deployments'
        ]
      },
      {
        heading: 'Advanced Features',
        content: 'Leverage advanced pipeline features for enterprise-grade data preparation workflows.',
        steps: [
          'Version Control: Track pipeline changes and maintain deployment history',
          'Environment Deployment: Deploy pipelines to development, staging, and production',
          'Quality Gates: Implement data quality checks before downstream processing',
          'Compliance Tracking: Maintain audit trails and data lineage for regulatory requirements',
          'Performance Optimization: Scale processing based on data volume and complexity'
        ]
      },
      {
        heading: 'Best Practices',
        content: 'Follow these guidelines for effective pipeline design and management.',
        tips: [
          'Design pipelines with clear, single-purpose objectives',
          'Use descriptive names for pipelines and document their purpose',
          'Test pipelines thoroughly with representative datasets',
          'Implement error handling and recovery mechanisms',
          'Monitor pipeline performance and optimize bottlenecks',
          'Version control pipeline configurations for change management',
          'Use environment-specific configurations for different deployment stages',
          'Regularly review and update pipelines as requirements evolve'
        ],
        warnings: [
          'Large datasets may require significant processing time and resources',
          'Complex pipelines can be difficult to debug - start simple and add complexity gradually',
          'Always test configuration changes in non-production environments first',
          'Monitor data quality throughout the pipeline to catch issues early'
        ]
      }
    ]
  } as HelpContent,

  databaseSources: {
    title: 'Database Sources Help',
    sections: [
      {
        heading: 'Overview',
        content: 'Connect to relational databases like PostgreSQL and MySQL to import structured data. Browse schemas, preview tables, and import data with automatic transformation to JSON format.',
        tips: [
          'Test your connection before saving to ensure credentials are correct',
          'Use read-only database users for added security',
          'Schedule automatic refreshes to keep data up-to-date',
          'For large tables, consider using SQL queries to filter data during import'
        ]
      },
      {
        heading: 'Setting Up Connections',
        content: 'Create a new database connection by providing connection details and credentials. The system supports SSL connections and custom ports.',
        steps: [
          'Click "New Connection" to start',
          'Select your database type (PostgreSQL or MySQL)',
          'Enter connection details: host, port, database name',
          'Provide authentication credentials',
          'Enable SSL if required by your database',
          'Test the connection to verify settings',
          'Save the connection for future use'
        ],
        tips: [
          'Use environment-specific connection names like "prod-db" or "staging-db"',
          'Store credentials securely - they are encrypted at rest',
          'Default ports: PostgreSQL (5432), MySQL (3306)'
        ]
      },
      {
        heading: 'Browsing and Importing Tables',
        content: 'Once connected, browse available schemas and tables. Preview data before importing and configure import options.',
        steps: [
          'Click on a connection to browse its contents',
          'Navigate through schemas to find tables',
          'Click "Preview" to see sample data',
          'Select "Import" to create a data source',
          'Choose import options (row limit, filters)',
          'Configure refresh schedule if needed',
          'Click "Import Table" to complete'
        ],
        warnings: [
          'Large tables may take time to import - consider using row limits',
          'Imported data counts against your storage quota',
          'Changes to source tables require manual refresh or scheduled updates'
        ]
      },
      {
        heading: 'Relational Data Import',
        content: 'Import related data by following foreign key relationships. This creates nested JSON documents that preserve data relationships.',
        steps: [
          'Enable "Import as relational data" when importing',
          'Select the primary table to start from',
          'Configure relationship depth (default: 2 levels)',
          'Choose which relationships to follow',
          'Preview the nested structure before importing',
          'Adjust settings to control data volume'
        ],
        tips: [
          'Deeper relationship levels exponentially increase data size',
          'Use "Max records per relation" to limit one-to-many relationships',
          'Circular references are automatically handled',
          'Preview helps understand the final data structure'
        ]
      },
      {
        heading: 'SQL Query Import',
        content: 'Import data using custom SQL queries for advanced filtering and joining across tables.',
        steps: [
          'Select "Query" tab in the import dialog',
          'Write your SQL query',
          'Test the query to preview results',
          'Name your custom data source',
          'Configure refresh options',
          'Save and import the query results'
        ],
        tips: [
          'Use query parameters for dynamic filtering',
          'Include only necessary columns to reduce data size',
          'Complex joins may impact import performance',
          'Saved queries can be edited and re-run later'
        ]
      },
      {
        heading: 'Scheduled Refresh',
        content: 'Keep your data up-to-date with automatic refresh schedules.',
        steps: [
          'Enable "Schedule automatic refresh" during import',
          'Choose refresh frequency (hourly, daily, weekly)',
          'Set specific time for daily/weekly refreshes',
          'Configure failure notifications',
          'Save the schedule configuration'
        ],
        warnings: [
          'Refreshes consume API quota and processing resources',
          'Failed refreshes will retry automatically',
          'Large datasets may take significant time to refresh',
          'Consider off-peak hours for resource-intensive refreshes'
        ]
      }
    ]
  } as HelpContent,

  apiSources: {
    title: 'API Sources Help',
    sections: [
      {
        heading: 'Overview',
        content: 'Connect to REST APIs to import data from web services, SaaS platforms, and external systems. Supports various authentication methods, pagination, and data transformation.',
        tips: [
          'Start with simple public APIs to understand the workflow',
          'Use JSONPath to extract specific data from complex responses',
          'Test your configuration with the preview feature',
          'Save authentication credentials securely in the connection'
        ]
      },
      {
        heading: 'Creating API Connections',
        content: 'Set up a new API connection with authentication and configuration options.',
        steps: [
          'Click "New API Connection" to start',
          'Enter the base API URL',
          'Select authentication method (None, API Key, Bearer Token, Basic Auth)',
          'Configure authentication credentials',
          'Add custom headers if required',
          'Set default query parameters',
          'Test the connection with a sample endpoint',
          'Save the connection configuration'
        ],
        tips: [
          'Use environment variables for sensitive values when possible',
          'Base URL should not include specific endpoints',
          'Custom headers are useful for API versioning',
          'Query parameters can include default filters or formats'
        ]
      },
      {
        heading: 'Authentication Methods',
        content: 'Configure the appropriate authentication method for your API.',
        steps: [
          'API Key: Provide key name and value for header or query parameter',
          'Bearer Token: Enter the token (without "Bearer" prefix)',
          'Basic Auth: Provide username and password',
          'OAuth 2.0: Configure client credentials (coming soon)',
          'Custom: Use combination of headers and parameters'
        ],
        warnings: [
          'Store API keys and tokens securely',
          'Rotate credentials regularly for security',
          'Some APIs have rate limits - check documentation',
          'Invalid credentials will cause import failures'
        ]
      },
      {
        heading: 'Configuring Endpoints',
        content: 'Define specific endpoints to import data from, with support for pagination and data extraction.',
        steps: [
          'Add endpoint path (relative to base URL)',
          'Configure request method (GET, POST)',
          'Set up pagination if needed',
          'Define JSONPath for data extraction',
          'Add endpoint-specific headers or parameters',
          'Test the endpoint configuration',
          'Save and import data'
        ],
        tips: [
          'JSONPath "$.data" extracts the data array from response',
          'Use "$.results[*]" for results array with all items',
          'Leave JSONPath empty to import entire response',
          'Test with small page sizes first'
        ]
      },
      {
        heading: 'Pagination Handling',
        content: 'Configure pagination to import large datasets that span multiple pages.',
        steps: [
          'Select pagination type (Offset/Limit, Page-based, Cursor, None)',
          'Configure page size parameter name and value',
          'Set offset/page parameter name',
          'Define how to detect last page',
          'Test pagination with preview',
          'Monitor import progress'
        ],
        tips: [
          'Start with small page sizes (10-50) for testing',
          'Offset/Limit works for most REST APIs',
          'Page-based pagination starts at page 1 usually',
          'Cursor pagination requires next page token handling'
        ]
      },
      {
        heading: 'JSONPath Data Extraction',
        content: 'Use JSONPath expressions to extract specific data from API responses.',
        steps: [
          'Examine the API response structure',
          'Identify the data array or object path',
          'Write JSONPath expression',
          'Test extraction with preview',
          'Adjust path as needed',
          'Save the configuration'
        ],
        tips: [
          '$ represents the root of the JSON response',
          '$.items[*] selects all items in an array',
          '$.data.users extracts nested data',
          '$..email recursively finds all email fields',
          'Use online JSONPath testers for complex expressions'
        ]
      },
      {
        heading: 'Refresh and Sync',
        content: 'Keep API data current with manual or scheduled refreshes.',
        steps: [
          'Click "Refresh" for manual data sync',
          'Configure scheduled refresh in import settings',
          'Monitor refresh status and history',
          'Review error logs for failed refreshes',
          'Adjust configuration if needed'
        ],
        warnings: [
          'Refreshes may be subject to API rate limits',
          'Large datasets can take time to refresh',
          'API changes may break existing configurations',
          'Monitor API usage to avoid exceeding quotas'
        ]
      }
    ]
  } as HelpContent,

  inboundApi: {
    title: 'Inbound API Help',
    sections: [
      {
        heading: 'Overview',
        content: 'Create API endpoints to receive data pushed from external systems. Perfect for webhooks, integrations, and real-time data collection.',
        tips: [
          'Each endpoint gets a unique URL for receiving data',
          'Use API key authentication to secure endpoints',
          'Custom URLs make integration easier for partners',
          'Real-time updates show incoming data immediately'
        ]
      },
      {
        heading: 'Creating Endpoints',
        content: 'Set up a new inbound API endpoint to receive data from external systems.',
        steps: [
          'Click "Create Inbound API" to start',
          'Enter a descriptive name for the endpoint',
          'Choose authentication requirements',
          'Optionally set a custom URL slug',
          'Configure allowed methods (POST, PUT, etc.)',
          'Save to generate the endpoint URL',
          'Copy the URL for use in external systems'
        ],
        tips: [
          'Use descriptive names like "customer-webhook" or "iot-data"',
          'Custom URLs are easier to remember and share',
          'Enable authentication for production endpoints',
          'Test with curl or Postman before integration'
        ]
      },
      {
        heading: 'Authentication Setup',
        content: 'Secure your endpoints with API key authentication to prevent unauthorized access.',
        steps: [
          'Enable "Require API Key" when creating endpoint',
          'System generates a secure API key automatically',
          'Choose header name (default: X-API-Key)',
          'Share key securely with authorized systems',
          'Regenerate key if compromised',
          'Test authentication with sample requests'
        ],
        tips: [
          'Use standard headers like X-API-Key or Authorization',
          'Never share API keys in public repositories',
          'Rotate keys periodically for security',
          'Consider IP whitelisting for additional security'
        ],
        warnings: [
          'Lost API keys cannot be recovered - save them securely',
          'Disabling authentication makes endpoint publicly accessible',
          'Rate limiting is applied to prevent abuse'
        ]
      },
      {
        heading: 'Custom URLs',
        content: 'Create memorable endpoint URLs using custom slugs instead of system-generated IDs.',
        steps: [
          'Enter desired URL slug when creating endpoint',
          'System checks availability in real-time',
          'Use letters, numbers, and hyphens only',
          'URL format: /api/inbound/[your-slug]',
          'Update external systems with new URL',
          'Custom URLs cannot be changed after creation'
        ],
        tips: [
          'Use descriptive slugs like "salesforce-leads"',
          'Keep URLs short but meaningful',
          'Consider versioning: "webhook-v2"',
          'Document custom URLs for team reference'
        ]
      },
      {
        heading: 'Receiving Data',
        content: 'Send data to your endpoints using HTTP POST or PUT requests with JSON payloads.',
        steps: [
          'Use the endpoint URL in external system',
          'Include API key in request header if required',
          'Send JSON data in request body',
          'Check response for success confirmation',
          'Monitor real-time updates in the UI',
          'Data automatically creates/updates data source'
        ],
        tips: [
          'Content-Type should be application/json',
          'Maximum payload size is 10MB',
          'Successful requests return 200 OK',
          'Failed requests include error details'
        ]
      },
      {
        heading: 'Real-time Monitoring',
        content: 'Watch incoming data in real-time using the activity monitor and live updates.',
        steps: [
          'Open endpoint details page',
          'View "Latest Activity" section',
          'See real-time updates as data arrives',
          'Click events for detailed payload view',
          'Monitor success/failure rates',
          'Export activity logs if needed'
        ],
        tips: [
          'Keep browser tab open for live updates',
          'Activity shows last 100 events',
          'Failed requests show error reasons',
          'Use filters to find specific events'
        ]
      },
      {
        heading: 'Integration Examples',
        content: 'Common integration patterns and code examples for sending data to endpoints.',
        steps: [
          'Webhook Integration: Configure external service to POST to endpoint',
          'Scheduled Jobs: Use cron to periodically send data',
          'Event Streaming: Send real-time events as they occur',
          'Batch Processing: Accumulate and send data in batches',
          'IoT Devices: Configure devices to push sensor data'
        ],
        tips: [
          'Most webhooks send POST requests',
          'Include timestamp in payload for tracking',
          'Implement retry logic for failed requests',
          'Consider buffering for high-volume data',
          'Test with small data volumes first'
        ]
      },
      {
        heading: 'Troubleshooting',
        content: 'Common issues and solutions for inbound API endpoints.',
        tips: [
          '401 Unauthorized: Check API key and header name',
          '404 Not Found: Verify endpoint URL and custom slug',
          '413 Payload Too Large: Reduce data size below 10MB',
          '429 Too Many Requests: Implement rate limiting on sender',
          '500 Server Error: Check payload format and content'
        ],
        warnings: [
          'Deleted endpoints cannot be recovered',
          'Data sources created by endpoints persist after endpoint deletion',
          'Changing authentication affects all integrated systems',
          'Monitor usage to avoid hitting platform limits'
        ]
      }
    ]
  } as HelpContent,

  query: {
    title: 'Global Query Help',
    sections: [
      {
        heading: 'Overview',
        content: 'Ask natural language questions about your data and get instant answers. The Global Query feature uses AI to understand your question, generate appropriate queries, and execute them across your connected data sources.',
        tips: [
          'Start with simple questions like "How many records?"',
          'Use natural language - no SQL knowledge required',
          'Check "Explain Methodology" to understand calculations',
          'The system handles complex queries with field transformations'
        ]
      },
      {
        heading: 'Getting Started',
        content: 'Navigate to the Query page and type your question in natural language. The AI will analyze your data sources and generate the appropriate query.',
        steps: [
          'Go to Query from the main navigation menu',
          'Type your question in the text box',
          'Optionally enable "Explain Methodology" for detailed explanations',
          'Click "Ask" or press Enter to execute',
          'View results in table or value format',
          'Ask follow-up questions to refine results'
        ],
        tips: [
          'Be specific about what data you want to analyze',
          'Include field names when you know them',
          'Start simple and add complexity gradually',
          'Results appear immediately for most queries'
        ]
      },
      {
        heading: 'Types of Questions',
        content: 'You can ask various types of questions about your data, from simple counts to complex calculations.',
        steps: [
          'Counting: "How many customers do we have?"',
          'Filtering: "Show me all orders over $100"',
          'Aggregation: "What is the average order value?"',
          'Grouping: "Show revenue by month"',
          'Calculations: "What is the average customer age?" (from date of birth)',
          'Relationships: "Show patients with their appointments"'
        ],
        tips: [
          'The system automatically detects if calculations are needed',
          'Date fields can be transformed (e.g., date of birth to age)',
          'Complex queries use JavaScript for flexibility',
          'Multi-table queries work when sources are related'
        ]
      },
      {
        heading: 'Query Examples',
        content: 'Here are common query patterns you can adapt for your data.',
        steps: [
          'Basic Count: "How many records are in the patient data?"',
          'Filtering: "Show me active users", "List orders from last month"',
          'Aggregation: "What\'s the total revenue?", "Average transaction amount"',
          'Top N: "Show top 10 customers by revenue"',
          'Grouping: "Count orders by status", "Revenue by region"',
          'Calculations: "Average age of patients", "Days since last order"',
          'Comparisons: "Compare sales between Q1 and Q2"'
        ],
        tips: [
          'Replace example terms with your actual field names',
          'Add filters to narrow results: "for California customers"',
          'Specify time ranges: "in the last 30 days"',
          'Use "top" or "bottom" for ranked results'
        ]
      },
      {
        heading: 'Understanding Results',
        content: 'Query results are presented in the most appropriate format based on your question.',
        steps: [
          'Single Values: Aggregations show as a single number or value',
          'Tables: Lists of records display in sortable table format',
          'Groups: Grouped data shows categories with their values',
          'Explanations: Methodology explains how calculations were done',
          'Metadata: Shows number of records processed and data sources used'
        ],
        tips: [
          'Tables can be sorted by clicking column headers',
          'Single values include labels for clarity',
          'Grouped results show all categories found',
          'Check record count to verify query scope'
        ]
      },
      {
        heading: 'Explain Methodology',
        content: 'Enable this option to see detailed explanations of how your query was processed.',
        steps: [
          'Check "Explain Methodology" before asking your question',
          'View the generated query structure (analysis or code)',
          'See which data sources were used',
          'Understand calculations and transformations applied',
          'Learn how the AI interpreted your question',
          'Debug issues with query generation'
        ],
        tips: [
          'Helpful for learning how the system works',
          'Shows if the query used simple aggregation or code',
          'Reveals the actual fields and operations used',
          'Great for verifying complex calculations'
        ]
      },
      {
        heading: 'Advanced Features',
        content: 'The system supports sophisticated queries with automatic code generation for complex calculations.',
        steps: [
          'Field Transformations: Automatic conversion (e.g., dates to ages)',
          'Multi-Source Queries: Combine related data sources',
          'Custom Calculations: Any computation expressible in JavaScript',
          'Statistical Functions: Averages, sums, counts, percentages',
          'Time-Based Analysis: Group by date ranges, calculate durations',
          'Conditional Logic: Filter and process based on complex criteria'
        ],
        tips: [
          'The system chooses between simple queries and code automatically',
          'JavaScript utilities available: calculateAge, groupBy, average',
          'All calculations run locally on your data',
          'Complex queries may take longer to process'
        ],
        warnings: [
          'Very large datasets may require optimization',
          'Ensure data sources are transformed before querying',
          'Some calculations require specific field types'
        ]
      },
      {
        heading: 'Common Issues',
        content: 'Solutions for typical problems when using Global Query.',
        steps: [
          '"No field found": Ensure data source is transformed and fields are cataloged',
          'Empty results: Check if data exists and filters are not too restrictive',
          'Calculation errors: Verify field formats (dates, numbers) are correct',
          'Slow queries: Consider adding filters to reduce data volume',
          '"Cannot join sources": Sources must be from same database or explicitly related'
        ],
        tips: [
          'Transform data sources before querying',
          'Check Data Discovery to see available fields',
          'Try simpler queries first, then add complexity',
          'Use field annotations to provide context',
          'Verify data types match expected formats'
        ]
      },
      {
        heading: 'Best Practices',
        content: 'Follow these guidelines for effective use of Global Query.',
        tips: [
          'Start with simple questions to understand your data',
          'Use specific field names when known',
          'Add context: "in the customer data" or "from orders table"',
          'Enable methodology for learning and debugging',
          'Save successful queries for future reference',
          'Annotate fields to improve query understanding',
          'Test with small datasets before scaling up',
          'Use filters to improve performance on large datasets'
        ],
        warnings: [
          'Queries execute on full datasets - be mindful of size',
          'Complex calculations increase processing time',
          'Ensure proper field mapping for consistent results',
          'Some queries may require specific data formats'
        ]
      }
    ]
  } as HelpContent,

  fileUpload: {
    title: 'File Upload Help',
    sections: [
      {
        heading: 'Overview',
        content: 'Upload files directly to the platform for data discovery and transformation. Supports multiple file formats including CSV, JSON, PDF, DOCX, and TXT files. Files are automatically transformed to a unified JSON format upon upload.',
        tips: [
          'Drag and drop multiple files or click to browse',
          'Files are automatically transformed to JSON format',
          'PDF and DOCX content is extracted as structured text',
          'Use tags to organize uploaded files',
          'Maximum file size: 10MB per file'
        ]
      },
      {
        heading: 'Supported File Types',
        content: 'The platform supports various file formats for different use cases. Each file type is processed appropriately to extract meaningful data.',
        steps: [
          'CSV: Comma-separated values files with automatic header detection',
          'JSON: JavaScript Object Notation files with nested structure support',
          'PDF: Portable Document Format with text extraction',
          'DOCX: Microsoft Word documents with formatted text extraction',
          'TXT: Plain text files with content preservation',
          'TSV: Tab-separated values files similar to CSV'
        ],
        tips: [
          'CSV files should have headers in the first row',
          'JSON files can contain arrays or objects',
          'PDF text extraction works best with text-based PDFs',
          'Large files may take longer to process'
        ]
      },
      {
        heading: 'Uploading Files',
        content: 'Upload one or more files using the drag-and-drop interface or file browser. Files are processed immediately upon upload.',
        steps: [
          'Navigate to File Upload page from the sidebar',
          'Drag files onto the upload area or click to browse',
          'Select one or more files from your computer',
          'Wait for upload progress to complete',
          'Files are automatically transformed to JSON',
          'View uploaded files in Data Discovery'
        ],
        tips: [
          'You can upload multiple files at once',
          'Upload progress shows for each file',
          'Failed uploads can be retried',
          'Use Shift or Ctrl to select multiple files'
        ]
      },
      {
        heading: 'File Organization',
        content: 'Organize uploaded files using meaningful names and tags for easy discovery and management.',
        steps: [
          'Give files descriptive names during upload',
          'Add tags immediately after upload',
          'Group related files with the same tags',
          'Use the search feature to find files later',
          'Edit file names and tags in Data Discovery'
        ],
        tips: [
          'Use consistent naming conventions',
          'Tags like "production", "test", "customer-data" help organization',
          'You can add multiple tags to a single file',
          'Tags are searchable in Data Discovery'
        ]
      },
      {
        heading: 'Large File Handling',
        content: 'For files approaching the size limit, the platform uses streaming upload to ensure reliability.',
        steps: [
          'Files over 5MB use chunked streaming upload',
          'Progress bar shows upload percentage',
          'Failed chunks are automatically retried',
          'Pause and resume supported for large files',
          'Upload speed and ETA displayed'
        ],
        tips: [
          'Ensure stable internet connection for large files',
          'Streaming upload is more reliable for big files',
          'You can pause and resume uploads if needed',
          'Consider splitting very large datasets'
        ],
        warnings: [
          'Maximum file size is 10MB',
          'Very large files may timeout on slow connections',
          'Text content over 1MB may be truncated for display'
        ]
      },
      {
        heading: 'Data Transformation',
        content: 'All uploaded files are automatically transformed to a unified JSON format for consistent processing.',
        steps: [
          'CSV files are converted to JSON arrays',
          'PDF/DOCX text is extracted and structured',
          'JSON files are validated and normalized',
          'Transformation happens automatically',
          'View transformed data in Data Discovery'
        ],
        tips: [
          'Check Data Discovery to see transformed data',
          'Use field mapping for consistent naming',
          'Transformation preserves all original data',
          'Export transformed data in various formats'
        ]
      },
      {
        heading: 'Common Issues',
        content: 'Solutions for common file upload problems and errors.',
        tips: [
          'Upload failed: Check file size is under 10MB',
          'Invalid format: Ensure file extension matches content',
          'Slow upload: Try uploading fewer files at once',
          'Missing data: Check CSV has proper headers',
          'Encoding issues: Save files as UTF-8'
        ],
        warnings: [
          'Corrupted files cannot be processed',
          'Password-protected PDFs are not supported',
          'Binary files (images, executables) are not supported',
          'Network interruptions may require re-upload'
        ]
      },
      {
        heading: 'Best Practices',
        content: 'Follow these guidelines for optimal file upload experience.',
        tips: [
          'Prepare files before upload (check format, size)',
          'Use consistent column names in CSV files',
          'Remove sensitive data before uploading if not needed',
          'Test with small sample files first',
          'Batch related files together',
          'Add descriptive tags immediately after upload',
          'Verify transformed data in Data Discovery'
        ]
      }
    ]
  } as HelpContent
};

// Helper function to get help content by page name
export function getHelpContent(pageName: keyof typeof helpContent): HelpContent {
  return helpContent[pageName];
}