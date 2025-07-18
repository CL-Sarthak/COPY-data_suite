import { testApiHandler } from 'next-test-api-route-handler';
import * as connectionRoute from '@/app/api/database-connections/route';
import * as connectionIdRoute from '@/app/api/database-connections/[id]/route';
import * as testRoute from '@/app/api/database-connections/test/route';
import * as queryRoute from '@/app/api/database-connections/[id]/query/route';
import * as queryImportRoute from '@/app/api/database-connections/[id]/query-import/route';
// import * as schemaRoute from '@/app/api/database-connections/[id]/schema/route';
// import * as importRoute from '@/app/api/database-connections/[id]/import/route';
import { getDatabase } from '@/database/connection';
import { DataSourceService } from '@/services/dataSourceService';
import { createConnector } from '@/services/connectors/connectorFactory';
// import { DatabaseConnectionEntity } from '@/entities/DatabaseConnectionEntity';

// Mock database
jest.mock('@/database/connection');
jest.mock('@/services/connectors/PostgreSQLConnector');
jest.mock('@/services/connectors/MySQLConnector');
jest.mock('@/services/connectors/connectorFactory');
jest.mock('@/services/dataSourceService');
jest.mock('@/utils/logger');

describe('Database Connection API Integration Tests', () => {
  let mockDatabase: any;
  let mockRepository: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
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

  describe('GET /api/database-connections', () => {
    test('should return all database connections', async () => {
      const mockConnections = [
        {
          id: '1',
          name: 'Test DB 1',
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          database: 'testdb1',
          username: 'user1',
          ssl: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'active'
        },
        {
          id: '2',
          name: 'Test DB 2',
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          database: 'testdb2',
          username: 'user2',
          ssl: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'inactive'
        }
      ];

      mockRepository.find.mockResolvedValue(mockConnections);

      await testApiHandler({
        appHandler: connectionRoute,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET'
          });
          
          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data).toHaveLength(2);
          expect(data[0].name).toBe('Test DB 1');
          expect(data[1].name).toBe('Test DB 2');
        }
      });
    });
  });

  describe('POST /api/database-connections', () => {
    test('should create new database connection', async () => {
      const newConnection = {
        name: 'New Connection',
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'newdb',
        username: 'newuser',
        password: 'newpass',
        ssl: false
      };

      const savedConnection = {
        id: 'generated-id',
        ...newConnection,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'inactive'
      };

      mockRepository.create.mockReturnValue(savedConnection);
      mockRepository.save.mockResolvedValue(savedConnection);

      await testApiHandler({
        appHandler: connectionRoute,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(newConnection)
          });
          
          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.id).toBe('generated-id');
          expect(data.name).toBe('New Connection');
          expect(data.status).toBe('inactive');
        }
      });
    });

    test('should return 400 for missing required fields', async () => {
      const invalidConnection = {
        name: 'Invalid Connection'
        // Missing required fields
      };

      await testApiHandler({
        appHandler: connectionRoute,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(invalidConnection)
          });
          
          expect(res.status).toBe(400);
          const data = await res.json();
          expect(data.error).toBe('Missing required fields');
        }
      });
    });
  });

  describe('POST /api/database-connections/test', () => {
    test('should test PostgreSQL connection successfully', async () => {
      const { PostgreSQLConnector } = await import('@/services/connectors/PostgreSQLConnector');
      (PostgreSQLConnector as jest.Mock).mockImplementation(() => ({
        testConnection: jest.fn().mockResolvedValue({
          success: true,
          message: 'Connection successful'
        })
      }));

      const connectionData = {
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'testuser',
        password: 'testpass'
      };

      await testApiHandler({
        appHandler: testRoute,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(connectionData)
          });
          
          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.success).toBe(true);
          expect(data.message).toBe('Connection successful');
        }
      });
    });

    test('should test MySQL connection successfully', async () => {
      const { MySQLConnector } = await import('@/services/connectors/MySQLConnector');
      (MySQLConnector as jest.Mock).mockImplementation(() => ({
        testConnection: jest.fn().mockResolvedValue({
          success: true,
          message: 'Connection successful'
        })
      }));

      const connectionData = {
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'testdb',
        username: 'testuser',
        password: 'testpass'
      };

      await testApiHandler({
        appHandler: testRoute,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(connectionData)
          });
          
          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.success).toBe(true);
        }
      });
    });

    test('should handle connection failure', async () => {
      const { PostgreSQLConnector } = await import('@/services/connectors/PostgreSQLConnector');
      (PostgreSQLConnector as jest.Mock).mockImplementation(() => ({
        testConnection: jest.fn().mockResolvedValue({
          success: false,
          message: 'Connection refused'
        })
      }));

      const connectionData = {
        type: 'postgresql',
        host: 'invalid-host',
        port: 5432,
        database: 'testdb',
        username: 'testuser',
        password: 'wrongpass'
      };

      await testApiHandler({
        appHandler: testRoute,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(connectionData)
          });
          
          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.success).toBe(false);
          expect(data.message).toBe('Connection refused');
        }
      });
    });

    test('should update connection status in database when ID provided', async () => {
      const { PostgreSQLConnector } = await import('@/services/connectors/PostgreSQLConnector');
      (PostgreSQLConnector as jest.Mock).mockImplementation(() => ({
        testConnection: jest.fn().mockResolvedValue({
          success: true,
          message: 'Connection successful'
        })
      }));

      mockRepository.update.mockResolvedValue({ affected: 1 });

      const connectionData = {
        id: 'existing-connection-id',
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'testuser',
        password: 'testpass'
      };

      await testApiHandler({
        appHandler: testRoute,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(connectionData)
          });
          
          expect(res.status).toBe(200);
          expect(mockRepository.update).toHaveBeenCalledWith(
            { id: 'existing-connection-id' },
            expect.objectContaining({
              status: 'active',
              errorMessage: undefined,
              lastTestedAt: expect.any(Date)
            })
          );
        }
      });
    });
  });

  describe('GET /api/database-connections/[id]', () => {
    test('should return specific connection', async () => {
      const mockConnection = {
        id: 'test-id',
        name: 'Test Connection',
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'testuser',
        ssl: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active'
      };

      mockRepository.findOne.mockResolvedValue(mockConnection);

      await testApiHandler({
        appHandler: connectionIdRoute,
        params: { id: 'test-id' },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET'
          });
          
          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.id).toBe('test-id');
          expect(data.name).toBe('Test Connection');
        }
      });
    });

    test('should return 404 for non-existent connection', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await testApiHandler({
        appHandler: connectionIdRoute,
        params: { id: 'non-existent' },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'GET'
          });
          
          expect(res.status).toBe(404);
          const data = await res.json();
          expect(data.error).toBe('Connection not found');
        }
      });
    });
  });

  describe('PUT /api/database-connections/[id]', () => {
    test('should update connection', async () => {
      const existingConnection = {
        id: 'test-id',
        name: 'Old Name',
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'testuser',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active'
      };

      mockRepository.findOne.mockResolvedValue(existingConnection);
      mockRepository.save.mockResolvedValue({
        ...existingConnection,
        name: 'New Name',
        updatedAt: new Date()
      });

      await testApiHandler({
        appHandler: connectionIdRoute,
        params: { id: 'test-id' },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: 'New Name' })
          });
          
          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.name).toBe('New Name');
        }
      });
    });
  });

  describe('DELETE /api/database-connections/[id]', () => {
    test('should delete connection', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await testApiHandler({
        appHandler: connectionIdRoute,
        params: { id: 'test-id' },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'DELETE'
          });
          
          expect(res.status).toBe(204);
          expect(mockRepository.delete).toHaveBeenCalledWith({ id: 'test-id' });
        }
      });
    });
  });

  describe('POST /api/database-connections/[id]/query', () => {
    let mockConnector: any;
    
    beforeEach(() => {
      mockConnector = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        executeQuery: jest.fn()
      };
      
      (createConnector as jest.Mock).mockReturnValue(mockConnector);
    });

    test('should execute a valid SELECT query', async () => {
      const mockConnection = {
        id: '1',
        name: 'Test DB',
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'user',
        status: 'active',
        ssl: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.findOne.mockResolvedValue(mockConnection);
      mockConnector.executeQuery.mockResolvedValue({
        columns: ['id', 'name', 'email'],
        rows: [
          [1, 'John Doe', 'john@example.com'],
          [2, 'Jane Smith', 'jane@example.com']
        ],
        rowCount: 2
      });

      await testApiHandler({
        appHandler: queryRoute,
        params: { id: '1' },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'SELECT * FROM users',
              preview: true
            })
          });
          
          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.columns).toEqual(['id', 'name', 'email']);
          expect(data.rowCount).toBe(2);
          expect(data.preview).toBe(true);
          expect(data.executionTime).toBeDefined();
        }
      });
    });

    test('should reject non-SELECT queries', async () => {
      await testApiHandler({
        appHandler: queryRoute,
        params: { id: '1' },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'UPDATE users SET name = "test"'
            })
          });
          
          expect(res.status).toBe(400);
          const data = await res.json();
          expect(data.error).toBe('Only SELECT queries are allowed');
        }
      });
    });

    test('should reject queries with dangerous keywords', async () => {
      await testApiHandler({
        appHandler: queryRoute,
        params: { id: '1' },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'SELECT * FROM users; DROP TABLE users;'
            })
          });
          
          expect(res.status).toBe(400);
          const data = await res.json();
          expect(data.error).toContain('forbidden keyword');
        }
      });
    });

    test('should add LIMIT clause for preview queries', async () => {
      const mockConnection = {
        id: '1',
        name: 'Test DB',
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'user',
        status: 'active',
        ssl: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.findOne.mockResolvedValue(mockConnection);
      mockConnector.executeQuery.mockResolvedValue({
        columns: ['id'],
        rows: [[1], [2], [3]],
        rowCount: 3
      });

      await testApiHandler({
        appHandler: queryRoute,
        params: { id: '1' },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'SELECT * FROM users',
              preview: true
            })
          });
          
          expect(res.status).toBe(200);
          expect(mockConnector.executeQuery).toHaveBeenCalledWith(
            'SELECT * FROM users LIMIT 100',
            undefined
          );
        }
      });
    });
  });

  describe('POST /api/database-connections/[id]/query-import', () => {
    let mockConnector: any;
    
    beforeEach(() => {
      mockConnector = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        executeQuery: jest.fn()
      };
      
      (createConnector as jest.Mock).mockReturnValue(mockConnector);
      
      // Mock DataSourceService as a class with static methods
      (DataSourceService as any).createDataSource = jest.fn();
    });

    test('should import query results as data source', async () => {
      const mockConnection = {
        id: '1',
        name: 'Test DB',
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'user',
        status: 'active',
        ssl: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.findOne.mockResolvedValue(mockConnection);
      mockConnector.executeQuery.mockResolvedValue({
        columns: ['id', 'name', 'email'],
        rows: [
          [1, 'John Doe', 'john@example.com'],
          [2, 'Jane Smith', 'jane@example.com']
        ],
        rowCount: 2
      });
      
      (DataSourceService.createDataSource as jest.Mock).mockResolvedValue({
        id: 'ds-123',
        name: 'Customer Data'
      });

      await testApiHandler({
        appHandler: queryImportRoute,
        params: { id: '1' },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'SELECT * FROM customers',
              name: 'Customer Data',
              description: 'Imported customer records'
            })
          });
          
          expect(res.status).toBe(200);
          const data = await res.json();
          expect(data.success).toBe(true);
          expect(data.dataSourceId).toBe('ds-123');
          expect(data.rowCount).toBe(2);
          expect(data.executionTime).toBeDefined();
          
          // Verify data source creation
          expect(DataSourceService.createDataSource).toHaveBeenCalledWith({
            name: 'Customer Data',
            type: 'json_transformed',
            connectionStatus: 'connected',
            recordCount: 2,
            metadata: expect.objectContaining({
              totalSize: expect.any(Number),
              lastModified: expect.any(Date)
            }),
            configuration: expect.objectContaining({
              connectionName: 'Test DB',
              databaseType: 'postgresql',
              description: 'Imported customer records - Query: SELECT * FROM customers',
              data: expect.any(Array),
              files: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Customer Data.json',
                  type: 'application/json'
                })
              ])
            })
          });
        }
      });
    });

    test('should reject import without name', async () => {
      await testApiHandler({
        appHandler: queryImportRoute,
        params: { id: '1' },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'SELECT * FROM users'
            })
          });
          
          expect(res.status).toBe(400);
          const data = await res.json();
          expect(data.error).toBe('Name is required');
        }
      });
    });

    test('should handle query execution errors', async () => {
      const mockConnection = {
        id: '1',
        name: 'Test DB',
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'user',
        status: 'active',
        ssl: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.findOne.mockResolvedValue(mockConnection);
      mockConnector.executeQuery.mockRejectedValue(new Error('Table does not exist'));

      await testApiHandler({
        appHandler: queryImportRoute,
        params: { id: '1' },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: 'SELECT * FROM non_existent_table',
              name: 'Test Import'
            })
          });
          
          expect(res.status).toBe(500);
          const data = await res.json();
          expect(data.error).toBe('Table does not exist');
        }
      });
    });
  });
});