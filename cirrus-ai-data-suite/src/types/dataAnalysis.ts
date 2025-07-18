/**
 * Data Analysis Query Types
 * Defines the structure for data analysis queries that can be executed locally
 */

export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'distinct';
export type OperationType = 'filter' | 'aggregate' | 'group' | 'sort' | 'limit' | 'join';
export type ComparisonOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'exists';

export interface DataQuery {
  type: 'analysis' | 'code';
  sources: string[]; // Data source IDs
  tables?: string[]; // Table names within the data source(s)
  joins?: TableJoinDefinition[]; // Joins between tables
  operations?: QueryOperation[]; // Optional for code type
  output?: OutputFormat; // Optional for code type
  options?: QueryOptions;
  // For code type queries
  code?: string; // JavaScript code to execute
  runtime?: 'safe' | 'isolated'; // Execution environment
}

export interface QueryOperation {
  type: OperationType;
  table?: string; // Which table this operation applies to
  // Filter operation
  conditions?: FilterCondition[];
  // Aggregate operation
  aggregations?: AggregateField[];
  // Group operation
  groupBy?: string[];
  // Sort operation
  sortBy?: SortField[];
  // Limit operation
  limit?: number;
  offset?: number;
  // Join operation
  joins?: JoinDefinition[];
}

export interface JoinDefinition {
  leftSource: string; // data source ID
  rightSource: string; // data source ID
  leftField: string; // field to join on
  rightField: string; // field to join on
  type?: 'inner' | 'left' | 'right' | 'full'; // default 'inner'
  prefix?: string; // prefix for right table fields to avoid conflicts
}

export interface TableJoinDefinition {
  type?: 'inner' | 'left' | 'right';
  from: {
    table: string;
    field: string;
  };
  to: {
    table: string;
    field: string;
  };
}

export interface FilterCondition {
  field: string;
  operator: ComparisonOperator;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  logical?: 'and' | 'or'; // How to combine with next condition
}

export interface AggregateField {
  field: string;
  operation: AggregationType;
  alias?: string; // Output field name
}

export interface SortField {
  field: string;
  direction: 'asc' | 'desc';
}

export interface OutputFormat {
  format: 'summary' | 'table' | 'raw' | 'chart';
  fields?: string[]; // Specific fields to include
  includeMetadata?: boolean; // Include count, timing, etc.
  limit?: number; // Max records to return
}

export interface QueryOptions {
  timeout?: number; // Max execution time in ms
  cacheKey?: string; // For caching results
  skipNulls?: boolean; // Skip null values in aggregations
  caseSensitive?: boolean; // For string comparisons
}

export interface QueryResult {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  metadata?: QueryMetadata;
  error?: string;
  query?: DataQuery; // Echo back the query for debugging
}

export interface QueryMetadata {
  recordsProcessed: number;
  executionTime: number;
  dataSources: Array<{
    id: string;
    name: string;
    recordCount: number;
  }>;
  warnings?: string[];
}

export interface AnalysisCapability {
  operation: AggregationType;
  supportedTypes: string[]; // Data types this operation supports
  description: string;
}

// Helper type for LLM-generated queries
export interface GeneratedQuery {
  query: DataQuery;
  explanation: string;
  estimatedRecords?: number;
  warnings?: string[];
}