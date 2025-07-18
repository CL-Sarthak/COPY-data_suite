// Mock modules before imports
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    end: jest.fn()
  }))
}));

jest.mock('mysql2/promise', () => ({
  createPool: jest.fn().mockReturnValue({
    getConnection: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn()
    }),
    execute: jest.fn(),
    end: jest.fn()
  })
}));

import { PostgreSQLConnector } from '../PostgreSQLConnector';
import { MySQLConnector } from '../MySQLConnector';
import { createConnector, getSupportedDatabases, isDatabaseSupported } from '../connectorFactory';
import { DatabaseConnection, DatabaseType } from '@/types/connector';

describe('Database Connectors Unit Tests', () => {
  const mockConnection: DatabaseConnection = {
    id: 'test-connection',
    name: 'Test Database',
    type: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'testdb',
    username: 'testuser',
    password: 'testpass',
    ssl: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'active'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Connector Factory', () => {
    test('should create PostgreSQL connector', () => {
      const connector = createConnector({
        ...mockConnection,
        type: 'postgresql'
      });
      expect(connector).toBeInstanceOf(PostgreSQLConnector);
    });

    test('should create MySQL connector', () => {
      const connector = createConnector({
        ...mockConnection,
        type: 'mysql'
      });
      expect(connector).toBeInstanceOf(MySQLConnector);
    });

    test('should throw error for unsupported database type', () => {
      expect(() => createConnector({
        ...mockConnection,
        type: 'unsupported' as DatabaseType
      })).toThrow('Unsupported database type: unsupported');
    });

    test('should return supported databases', () => {
      const supported = getSupportedDatabases();
      expect(supported).toContain('postgresql');
      expect(supported).toContain('mysql');
    });

    test('should check if database is supported', () => {
      expect(isDatabaseSupported('postgresql')).toBe(true);
      expect(isDatabaseSupported('mysql')).toBe(true);
      expect(isDatabaseSupported('mongodb' as DatabaseType)).toBe(false);
    });
  });

  describe('PostgreSQL Connector', () => {
    let connector: PostgreSQLConnector;
    let mockPool: any;

    beforeEach(async () => {
      const pg = await import('pg');
      mockPool = {
        query: jest.fn(),
        end: jest.fn()
      };
      pg.Pool.mockImplementation(() => mockPool);
      connector = new PostgreSQLConnector(mockConnection);
    });

    test('should connect successfully', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ test: 1 }] });
      await connector.connect();
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
    });

    test('should handle connection failure', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection failed'));
      await expect(connector.connect()).rejects.toThrow('PostgreSQL connection failed');
    });

    test('should execute query successfully', async () => {
      // First connect
      mockPool.query.mockResolvedValueOnce({ rows: [{ test: 1 }] });
      await connector.connect();

      // Then execute query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Test' }],
        fields: [{ name: 'id' }, { name: 'name' }],
        rowCount: 1
      });

      const result = await connector.executeQuery('SELECT * FROM users');
      expect(result.columns).toEqual(['id', 'name']);
      expect(result.rows).toEqual([[1, 'Test']]);
      expect(result.rowCount).toBe(1);
    });

    test('should test connection', async () => {
      // Mock successful connect and disconnect
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ test: 1 }] }) // connect
        .mockResolvedValueOnce({ rows: [{ test: 1 }], fields: [], rowCount: 1 }); // executeQuery
      
      const result = await connector.testConnection();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
    });

    test('should handle test connection failure', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection refused'));
      const result = await connector.testConnection();
      expect(result.success).toBe(false);
      expect(result.message?.includes('Connection refused')).toBe(true);
    });

    test('should get sample data', async () => {
      // Connect first
      mockPool.query.mockResolvedValueOnce({ rows: [{ test: 1 }] });
      await connector.connect();

      // Mock query result
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ],
        fields: [{ name: 'id' }, { name: 'name' }],
        rowCount: 2
      });

      const sampleData = await connector.getSampleData('users', 10);
      expect(sampleData).toHaveLength(2);
      expect(sampleData[0]).toEqual({ id: 1, name: 'Alice' });
      expect(sampleData[1]).toEqual({ id: 2, name: 'Bob' });
    });

    test('should escape identifiers correctly', () => {
      const escaped = (connector as any).escapeIdentifier('table"name');
      expect(escaped).toBe('"table""name"');
    });

    test('should build select query correctly', () => {
      const query = (connector as any).buildSelectQuery('users', 100, 50);
      expect(query).toBe('SELECT * FROM "users" LIMIT 100 OFFSET 50');
    });
  });

  describe('MySQL Connector', () => {
    let connector: MySQLConnector;
    let mockPool: any;
    let mockConnection: any;

    beforeEach(async () => {
      const mysql = await import('mysql2/promise');
      mockConnection = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockPool = {
        getConnection: jest.fn().mockResolvedValue(mockConnection),
        execute: jest.fn(),
        end: jest.fn()
      };
      mysql.createPool.mockReturnValue(mockPool);
      connector = new MySQLConnector({
        ...mockConnection,
        type: 'mysql'
      });
    });

    test('should connect successfully', async () => {
      mockConnection.query.mockResolvedValueOnce([{ test: 1 }]);
      await connector.connect();
      expect(mockPool.getConnection).toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockConnection.release).toHaveBeenCalled();
    });

    test('should handle connection failure', async () => {
      mockPool.getConnection.mockRejectedValueOnce(new Error('Connection failed'));
      await expect(connector.connect()).rejects.toThrow('MySQL connection failed');
    });

    test('should execute query successfully', async () => {
      // First connect
      mockConnection.query.mockResolvedValueOnce([{ test: 1 }]);
      await connector.connect();

      // Then execute query
      mockPool.execute.mockResolvedValueOnce([
        [{ id: 1, name: 'Test' }],
        [{ name: 'id' }, { name: 'name' }]
      ]);

      const result = await connector.executeQuery('SELECT * FROM users');
      expect(result.columns).toEqual(['id', 'name']);
      expect(result.rows).toEqual([[1, 'Test']]);
      expect(result.rowCount).toBe(1);
    });

    test('should handle non-SELECT queries', async () => {
      // Connect first
      mockConnection.query.mockResolvedValueOnce([{ test: 1 }]);
      await connector.connect();

      // Mock INSERT result
      mockPool.execute.mockResolvedValueOnce([
        { affectedRows: 1, insertId: 123 },
        undefined
      ]);

      const result = await connector.executeQuery('INSERT INTO users (name) VALUES (?)');
      expect(result.columns).toEqual([]);
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(1);
    });

    test('should test connection', async () => {
      // Mock successful connect
      mockConnection.query.mockResolvedValueOnce([{ test: 1 }]);
      // Mock successful executeQuery in testConnection
      mockPool.execute.mockResolvedValueOnce([[{ test: 1 }], []]);
      
      const result = await connector.testConnection();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
    });

    test('should get sample data', async () => {
      // Connect first
      mockConnection.query.mockResolvedValueOnce([{ test: 1 }]);
      await connector.connect();

      // Mock query result
      mockPool.execute.mockResolvedValueOnce([
        [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ],
        [{ name: 'id' }, { name: 'name' }]
      ]);

      const sampleData = await connector.getSampleData('users', 10);
      expect(sampleData).toHaveLength(2);
      expect(sampleData[0]).toEqual({ id: 1, name: 'Alice' });
      expect(sampleData[1]).toEqual({ id: 2, name: 'Bob' });
    });

    test('should escape identifiers correctly', () => {
      const escaped = (connector as any).escapeIdentifier('table`name');
      expect(escaped).toBe('`table``name`');
    });

    test('should build select query correctly', () => {
      const query = (connector as any).buildSelectQuery('users', 100, 50);
      expect(query).toBe('SELECT * FROM `users` LIMIT 100 OFFSET 50');
    });
  });
});