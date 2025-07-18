import { NextRequest } from 'next/server';
import { GET } from '../suggestions/route';
import { DataSourceService } from '@/services/dataSourceService';
import { CatalogMappingService } from '@/services/catalogMappingService';

// Mock the services
jest.mock('@/services/dataSourceService');
jest.mock('@/services/catalogMappingService');
jest.mock('@/database/connection', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn()
    })
  })
}));
jest.mock('@/entities/DataSourceEntity', () => ({
  DataSourceEntity: class {}
}));
jest.mock('@/services/storage/storageService', () => ({
  StorageService: {
    getInstance: jest.fn(() => ({
      getFileAsString: jest.fn().mockImplementation((key) => {
        // Return different CSV content based on the test context
        if (key === 'users.csv') {
          return Promise.resolve('first_name,last_name,email_address\nJohn,Doe,john@example.com');
        }
        // Default CSV content for other tests
        return Promise.resolve('name,email\nJohn,john@example.com');
      })
    }))
  }
}));

const mockDataSourceService = DataSourceService as jest.Mocked<typeof DataSourceService>;
const mockCatalogMappingService = CatalogMappingService as jest.Mocked<typeof CatalogMappingService>;

describe('/api/catalog/suggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to mock database entity
  const mockDatabaseEntity = (entityData: any) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getDatabase } = require('@/database/connection');
    getDatabase.mockResolvedValue({
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn().mockResolvedValue(entityData)
      })
    });
  };

  describe('GET /api/catalog/suggestions', () => {
    it('should return mapping suggestions for a data source', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/catalog/suggestions?sourceId=source-1');
      
      const mockDataSource = {
        id: 'source-1',
        name: 'Test Source',
        type: 'json_transformed' as const,
        connectionStatus: 'connected' as const,
        configuration: {} as any,
        originalFieldNames: '["first_name", "last_name", "email"]',
        transformedData: JSON.stringify({
          records: [
            { first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
          ]
        })
      };

      // Mock the database entity response
      mockDatabaseEntity({
        id: 'source-1',
        originalFieldNames: '["first_name", "last_name", "email"]'
      });

      const mockSuggestions = [
        {
          sourceFieldName: 'first_name',
          suggestedMappings: [
            {
              field: { 
                id: 'field-1', 
                name: 'firstName', 
                displayName: 'First Name',
                description: 'First name',
                dataType: 'string' as const,
                category: 'personal',
                isRequired: false,
                isStandard: true,
                tags: [],
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z'
              },
              confidence: 0.95,
              reason: 'Exact name match'
            }
          ]
        }
      ];

      mockDataSourceService.getDataSourceById.mockResolvedValue(mockDataSource);
      mockCatalogMappingService.generateMappingSuggestions.mockResolvedValue(mockSuggestions);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions).toEqual(mockSuggestions);
      expect(data.sourceFields).toEqual(['first_name', 'last_name', 'email']);
      expect(data.strategy).toBe('stored_original_fields');
    });

    it('should fallback to transformation data when original fields not available', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/catalog/suggestions?sourceId=source-1');
      
      const mockDataSource = {
        id: 'source-1',
        name: 'Test Source',
        type: 'json_transformed' as const,
        connectionStatus: 'connected' as const,
        configuration: {} as any
      };

      // Mock the database entity response with transformedData
      mockDatabaseEntity({
        id: 'source-1',
        originalFieldNames: null,
        transformedData: JSON.stringify({
          records: [
            { name: 'John Doe', email: 'john@example.com' }
          ]
        })
      });

      mockDataSourceService.getDataSourceById.mockResolvedValue(mockDataSource);
      mockCatalogMappingService.generateMappingSuggestions.mockResolvedValue([]);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sourceFields).toEqual(['name', 'email']);
      expect(data.strategy).toBe('transformation_data_fields');
    });

    it('should fallback to existing mappings when no transformation data', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/catalog/suggestions?sourceId=source-1');
      
      const mockDataSource = {
        id: 'source-1',
        name: 'Test Source',
        type: 'database' as const,
        connectionStatus: 'connected' as const,
        configuration: {} as any,
        originalFieldNames: null,
        transformedData: null
      };

      const mockMappings = [
        {
          id: '1',
          sourceId: 'source-1',
          sourceFieldName: 'user_name',
          catalogFieldId: 'field-1',
          confidence: 0.95,
          isManual: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      // Mock database entity
      mockDatabaseEntity({
        id: 'source-1',
        originalFieldNames: null,
        transformedData: null
      });

      mockDataSourceService.getDataSourceById.mockResolvedValue(mockDataSource);
      mockCatalogMappingService.getFieldMappings.mockResolvedValue(mockMappings);
      mockCatalogMappingService.generateMappingSuggestions.mockResolvedValue([]);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sourceFields).toEqual(['user_name']);
      expect(data.strategy).toBe('existing_mappings');
    });

    it('should fallback to external storage when other methods fail', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/catalog/suggestions?sourceId=source-1');
      
      const mockDataSource = {
        id: 'source-1',
        name: 'Test Source',
        type: 'filesystem' as const,
        connectionStatus: 'connected' as const,
        configuration: {
          files: [
            { name: 'data.csv', type: 'text/csv' }
          ]
        } as any,
        originalFieldNames: null,
        transformedData: null,
        storageKeys: '["file1.csv"]',
        storageProvider: 'local'
      };

      // Mock database entity with storage keys
      mockDatabaseEntity({
        id: 'source-1',
        originalFieldNames: null,
        transformedData: null,
        storageKeys: '["file1.csv"]',
        storageProvider: 'local'
      });


      mockDataSourceService.getDataSourceById.mockResolvedValue(mockDataSource);
      mockCatalogMappingService.getFieldMappings.mockResolvedValue([]);
      mockCatalogMappingService.generateMappingSuggestions.mockResolvedValue([]);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sourceFields).toEqual(['name', 'email']);
      expect(data.strategy).toBe('external_storage_parsing');
    });

    it('should return 400 when sourceId is missing', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/catalog/suggestions');

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('sourceId parameter is required');
    });

    it('should return 404 when data source is not found', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/catalog/suggestions?sourceId=nonexistent');

      mockDataSourceService.getDataSourceById.mockResolvedValue(null);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Data source not found');
    });

    it('should handle empty data sources gracefully', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/catalog/suggestions?sourceId=source-1');
      
      const mockDataSource = {
        id: 'source-1',
        name: 'Empty Source',
        type: 'json_transformed' as const,
        connectionStatus: 'connected' as const,
        configuration: {} as any
      };

      // Mock database entity
      mockDatabaseEntity({
        id: 'source-1',
        originalFieldNames: null,
        transformedData: null
      });

      mockDataSourceService.getDataSourceById.mockResolvedValue(mockDataSource);
      mockCatalogMappingService.getFieldMappings.mockResolvedValue([]);
      mockCatalogMappingService.generateMappingSuggestions.mockResolvedValue([]);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sourceFields).toEqual([]);
      expect(data.suggestions).toEqual([]);
      expect(data.strategy).toBe('no_fields_found');
    });

    it('should handle JSON parsing errors in transformation data', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/catalog/suggestions?sourceId=source-1');
      
      const mockDataSource = {
        id: 'source-1',
        name: 'Test Source',
        type: 'json_transformed' as const,
        connectionStatus: 'connected' as const,
        configuration: {} as any
      };

      // Mock database entity with invalid JSON
      mockDatabaseEntity({
        id: 'source-1',
        originalFieldNames: null,
        transformedData: 'invalid json'
      });

      mockDataSourceService.getDataSourceById.mockResolvedValue(mockDataSource);
      mockCatalogMappingService.getFieldMappings.mockResolvedValue([]);
      mockCatalogMappingService.generateMappingSuggestions.mockResolvedValue([]);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.strategy).toBe('no_fields_found');  // When JSON parsing fails and no mappings exist, we get no fields
    });

    it('should handle CSV parsing from external storage', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/catalog/suggestions?sourceId=source-1');
      
      const mockDataSource = {
        id: 'source-1',
        name: 'CSV Source',
        type: 'filesystem' as const,
        connectionStatus: 'connected' as const,
        configuration: {
          files: [
            { name: 'users.csv', type: 'text/csv' }
          ]
        } as any,
        originalFieldNames: null,
        transformedData: null,
        storageKeys: '["users.csv"]',
        storageProvider: 'local'
      };

      // Mock database entity with storage keys
      mockDatabaseEntity({
        id: 'source-1',
        originalFieldNames: null,
        transformedData: null,
        storageKeys: '["users.csv"]',
        storageProvider: 'local'
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('first_name,last_name,email_address\nJohn,Doe,john@example.com')
      });

      mockDataSourceService.getDataSourceById.mockResolvedValue(mockDataSource);
      mockCatalogMappingService.getFieldMappings.mockResolvedValue([]);
      mockCatalogMappingService.generateMappingSuggestions.mockResolvedValue([]);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sourceFields).toEqual(['first_name', 'last_name', 'email_address']);
      expect(data.strategy).toBe('external_storage_parsing');
    });

    it('should handle external storage fetch failures', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/catalog/suggestions?sourceId=source-1');
      
      const mockDataSource = {
        id: 'source-1',
        name: 'CSV Source',
        type: 'filesystem' as const,
        connectionStatus: 'connected' as const,
        configuration: {
          files: [
            { name: 'users.csv', type: 'text/csv' }
          ]
        } as any,
        originalFieldNames: null,
        transformedData: null,
        storageKeys: '["failing-file.csv"]',
        storageProvider: 'local'
      };

      // Mock database entity with storage keys
      mockDatabaseEntity({
        id: 'source-1',
        originalFieldNames: null,
        transformedData: null,
        storageKeys: '["failing-file.csv"]',
        storageProvider: 'local'
      });

      // Mock the storage service to throw an error for this specific test
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { StorageService } = require('@/services/storage/storageService');
      StorageService.getInstance.mockReturnValue({
        getFileAsString: jest.fn().mockRejectedValue(new Error('Storage access failed'))
      });

      mockDataSourceService.getDataSourceById.mockResolvedValue(mockDataSource);
      mockCatalogMappingService.getFieldMappings.mockResolvedValue([]);
      mockCatalogMappingService.generateMappingSuggestions.mockResolvedValue([]);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sourceFields).toEqual([]);
      expect(data.strategy).toBe('no_fields_found');
    });

    it('should handle service errors gracefully', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/catalog/suggestions?sourceId=source-1');

      mockDataSourceService.getDataSourceById.mockRejectedValue(new Error('Database error'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get mapping suggestions');
    });
  });
});