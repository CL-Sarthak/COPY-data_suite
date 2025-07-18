import { testApiHandler } from 'next-test-api-route-handler';
import * as importRoute from '@/app/api/database-connections/[id]/import/route';
import { getDatabase } from '@/database/connection';
import { createConnector } from '@/services/connectors/connectorFactory';
import { RelationalDataService } from '@/services/relationalDataService';
import { ClusterPatternService } from '@/services/clusterPatternService';

// Mock dependencies
jest.mock('@/database/connection');
jest.mock('@/services/connectors/connectorFactory');
jest.mock('@/services/relationalDataService');
jest.mock('@/services/clusterPatternService');
jest.mock('@/utils/logger');

describe('Database Import with Cluster Detection', () => {
  let mockDatabase: any;
  let mockConnectionRepo: any;
  let mockDataSourceRepo: any;
  let mockPatternRepo: any;
  let mockConnector: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock repositories
    mockConnectionRepo = {
      findOne: jest.fn()
    };
    
    mockDataSourceRepo = {
      create: jest.fn(),
      save: jest.fn()
    };
    
    mockPatternRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn()
    };

    mockDatabase = {
      getRepository: jest.fn((entity: any) => {
        if (entity.name === 'DatabaseConnectionEntity') return mockConnectionRepo;
        if (entity.name === 'DataSourceEntity') return mockDataSourceRepo;
        if (entity.name === 'PatternEntity') return mockPatternRepo;
        return {};
      })
    };

    mockConnector = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      getDatabaseSchema: jest.fn(),
      getTableCount: jest.fn(),
      getSampleData: jest.fn()
    };

    (getDatabase as jest.Mock).mockResolvedValue(mockDatabase);
    (createConnector as jest.Mock).mockReturnValue(mockConnector);
  });

  describe('POST /api/database-connections/[id]/import with cluster detection', () => {
    it('should detect clusters when enableClusterDetection is true', async () => {
      // Mock connection
      const mockConnection = {
        id: 'conn-123',
        name: 'Test DB',
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'testuser',
        password: 'testpass',
        status: 'active'
      };
      mockConnectionRepo.findOne.mockResolvedValue(mockConnection);

      // Mock relational service
      const mockRelationalService = {
        analyzeSchema: jest.fn().mockResolvedValue({
          tables: new Map([
            ['customers', { columns: [], primaryKey: [], foreignKeys: [], indexes: [] }],
            ['orders', { columns: [], primaryKey: [], foreignKeys: [], indexes: [] }]
          ]),
          relationships: []
        }),
        importRelationalData: jest.fn().mockResolvedValue([
          {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            phone: '555-1234',
            orders: [
              {
                id: 101,
                total: 100,
                billing_address: {
                  street: '123 Main St',
                  city: 'Boston',
                  state: 'MA',
                  zipCode: '02101'
                }
              }
            ]
          }
        ]),
        getRelationshipDiagram: jest.fn().mockReturnValue('Customer -> Orders')
      };

      (RelationalDataService as jest.Mock).mockImplementation(() => mockRelationalService);

      // Mock cluster detection
      const mockClusters = [
        {
          name: 'Personal Identity Information',
          fields: ['name', 'email', 'phone'],
          confidence: 0.95
        },
        {
          name: 'Complete Address',
          fields: ['orders[0].billing_address.street', 'orders[0].billing_address.city', 'orders[0].billing_address.state', 'orders[0].billing_address.zipCode'],
          confidence: 0.90
        }
      ];

      (ClusterPatternService.flattenRelationalData as jest.Mock).mockReturnValue([
        { fieldName: 'name', value: 'John Doe' },
        { fieldName: 'email', value: 'john@example.com' },
        { fieldName: 'phone', value: '555-1234' }
      ]);

      (ClusterPatternService.detectClusters as jest.Mock).mockReturnValue(mockClusters);

      // Mock data source creation
      mockDataSourceRepo.create.mockImplementation((data: any) => ({
        ...data,
        id: 'ds-456'
      }));
      mockDataSourceRepo.save.mockImplementation((ds: any) => Promise.resolve(ds));

      // Mock pattern repository
      mockPatternRepo.findOne.mockResolvedValue(null); // No existing patterns
      mockPatternRepo.create.mockImplementation((data: any) => ({ ...data }));
      mockPatternRepo.save.mockImplementation((p: any) => Promise.resolve(p));

      // Test the API
      await testApiHandler({
        appHandler: importRoute,
        params: { id: 'conn-123' },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              relationalImport: true,
              primaryTable: 'customers',
              name: 'Customer Data with Relations',
              description: 'Test import',
              maxDepth: 2,
              followReverse: true,
              sampleSize: 100,
              enableClusterDetection: true
            })
          });
          
          expect(res.status).toBe(200);
          const data = await res.json();
          
          // Verify response
          expect(data.success).toBe(true);
          expect(data.dataSourceId).toBe('ds-456');
          expect(data.detectedClusters).toBeDefined();
          expect(data.detectedClusters).toHaveLength(2);
          expect(data.detectedClusters[0].name).toBe('Personal Identity Information');
          expect(data.detectedClusters[1].name).toBe('Complete Address');
          
          // Verify cluster detection was called
          expect(ClusterPatternService.flattenRelationalData).toHaveBeenCalledWith([
            expect.objectContaining({
              name: 'John Doe',
              email: 'john@example.com'
            })
          ]);
          expect(ClusterPatternService.detectClusters).toHaveBeenCalled();
          
          // Verify patterns were created
          expect(mockPatternRepo.create).toHaveBeenCalledTimes(2);
          expect(mockPatternRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
              name: 'Personal Identity Information Cluster',
              description: 'Cluster pattern for Personal Identity Information detected in relational data',
              metadata: expect.stringContaining('"type":"cluster"')
            })
          );
        }
      });
    });

    it('should not detect clusters when enableClusterDetection is false', async () => {
      // Mock connection
      mockConnectionRepo.findOne.mockResolvedValue({
        id: 'conn-123',
        name: 'Test DB',
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'testuser',
        password: 'testpass',
        status: 'active'
      });

      // Mock regular table import
      mockConnector.getDatabaseSchema.mockResolvedValue({
        tables: [{ name: 'users', columns: [], primaryKey: [], foreignKeys: [], indexes: [] }]
      });
      mockConnector.getTableCount.mockResolvedValue(50);
      mockConnector.getSampleData.mockResolvedValue([
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' }
      ]);

      mockDataSourceRepo.create.mockImplementation((data: any) => ({
        ...data,
        id: 'ds-789'
      }));
      mockDataSourceRepo.save.mockImplementation((ds: any) => Promise.resolve(ds));

      await testApiHandler({
        appHandler: importRoute,
        params: { id: 'conn-123' },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tableName: 'users',
              name: 'User Table',
              sampleSize: 10
            })
          });
          
          expect(res.status).toBe(200);
          const data = await res.json();
          
          // Verify no cluster detection
          expect(data.detectedClusters).toBeUndefined();
          expect(ClusterPatternService.flattenRelationalData).not.toHaveBeenCalled();
          expect(ClusterPatternService.detectClusters).not.toHaveBeenCalled();
          expect(mockPatternRepo.create).not.toHaveBeenCalled();
        }
      });
    });

    it('should handle cluster detection errors gracefully', async () => {
      // Mock connection
      mockConnectionRepo.findOne.mockResolvedValue({
        id: 'conn-123',
        name: 'Test DB',
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        username: 'testuser',
        password: 'testpass',
        status: 'active'
      });

      // Mock relational service
      const mockRelationalService = {
        analyzeSchema: jest.fn().mockResolvedValue({
          tables: new Map([['customers', {}]]),
          relationships: []
        }),
        importRelationalData: jest.fn().mockResolvedValue([{ id: 1, name: 'Test' }]),
        getRelationshipDiagram: jest.fn().mockReturnValue('Test')
      };

      (RelationalDataService as jest.Mock).mockImplementation(() => mockRelationalService);

      // Make cluster detection throw an error
      (ClusterPatternService.flattenRelationalData as jest.Mock).mockImplementation(() => {
        throw new Error('Cluster detection failed');
      });

      mockDataSourceRepo.create.mockImplementation((data: any) => ({
        ...data,
        id: 'ds-error'
      }));
      mockDataSourceRepo.save.mockImplementation((ds: any) => Promise.resolve(ds));

      await testApiHandler({
        appHandler: importRoute,
        params: { id: 'conn-123' },
        test: async ({ fetch }) => {
          const res = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              relationalImport: true,
              primaryTable: 'customers',
              name: 'Test Import',
              enableClusterDetection: true
            })
          });
          
          // Import should succeed even if cluster detection fails
          expect(res.status).toBe(200);
          const data = await res.json();
          
          expect(data.success).toBe(true);
          expect(data.dataSourceId).toBe('ds-error');
          expect(data.detectedClusters).toBeUndefined();
        }
      });
    });
  });
});