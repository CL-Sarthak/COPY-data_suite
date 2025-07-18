export interface DataSource {
  id: string;
  name: string;
  type: 'database' | 'api' | 'filesystem' | 's3' | 'azure' | 'gcp' | 'json_transformed';
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'connecting';
  lastSync?: Date;
  recordCount?: number;
  configuration: DataSourceConfig;
  metadata?: DataSourceMetadata;
  tags?: string[];
  transformedAt?: Date;
  hasTransformedData?: boolean;
  storageProvider?: string;
  transformationAppliedAt?: Date;
  transformedData?: string;
  
  // Summary fields
  aiSummary?: string;
  userSummary?: string;
  summaryGeneratedAt?: Date;
  summaryUpdatedAt?: Date;
  summaryVersion?: number;
  
  // Keywords for query routing
  aiKeywords?: string; // JSON string array of keywords
  keywordsGeneratedAt?: Date;
}

export interface FileData {
  name: string;
  type: string;
  size: number;
  content?: string;
}

export interface DataSourceConfig {
  // Database configs
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  data?: Record<string, unknown>[]; // Sample data from database imports
  connectionId?: string;
  connectionName?: string;
  databaseType?: string;
  tableName?: string;
  description?: string;
  
  // API configs
  endpoint?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  
  // Cloud storage configs
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  
  // Filesystem configs
  path?: string;
  recursive?: boolean;
  filePattern?: string;
  files?: FileData[];
}

export interface DataSourceMetadata {
  tables?: TableInfo[];
  schemas?: SchemaInfo[];
  dataTypes?: string[];
  totalSize?: number;
  lastModified?: Date;
  // For custom field definitions (used by synthetic data generation)
  fields?: Array<{
    name: string;
    type: string;
    primary?: boolean;
  }>;
}

export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  rowCount: number;
  size: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  containsPII?: boolean;
  piiType?: string;
}

export interface SchemaInfo {
  name: string;
  tables: string[];
  views: string[];
}

export interface DiscoveryResult {
  source: DataSource;
  discoveredAt: Date;
  statistics: {
    totalRecords: number;
    totalTables: number;
    piiFieldsFound: number;
    dataQualityScore: number;
  };
  samples: DataSample[];
}

export interface DataSample {
  tableName: string;
  columns: string[];
  rows: Record<string, unknown>[];
  piiColumns: string[];
}