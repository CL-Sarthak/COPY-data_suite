// Mock the database connection first
jest.mock('@/database/connection');

import { PostgreSQLConnector } from '@/services/connectors/PostgreSQLConnector';
import { MySQLConnector } from '@/services/connectors/MySQLConnector';
import { createConnector, getSupportedDatabases, isDatabaseSupported } from '@/services/connectors/connectorFactory';
import { DatabaseConnection, DatabaseType } from '@/types/connector';
import { getDatabase } from '@/database/connection';
import { DatabaseConnectionEntity } from '@/entities/DatabaseConnectionEntity';
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

describe('Database Connectors Integration Tests', () => {
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

    test('should get database schema', async () => {
      // Connect first
      mockPool.query.mockResolvedValueOnce({ rows: [{ test: 1 }] });
      await connector.connect();

      // Mock schema query
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          schemaname: 'public',
          tablename: 'users',
          size_bytes: '16384'
        }]
      });

      // Mock table info queries
      mockPool.query
        .mockResolvedValueOnce({ // columns query
          rows: [{
            column_name: 'id',
            data_type: 'integer',
            is_nullable: 'NO',
            column_default: null,
            is_primary_key: true
          }]
        })
        .mockResolvedValueOnce({ rows: [] }) // foreign keys
        .mockResolvedValueOnce({ rows: [] }) // indexes
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }); // row count

      const schema = await connector.getDatabaseSchema();
      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe('users');
      expect(schema.tables[0].columns).toHaveLength(1);
    });

    test('should disconnect properly', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ test: 1 }] });
      await connector.connect();
      await connector.disconnect();
      expect(mockPool.end).toHaveBeenCalled();
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

    test('should get database schema', async () => {
      // Connect first
      mockConnection.query.mockResolvedValueOnce([{ test: 1 }]);
      await connector.connect();

      // Mock schema query
      mockPool.execute.mockResolvedValueOnce([
        [{
          tablename: 'users',
          schemaname: 'testdb',
          size_mb: 0.02
        }]
      ]);

      // Mock table info queries
      mockPool.execute
        .mockResolvedValueOnce([ // columns query
          [{
            COLUMN_NAME: 'id',
            DATA_TYPE: 'int',
            IS_NULLABLE: 'NO',
            COLUMN_DEFAULT: null,
            COLUMN_KEY: 'PRI'
          }]
        ])
        .mockResolvedValueOnce([[]])  // foreign keys
        .mockResolvedValueOnce([[]])  // indexes
        .mockResolvedValueOnce([      // row count
          [{ count: '10' }]
        ]);

      const schema = await connector.getDatabaseSchema();
      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe('users');
      expect(schema.tables[0].columns).toHaveLength(1);
    });

    test('should disconnect properly', async () => {
      mockConnection.query.mockResolvedValueOnce([{ test: 1 }]);
      await connector.connect();
      await connector.disconnect();
      expect(mockPool.end).toHaveBeenCalled();
    });
  });

  describe('Database Connection Entity', () => {
    let mockDatabase: any;
    let mockRepository: any;

    beforeEach(() => {
      mockRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      };

      mockDatabase = {
        getRepository: jest.fn().mockReturnValue(mockRepository)
      };

      (getDatabase as jest.Mock).mockResolvedValue(mockDatabase);
    });

    test('should create database connection entity', async () => {
      const connectionData = {
        name: 'Test Connection',
        type: 'postgresql' as DatabaseType,
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'testuser',
        password: 'testpass',
        ssl: false
      };

      const entity = {
        id: 'generated-id',
        ...connectionData,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'inactive'
      };

      mockRepository.create.mockReturnValue(entity);
      mockRepository.save.mockResolvedValue(entity);

      const database = await getDatabase();
      const repository = database.getRepository(DatabaseConnectionEntity);
      const created = repository.create(connectionData);
      const saved = await repository.save(created);

      expect(saved.id).toBe('generated-id');
      expect(saved.name).toBe('Test Connection');
      expect(saved.type).toBe('postgresql');
    });

    test('should update connection status after test', async () => {
      const connectionId = 'test-connection-id';
      const updateData = {
        status: 'active',
        lastTestedAt: new Date(),
        errorMessage: undefined
      };

      mockRepository.update.mockResolvedValue({ affected: 1 });

      const database = await getDatabase();
      const repository = database.getRepository(DatabaseConnectionEntity);
      await repository.update({ id: connectionId }, updateData);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: connectionId },
        updateData
      );
    });
  });
});