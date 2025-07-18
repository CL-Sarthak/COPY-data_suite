// Database connector types and interfaces

export type DatabaseType = 'postgresql' | 'mysql' | 'mongodb' | 'mssql' | 'oracle' | 'db2' | 'snowflake' | 'redshift' | 'bigquery';

export interface DatabaseConnection {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string; // Encrypted in storage
  ssl?: boolean;
  sslCert?: string;
  additionalOptions?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastTestedAt?: Date;
  status: 'active' | 'inactive' | 'error';
  errorMessage?: string;
  refreshEnabled?: boolean;
  refreshInterval?: number; // in minutes
  lastRefreshAt?: Date;
  nextRefreshAt?: Date;
  description?: string;
  tags?: string[];
  createdBy?: string;
}

export interface DatabaseSchema {
  tables: TableInfo[];
  views?: ViewInfo[];
  procedures?: ProcedureInfo[];
}

export interface TableInfo {
  name: string;
  schema?: string;
  columns: ColumnInfo[];
  rowCount?: number;
  sizeInBytes?: number;
  primaryKey?: string[];
  foreignKeys?: ForeignKeyInfo[];
  indexes?: IndexInfo[];
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: unknown;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

export interface ViewInfo {
  name: string;
  schema?: string;
  definition?: string;
  columns: ColumnInfo[];
}

export interface ProcedureInfo {
  name: string;
  schema?: string;
  parameters?: ParameterInfo[];
}

export interface ParameterInfo {
  name: string;
  dataType: string;
  direction: 'IN' | 'OUT' | 'INOUT';
}

export interface ForeignKeyInfo {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  constraintName: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  executionTime?: number;
}

export interface DatabaseConnectorOptions {
  maxRowsPreview?: number;
  timeout?: number;
  poolSize?: number;
}

// Base interface for all database connectors
export interface IDatabaseConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<{ success: boolean; message?: string }>;
  getDatabaseSchema(): Promise<DatabaseSchema>;
  getTableData(tableName: string, limit?: number, offset?: number): Promise<QueryResult>;
  executeQuery(query: string, params?: unknown[]): Promise<QueryResult>;
  getTableCount(tableName: string): Promise<number>;
  getSampleData(tableName: string, sampleSize?: number): Promise<Record<string, unknown>[]>;
}

export interface ConnectorError extends Error {
  code?: string;
  details?: unknown;
}