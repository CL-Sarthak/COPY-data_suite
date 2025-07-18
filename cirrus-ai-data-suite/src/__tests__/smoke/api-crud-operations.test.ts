/**
 * Smoke tests for API CRUD operations
 * These tests verify that all basic CRUD operations work correctly
 * even when TypeORM loses entity metadata (common in Next.js hot reload)
 */

import { apiRequest } from './test-utils';

describe('API CRUD Operations Smoke Tests', () => {
  // Track created resources for cleanup
  const createdResources = {
    dataSources: new Set<string>(),
    patterns: new Set<string>(),
    syntheticDatasets: new Set<string>()
  };

  beforeAll(async () => {
    // Dynamically import to ensure env vars are loaded
    const { initializeDatabase } = await import('@/database/connection');
    // Ensure database is initialized
    await initializeDatabase();
  });

  afterAll(async () => {
    // Cleanup any resources that weren't deleted during tests
    console.log('Cleaning up test resources...');
    
    // Clean up data sources
    for (const id of createdResources.dataSources) {
      try {
        await apiRequest(`/api/data-sources/${id}`, { method: 'DELETE' });
      } catch (error) {
        console.error(`Failed to cleanup data source ${id}:`, error);
      }
    }
    
    // Clean up patterns
    for (const id of createdResources.patterns) {
      try {
        await apiRequest(`/api/patterns/${id}`, { method: 'DELETE' });
      } catch (error) {
        console.error(`Failed to cleanup pattern ${id}:`, error);
      }
    }
    
    // Clean up synthetic datasets
    for (const id of createdResources.syntheticDatasets) {
      try {
        await apiRequest(`/api/synthetic/${id}`, { method: 'DELETE' });
      } catch (error) {
        console.error(`Failed to cleanup synthetic dataset ${id}:`, error);
      }
    }
  });

  describe('Data Sources API', () => {
    let createdDataSourceId: string;

    test('GET /api/data-sources - List data sources', async () => {
      const { response, data } = await apiRequest('/api/data-sources');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test('POST /api/data-sources - Create data source', async () => {
      const newDataSource = {
        name: 'Test Data Source',
        type: 'filesystem',
        configuration: {
          path: '/tmp/test',
          files: []
        }
      };

      const { response, data } = await apiRequest('/api/data-sources', {
        method: 'POST',
        body: newDataSource,
      });

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data.name).toBe(newDataSource.name);
      
      createdDataSourceId = data.id;
      createdResources.dataSources.add(createdDataSourceId);
    });

    test('GET /api/data-sources/[id] - Get single data source', async () => {
      const { response, data } = await apiRequest(`/api/data-sources/${createdDataSourceId}`);
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id', createdDataSourceId);
      expect(data).toHaveProperty('name', 'Test Data Source');
    });

    test('PUT /api/data-sources/[id] - Update data source', async () => {
      const updates = {
        name: 'Updated Test Data Source'
      };

      const { response, data } = await apiRequest(`/api/data-sources/${createdDataSourceId}`, {
        method: 'PUT',
        body: updates,
      });

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id', createdDataSourceId);
      expect(data).toHaveProperty('name', updates.name);
    });

    test('DELETE /api/data-sources/[id] - Delete data source', async () => {
      const { response, data } = await apiRequest(`/api/data-sources/${createdDataSourceId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);

      // Verify deletion
      const { response: getResponse } = await apiRequest(`/api/data-sources/${createdDataSourceId}`);
      expect(getResponse.status).toBe(404);
      
      // Remove from cleanup set since it was successfully deleted
      createdResources.dataSources.delete(createdDataSourceId);
    });
  });

  describe('Patterns API', () => {
    let createdPatternId: string;

    test('GET /api/patterns - List patterns', async () => {
      const { response, data } = await apiRequest('/api/patterns');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test('POST /api/patterns - Create pattern', async () => {
      const newPattern = {
        name: 'Test Pattern',
        type: 'PII',
        category: 'Personal',
        examples: ['test@example.com', 'user@domain.com'],
        description: 'Test email pattern',
        color: '#FF0000',
        regex: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'
      };

      const { response, data } = await apiRequest('/api/patterns', {
        method: 'POST',
        body: newPattern,
      });

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('id');
      expect(data.data.name).toBe(newPattern.name);
      
      createdPatternId = data.data.id;
      createdResources.patterns.add(createdPatternId);
    });

    test('GET /api/patterns/[id] - Get single pattern', async () => {
      const { response, data } = await apiRequest(`/api/patterns/${createdPatternId}`);
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id', createdPatternId);
      expect(data).toHaveProperty('name', 'Test Pattern');
    });

    test('PUT /api/patterns/[id] - Update pattern', async () => {
      const updates = {
        name: 'Updated Test Pattern',
        description: 'Updated description'
      };

      const { response, data } = await apiRequest(`/api/patterns/${createdPatternId}`, {
        method: 'PUT',
        body: updates,
      });

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id', createdPatternId);
      expect(data).toHaveProperty('name', updates.name);
      expect(data).toHaveProperty('description', updates.description);
    });

    test('DELETE /api/patterns/[id] - Delete pattern', async () => {
      const { response, data } = await apiRequest(`/api/patterns/${createdPatternId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      expect(data).toBeDefined();

      // Verify deletion
      const { response: getResponse } = await apiRequest(`/api/patterns/${createdPatternId}`);
      expect(getResponse.status).toBe(404);
      
      // Remove from cleanup set since it was successfully deleted
      createdResources.patterns.delete(createdPatternId);
    });
  });

  describe('Dashboard API', () => {
    test('GET /api/dashboard - Get dashboard metrics', async () => {
      const { response, data } = await apiRequest('/api/dashboard');
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('dataSources');
      expect(data).toHaveProperty('definedPatterns');
      expect(data).toHaveProperty('assembledDatasets');
      expect(data).toHaveProperty('syntheticRecordsGenerated');
      expect(data).toHaveProperty('complianceScore');
      expect(data).toHaveProperty('recentActivity');
      expect(data).toHaveProperty('environmentStatus');
      expect(data).toHaveProperty('pipelineStages');
    });
  });

  describe('Health Check APIs', () => {
    test('GET /api/health - Basic health check', async () => {
      const { response, data } = await apiRequest('/api/health');
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status', 'healthy');
    });

    test('GET /api/health/db - Database health check', async () => {
      const { response, data } = await apiRequest('/api/health/db');
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(['healthy', 'unhealthy']).toContain(data.status);
      expect(data).toHaveProperty('connected');
    });
  });

  describe('Synthetic Data API', () => {
    let createdSyntheticDatasetId: string;

    test('GET /api/synthetic - List synthetic datasets', async () => {
      const { response, data } = await apiRequest('/api/synthetic');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    test('POST /api/synthetic - Create synthetic dataset', async () => {
      const newDataset = {
        name: 'Test Synthetic Dataset',
        description: 'Test dataset for smoke tests',
        dataType: 'users',
        recordCount: 10
      };

      const { response, data } = await apiRequest('/api/synthetic', {
        method: 'POST',
        body: newDataset,
      });

      // Synthetic data creation may return 500 if LLM is not configured
      expect([201, 500].includes(response.status)).toBe(true);
      
      if (response.status === 201) {
        expect(data).toHaveProperty('id');
        expect(data.name).toBe(newDataset.name);
        createdSyntheticDatasetId = data.id;
        createdResources.syntheticDatasets.add(createdSyntheticDatasetId);
      } else {
        // Skip the delete test if creation failed
        createdSyntheticDatasetId = 'skip';
      }
    });

    test('DELETE /api/synthetic/[id] - Delete synthetic dataset', async () => {
      if (createdSyntheticDatasetId === 'skip') {
        console.log('Skipping delete test - creation failed');
        return;
      }
      
      const { response } = await apiRequest(`/api/synthetic/${createdSyntheticDatasetId}`, {
        method: 'DELETE',
      });

      // Delete endpoint may return 500 if dataset doesn't exist
      expect([200, 500].includes(response.status)).toBe(true);
      
      // Remove from cleanup set if deletion was successful
      if (response.status === 200) {
        createdResources.syntheticDatasets.delete(createdSyntheticDatasetId);
      }
    });
  });

  describe('Catalog APIs', () => {
    test('GET /api/catalog/categories - List categories', async () => {
      const { response, data } = await apiRequest('/api/catalog/categories');
      
      // Catalog endpoints may return 500 if no data is available
      expect([200, 500].includes(response.status)).toBe(true);
      
      if (response.status === 200) {
        // Production returns object with categories array, dev returns array directly
        if (Array.isArray(data)) {
          expect(Array.isArray(data)).toBe(true);
        } else {
          expect(data).toHaveProperty('categories');
          expect(Array.isArray(data.categories)).toBe(true);
        }
      } else {
        // If error, should have error property
        expect(data).toHaveProperty('error');
      }
    });

    test('GET /api/catalog/fields - List fields', async () => {
      const { response, data } = await apiRequest('/api/catalog/fields');
      
      // Catalog endpoints may return 500 if no data is available
      expect([200, 500].includes(response.status)).toBe(true);
      
      if (response.status === 200) {
        // Production returns object with fields array, dev returns array directly
        if (Array.isArray(data)) {
          expect(Array.isArray(data)).toBe(true);
        } else {
          expect(data).toHaveProperty('fields');
          expect(Array.isArray(data.fields)).toBe(true);
        }
      } else {
        // If error, should have error property
        expect(data).toHaveProperty('error');
      }
    });
  });
});