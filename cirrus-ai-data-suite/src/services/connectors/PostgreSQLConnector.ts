import { Pool, PoolConfig } from 'pg';
import { BaseDatabaseConnector } from './BaseDatabaseConnector';
import { 
  DatabaseSchema, 
  TableInfo, 
  ColumnInfo, 
  QueryResult,
  ForeignKeyInfo,
  IndexInfo
} from '@/types/connector';
import { logger } from '@/utils/logger';

export class PostgreSQLConnector extends BaseDatabaseConnector {
  private pool: Pool | null = null;

  async connect(): Promise<void> {
    try {
      // Ensure password is either a non-empty string or undefined
      const password = this.connection.password && this.connection.password.trim() !== '' 
        ? this.connection.password 
        : undefined;

      const config: PoolConfig = {
        host: this.connection.host,
        port: this.connection.port,
        database: this.connection.database,
        user: this.connection.username,
        password: password,
        ssl: this.connection.ssl ? { rejectUnauthorized: false } : undefined,
        max: this.options.poolSize,
        connectionTimeoutMillis: this.options.timeout,
        query_timeout: this.options.timeout,
        ...this.connection.additionalOptions
      };

      this.pool = new Pool(config);
      
      // Test the connection
      await this.pool.query('SELECT 1');
      this.isConnected = true;
      
      logger.info(`Connected to PostgreSQL database: ${this.connection.database}`);
    } catch (error) {
      throw this.handleError(error, 'PostgreSQL connection');
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      logger.info(`Disconnected from PostgreSQL database: ${this.connection.database}`);
    }
  }

  async executeQuery(query: string, params?: unknown[]): Promise<QueryResult> {
    this.validateConnection();
    
    try {
      const startTime = Date.now();
      const result = await this.pool!.query(query, params);
      const executionTime = Date.now() - startTime;

      // Handle different result types
      if (result.rows) {
        return {
          columns: result.fields.map(field => field.name),
          rows: result.rows.map(row => Object.values(row)),
          rowCount: result.rowCount || 0,
          executionTime
        };
      }

      return {
        columns: [],
        rows: [],
        rowCount: result.rowCount || 0,
        executionTime
      };
    } catch (error) {
      throw this.handleError(error, 'Query execution');
    }
  }

  async getDatabaseSchema(): Promise<DatabaseSchema> {
    this.validateConnection();

    try {
      // Get all tables in the public schema (can be extended to other schemas)
      const tablesQuery = `
        SELECT 
          schemaname,
          tablename,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        ORDER BY schemaname, tablename
      `;

      const tablesResult = await this.pool!.query(tablesQuery);
      
      const tables: TableInfo[] = [];

      for (const table of tablesResult.rows) {
        const tableInfo = await this.getTableInfo(table.schemaname, table.tablename);
        tableInfo.sizeInBytes = parseInt(table.size_bytes);
        tables.push(tableInfo);
      }

      return { tables };
    } catch (error) {
      throw this.handleError(error, 'Schema discovery');
    }
  }

  private async getTableInfo(schema: string, tableName: string): Promise<TableInfo> {
    // Get columns
    const columnsQuery = `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_schema = $1 
          AND tc.table_name = $2
          AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_schema = $1 AND c.table_name = $2
      ORDER BY c.ordinal_position
    `;

    const columnsResult = await this.pool!.query(columnsQuery, [schema, tableName]);

    const columns: ColumnInfo[] = columnsResult.rows.map(col => ({
      name: col.column_name,
      dataType: col.data_type,
      nullable: col.is_nullable === 'YES',
      defaultValue: col.column_default,
      isPrimaryKey: col.is_primary_key,
      maxLength: col.character_maximum_length,
      precision: col.numeric_precision,
      scale: col.numeric_scale
    }));

    // Get primary keys
    const primaryKeys = columns
      .filter(col => col.isPrimaryKey)
      .map(col => col.name);

    // Get foreign keys
    const foreignKeysQuery = `
      SELECT 
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.constraint_schema = kcu.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.table_schema = $1 
        AND tc.table_name = $2
        AND tc.constraint_type = 'FOREIGN KEY'
    `;

    const foreignKeysResult = await this.pool!.query(foreignKeysQuery, [schema, tableName]);

    logger.debug(`Foreign keys for ${schema}.${tableName}:`, {
      count: foreignKeysResult.rows.length,
      foreignKeys: foreignKeysResult.rows
    });

    const foreignKeys: ForeignKeyInfo[] = foreignKeysResult.rows.map(fk => ({
      columnName: fk.column_name,
      referencedTable: fk.referenced_table,
      referencedColumn: fk.referenced_column,
      constraintName: fk.constraint_name
    }));

    // Get indexes
    const indexesQuery = `
      SELECT 
        i.relname as index_name,
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns,
        ix.indisunique as is_unique,
        ix.indisprimary as is_primary
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      WHERE n.nspname = $1 AND t.relname = $2
      GROUP BY i.relname, ix.indisunique, ix.indisprimary
    `;

    const indexesResult = await this.pool!.query(indexesQuery, [schema, tableName]);

    const indexes: IndexInfo[] = indexesResult.rows.map(idx => ({
      name: idx.index_name,
      columns: idx.columns,
      isUnique: idx.is_unique,
      isPrimary: idx.is_primary
    }));

    // Get row count (with limit for performance)
    let rowCount = 0;
    try {
      const countResult = await this.pool!.query(
        `SELECT COUNT(*) as count FROM ${schema}.${tableName} LIMIT 1000000`
      );
      rowCount = parseInt(countResult.rows[0].count);
    } catch (error) {
      logger.warn(`Could not get row count for ${schema}.${tableName}:`, error);
    }

    return {
      name: tableName,
      schema,
      columns,
      rowCount,
      primaryKey: primaryKeys,
      foreignKeys,
      indexes
    };
  }

  protected buildSelectQuery(tableName: string, limit: number, offset: number): string {
    // PostgreSQL supports standard LIMIT/OFFSET
    return `SELECT * FROM ${this.escapeIdentifier(tableName)} LIMIT ${limit} OFFSET ${offset}`;
  }

  protected escapeIdentifier(identifier: string): string {
    // PostgreSQL uses double quotes for identifiers
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}