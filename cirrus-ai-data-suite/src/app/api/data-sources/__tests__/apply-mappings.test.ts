import { NextRequest } from 'next/server';
import { POST } from '../[id]/transform/apply-mappings/route';

// Mock the database connection
jest.mock('@/database/connection', () => ({
  getDatabase: jest.fn()
}));

jest.mock('@/entities/DataSourceEntity', () => ({
  DataSourceEntity: class {}
}));
jest.mock('@/entities/FieldMappingEntity', () => ({
  FieldMappingEntity: class {}
}));
jest.mock('@/entities/CatalogFieldEntity', () => ({
  CatalogFieldEntity: class {}
}));

jest.mock('@/services/globalCatalogService', () => ({
  GlobalCatalogService: {
    getCatalogField: jest.fn(),
    validateFieldValue: jest.fn(() => ({ isValid: true, errors: [] }))
  }
}));

describe('/api/data-sources/[id]/transform/apply-mappings', () => {
  const mockParams = Promise.resolve({ id: 'source-1' });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST apply-mappings', () => {
    it('should apply field mappings and transform data successfully', async () => {
      const requestBody = {
        forceRetransform: true
      };

      const mockRequest = new NextRequest('http://localhost:3000/api/data-sources/source-1/transform/apply-mappings', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const mockDataSource = {
        id: 'source-1',
        name: 'Test Source',
        type: 'json_transformed',
        configuration: JSON.stringify({
          transformedData: [
            { first_name: 'John', email: 'john@example.com' },
            { first_name: 'Jane', email: 'jane@example.com' }
          ]
        }),
        transformedData: null,
        transformationAppliedAt: null
      };

      const mockFieldMappings = [
        {
          id: '1',
          sourceId: 'source-1',
          sourceFieldName: 'first_name',
          catalogFieldId: 'field-1'
        },
        {
          id: '2',
          sourceId: 'source-1',
          sourceFieldName: 'email',
          catalogFieldId: 'field-2'
        }
      ];

      const mockCatalogFields = [
        {
          id: 'field-1',
          name: 'firstName',
          displayName: 'First Name',
          dataType: 'string',
          description: 'First name',
          category: 'personal',
          isRequired: false,
          isStandard: true,
          tags: '[]',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: 'field-2',
          name: 'email',
          displayName: 'Email',
          dataType: 'string',
          description: 'Email address',
          category: 'contact',
          isRequired: false,
          isStandard: true,
          tags: '[]',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getDatabase } = require('@/database/connection');
      const mockUpdate = jest.fn();
      
      getDatabase.mockResolvedValue({
        getRepository: jest.fn((entity) => {
          if (entity.name === 'DataSourceEntity') {
            return {
              findOne: jest.fn().mockResolvedValue(mockDataSource),
              update: mockUpdate
            };
          } else if (entity.name === 'FieldMappingEntity') {
            return {
              find: jest.fn().mockResolvedValue(mockFieldMappings)
            };
          } else if (entity.name === 'CatalogFieldEntity') {
            return {
              find: jest.fn().mockResolvedValue(mockCatalogFields)
            };
          }
          return {};
        })
      });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.transformedRecords).toBe(2);
      expect(data.statistics.mappedFields).toBe(2);
      expect(data.statistics.totalRecords).toBe(2);
      expect(mockUpdate).toHaveBeenCalledWith('source-1', expect.objectContaining({
        transformedData: expect.any(String),
        transformationStatus: 'completed'
      }));
    });

    it('should return 404 when data source not found', async () => {
      const requestBody = {};

      const mockRequest = new NextRequest('http://localhost:3000/api/data-sources/nonexistent/transform/apply-mappings', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getDatabase } = require('@/database/connection');
      getDatabase.mockResolvedValue({
        getRepository: jest.fn(() => ({
          findOne: jest.fn().mockResolvedValue(null)
        }))
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Data source not found');
    });

    it('should return message when transformation exists and not forced', async () => {
      const requestBody = { forceRetransform: false };

      const mockRequest = new NextRequest('http://localhost:3000/api/data-sources/source-1/transform/apply-mappings', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const existingTransformDate = new Date('2024-01-01');
      const mockDataSource = {
        id: 'source-1',
        name: 'Test Source',
        transformedData: JSON.stringify([{name: 'John'}, {name: 'Jane'}]),
        transformationAppliedAt: existingTransformDate
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getDatabase } = require('@/database/connection');
      getDatabase.mockResolvedValue({
        getRepository: jest.fn((entity) => {
          if (entity.name === 'DataSourceEntity') {
            return {
              findOne: jest.fn().mockResolvedValue(mockDataSource)
            };
          }
          return {};
        })
      });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Existing transformation detected');
      expect(data.requiresConfirmation).toBe(true);
      expect(data.recordCount).toBe(2);
    });

    it('should return 400 when no field mappings exist', async () => {
      const requestBody = {};

      const mockRequest = new NextRequest('http://localhost:3000/api/data-sources/source-1/transform/apply-mappings', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const mockDataSource = {
        id: 'source-1',
        name: 'Test Source',
        type: 'json_transformed',
        configuration: '{}'
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getDatabase } = require('@/database/connection');
      getDatabase.mockResolvedValue({
        getRepository: jest.fn((entity) => {
          if (entity.name === 'DataSourceEntity') {
            return {
              findOne: jest.fn().mockResolvedValue(mockDataSource)
            };
          } else if (entity.name === 'FieldMappingEntity') {
            return {
              find: jest.fn().mockResolvedValue([]) // No mappings
            };
          }
          return {
            find: jest.fn().mockResolvedValue([])
          };
        })
      });

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No field mappings found. Please map fields before applying transformations.');
    });

    it('should handle service errors gracefully', async () => {
      const requestBody = {};

      const mockRequest = new NextRequest('http://localhost:3000/api/data-sources/source-1/transform/apply-mappings', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getDatabase } = require('@/database/connection');
      getDatabase.mockRejectedValue(new Error('Database connection failed'));

      const response = await POST(mockRequest, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to apply field mappings');
    });
  });
});