import { DatabaseConnection, IDatabaseConnector, DatabaseType } from '@/types/connector';
import { PostgreSQLConnector } from './PostgreSQLConnector';
import { MySQLConnector } from './MySQLConnector';
// Import other connectors as they are implemented
// import { MongoDBConnector } from './MongoDBConnector';
// import { MSSQLConnector } from './MSSQLConnector';
// import { OracleConnector } from './OracleConnector';
// import { DB2Connector } from './DB2Connector';

export function createConnector(connection: DatabaseConnection): IDatabaseConnector {
  switch (connection.type) {
    case 'postgresql':
      return new PostgreSQLConnector(connection);
    
    case 'mysql':
      return new MySQLConnector(connection);
    
    case 'mongodb':
      throw new Error('MongoDB connector not yet implemented');
    
    case 'mssql':
      throw new Error('SQL Server connector not yet implemented');
    
    case 'oracle':
      throw new Error('Oracle connector not yet implemented');
    
    case 'db2':
      throw new Error('DB2 connector not yet implemented');
    
    case 'snowflake':
      throw new Error('Snowflake connector not yet implemented');
    
    case 'redshift':
      throw new Error('Redshift connector not yet implemented');
    
    case 'bigquery':
      throw new Error('BigQuery connector not yet implemented');
    
    default:
      throw new Error(`Unsupported database type: ${connection.type}`);
  }
}

export function getSupportedDatabases(): DatabaseType[] {
  return ['postgresql', 'mysql']; // Add more as they are implemented
}

export function isDatabaseSupported(type: DatabaseType): boolean {
  return getSupportedDatabases().includes(type);
}