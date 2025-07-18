import { 
  IDatabaseConnector, 
  DatabaseConnection, 
  DatabaseSchema, 
  QueryResult,
  DatabaseConnectorOptions,
  ConnectorError 
} from '@/types/connector';
import { logger } from '@/utils/logger';

export abstract class BaseDatabaseConnector implements IDatabaseConnector {
  protected connection: DatabaseConnection;
  protected options: DatabaseConnectorOptions;
  protected isConnected: boolean = false;
  protected client: unknown;

  constructor(connection: DatabaseConnection, options: DatabaseConnectorOptions = {}) {
    this.connection = connection;
    this.options = {
      maxRowsPreview: 1000,
      timeout: 30000,
      poolSize: 10,
      ...options
    };
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getDatabaseSchema(): Promise<DatabaseSchema>;
  abstract executeQuery(query: string, params?: unknown[]): Promise<QueryResult>;

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      await this.connect();
      // Try a simple query
      await this.executeQuery('SELECT 1 as test');
      await this.disconnect();
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Connection test failed for ${this.connection.type}:`, error);
      return { success: false, message };
    }
  }

  async getTableData(tableName: string, limit: number = 100, offset: number = 0): Promise<QueryResult> {
    // Basic implementation - can be overridden by specific connectors
    const query = this.buildSelectQuery(tableName, limit, offset);
    return this.executeQuery(query);
  }

  async getTableCount(tableName: string): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM ${this.escapeIdentifier(tableName)}`;
    const result = await this.executeQuery(query);
    return parseInt(String(result.rows[0][0])) || 0;
  }

  async getSampleData(tableName: string, sampleSize: number = 100): Promise<Record<string, unknown>[]> {
    const result = await this.getTableData(tableName, sampleSize);
    // Convert array format to object format
    return result.rows.map(row => {
      const obj: Record<string, unknown> = {};
      result.columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });
  }

  protected buildSelectQuery(tableName: string, limit: number, offset: number): string {
    // Default SQL - can be overridden for specific databases
    return `SELECT * FROM ${this.escapeIdentifier(tableName)} LIMIT ${limit} OFFSET ${offset}`;
  }

  protected escapeIdentifier(identifier: string): string {
    // Default implementation - should be overridden by specific connectors
    return `"${identifier}"`;
  }

  protected handleError(error: unknown, operation: string): ConnectorError {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const connError = new Error(`${operation} failed: ${errorMessage}`) as ConnectorError;
    if (error instanceof Error && 'code' in error) {
      connError.code = error.code as string;
    }
    connError.details = error;
    return connError;
  }

  protected validateConnection(): void {
    if (!this.isConnected) {
      throw new Error('Database connection not established. Call connect() first.');
    }
  }

  // Helper method to format query results consistently
  protected formatQueryResult(rows: unknown[], columns?: string[]): QueryResult {
    if (!columns && rows.length > 0 && typeof rows[0] === 'object' && rows[0] !== null) {
      columns = Object.keys(rows[0] as Record<string, unknown>);
    }

    const formattedRows = rows.map(row => {
      if (Array.isArray(row)) {
        return row;
      }
      // Convert object to array based on column order
      const rowObj = row as Record<string, unknown>;
      return columns!.map(col => rowObj[col]);
    });

    return {
      columns: columns || [],
      rows: formattedRows,
      rowCount: rows.length
    };
  }
}