import mysql from 'mysql2/promise';
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

export class MySQLConnector extends BaseDatabaseConnector {
  private pool: mysql.Pool | null = null;

  async connect(): Promise<void> {
    try {
      // Ensure password is either a non-empty string or undefined
      const password = this.connection.password && this.connection.password.trim() !== '' 
        ? this.connection.password 
        : undefined;

      const config: mysql.PoolOptions = {
        host: this.connection.host,
        port: this.connection.port,
        database: this.connection.database,
        user: this.connection.username,
        password: password,
        ssl: this.connection.ssl ? { rejectUnauthorized: false } : undefined,
        connectionLimit: this.options.poolSize,
        connectTimeout: this.options.timeout,
        ...this.connection.additionalOptions
      };

      this.pool = mysql.createPool(config);
      
      // Test the connection
      const connection = await this.pool.getConnection();
      await connection.query('SELECT 1');
      connection.release();
      
      this.isConnected = true;
      
      logger.info(`Connected to MySQL database: ${this.connection.database}`);
    } catch (error) {
      throw this.handleError(error, 'MySQL connection');
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      logger.info(`Disconnected from MySQL database: ${this.connection.database}`);
    }
  }

  async executeQuery(query: string, params?: unknown[]): Promise<QueryResult> {
    this.validateConnection();
    
    try {
      const startTime = Date.now();
      const [rows, fields] = await this.pool!.execute(query, params);
      const executionTime = Date.now() - startTime;

      // Handle different result types
      if (Array.isArray(rows) && fields) {
        return {
          columns: fields.map(field => field.name),
          rows: (rows as mysql.RowDataPacket[]).map(row => Object.values(row)),
          rowCount: (rows as mysql.RowDataPacket[]).length,
          executionTime
        };
      }

      // For non-SELECT queries (INSERT, UPDATE, DELETE)
      const resultSetHeader = rows as mysql.ResultSetHeader;
      return {
        columns: [],
        rows: [],
        rowCount: resultSetHeader.affectedRows || 0,
        executionTime
      };
    } catch (error) {
      throw this.handleError(error, 'Query execution');
    }
  }

  async getDatabaseSchema(): Promise<DatabaseSchema> {
    this.validateConnection();

    try {
      // Get all tables in the database
      const tablesQuery = `
        SELECT 
          TABLE_NAME as tablename,
          TABLE_SCHEMA as schemaname,
          ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as size_mb
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `;

      const [tablesResult] = await this.pool!.execute(tablesQuery);
      const tables: TableInfo[] = [];

      for (const table of tablesResult as mysql.RowDataPacket[]) {
        const tableInfo = await this.getTableInfo(table.schemaname, table.tablename);
        tableInfo.sizeInBytes = Math.round((table.size_mb || 0) * 1024 * 1024);
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
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE,
        COLUMN_KEY,
        EXTRA
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;

    const [columnsResult] = await this.pool!.execute(columnsQuery, [schema, tableName]);

    const columns: ColumnInfo[] = (columnsResult as mysql.RowDataPacket[]).map(col => ({
      name: col.COLUMN_NAME,
      dataType: col.DATA_TYPE,
      nullable: col.IS_NULLABLE === 'YES',
      defaultValue: col.COLUMN_DEFAULT,
      isPrimaryKey: col.COLUMN_KEY === 'PRI',
      maxLength: col.CHARACTER_MAXIMUM_LENGTH,
      precision: col.NUMERIC_PRECISION,
      scale: col.NUMERIC_SCALE,
      extra: col.EXTRA
    }));

    // Get primary keys
    const primaryKeys = columns
      .filter(col => col.isPrimaryKey)
      .map(col => col.name);

    // Get foreign keys
    const foreignKeysQuery = `
      SELECT 
        COLUMN_NAME,
        REFERENCED_TABLE_NAME as referenced_table,
        REFERENCED_COLUMN_NAME as referenced_column,
        CONSTRAINT_NAME as constraint_name
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `;

    const [foreignKeysResult] = await this.pool!.execute(foreignKeysQuery, [schema, tableName]);

    const foreignKeys: ForeignKeyInfo[] = (foreignKeysResult as mysql.RowDataPacket[]).map(fk => ({
      columnName: fk.COLUMN_NAME,
      referencedTable: fk.referenced_table,
      referencedColumn: fk.referenced_column,
      constraintName: fk.constraint_name
    }));

    // Get indexes
    const indexesQuery = `
      SELECT 
        INDEX_NAME as index_name,
        NON_UNIQUE,
        GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as columns
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      GROUP BY INDEX_NAME, NON_UNIQUE
    `;

    const [indexesResult] = await this.pool!.execute(indexesQuery, [schema, tableName]);

    const indexes: IndexInfo[] = (indexesResult as mysql.RowDataPacket[]).map(idx => ({
      name: idx.index_name,
      columns: idx.columns.split(','),
      isUnique: !idx.NON_UNIQUE,
      isPrimary: idx.index_name === 'PRIMARY'
    }));

    // Get row count (with limit for performance)
    let rowCount = 0;
    try {
      const countResult = await this.pool!.execute(
        `SELECT COUNT(*) as count FROM \`${schema}\`.\`${tableName}\` LIMIT 1`
      );
      rowCount = parseInt((countResult[0] as mysql.RowDataPacket[])[0].count);
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
    // MySQL supports standard LIMIT/OFFSET
    return `SELECT * FROM ${this.escapeIdentifier(tableName)} LIMIT ${limit} OFFSET ${offset}`;
  }

  protected escapeIdentifier(identifier: string): string {
    // MySQL uses backticks for identifiers
    return `\`${identifier.replace(/`/g, '``')}\``;
  }
}