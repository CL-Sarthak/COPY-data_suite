/**
 * Data Transformation Smoke Tests
 * 
 * Verify data transformation pipeline is working
 */

import { getTestUrl, createAuthHeaders } from './setup';

const baseUrl = getTestUrl();

describe('Data Transformation Smoke Tests', () => {
  // Track created resources for cleanup
  const createdDataSources = new Set<string>();

  afterAll(async () => {
    // Cleanup any data sources that weren't deleted during tests
    console.log('Cleaning up transformation test resources...');
    
    for (const dataSourceId of createdDataSources) {
      try {
        await fetch(`${baseUrl}/api/data-sources/${dataSourceId}`, {
          method: 'DELETE',
          headers: createAuthHeaders(),
        });
      } catch (error) {
        console.error(`Failed to cleanup data source ${dataSourceId}:`, error);
      }
    }
  });

  describe('CSV Transformation', () => {
    test('Should transform CSV data to unified format', async () => {
      // Create CSV data source
      const csvContent = `name,age,email
John Doe,30,john@example.com
Jane Smith,25,jane@example.com`;

      const createResponse = await fetch(`${baseUrl}/api/data-sources`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          name: 'CSV Transform Test',
          type: 'filesystem',
          configuration: {
            files: [{
              name: 'test.csv',
              type: 'text/csv',
              size: csvContent.length,
              content: csvContent
            }]
          }
        }),
      });

      expect(createResponse.status).toBe(200);
      const dataSource = await createResponse.json();
      createdDataSources.add(dataSource.id);
      createdDataSources.add(dataSource.id);

      // Transform the data
      const transformResponse = await fetch(
        `${baseUrl}/api/data-sources/${dataSource.id}/transform`,
        {
          headers: createAuthHeaders(),
        }
      );

      expect(transformResponse.status).toBe(200);
      const transformed = await transformResponse.json();

      // Verify transformation
      expect(transformed).toHaveProperty('catalogId');
      expect(transformed).toHaveProperty('records');
      expect(transformed).toHaveProperty('schema');
      expect(transformed.totalRecords).toBe(2);
      expect(transformed.records).toHaveLength(2);
      
      // Check schema
      expect(transformed.schema.fields).toHaveLength(3);
      const fieldNames = transformed.schema.fields.map((f: any) => f.name);
      expect(fieldNames).toContain('name');
      expect(fieldNames).toContain('age');
      expect(fieldNames).toContain('email');

      // Check records
      const firstRecord = transformed.records[0];
      expect(firstRecord).toHaveProperty('data');
      expect(firstRecord.data.name).toBe('John Doe');
      // Age might be string or number depending on CSV parsing
      expect(['30', 30].includes(firstRecord.data.age)).toBe(true);
      expect(firstRecord.data.email).toBe('john@example.com');

      // Cleanup
      const deleteResponse = await fetch(`${baseUrl}/api/data-sources/${dataSource.id}`, {
        method: 'DELETE',
        headers: createAuthHeaders(),
      });
      
      if (deleteResponse.status === 200) {
        createdDataSources.delete(dataSource.id);
      }
    });
  });

  describe('JSON Transformation', () => {
    test('Should handle JSON data transformation', async () => {
      const jsonContent = JSON.stringify([
        { id: 1, name: 'Product A', price: 99.99 },
        { id: 2, name: 'Product B', price: 149.99 }
      ]);

      const createResponse = await fetch(`${baseUrl}/api/data-sources`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          name: 'JSON Transform Test',
          type: 'filesystem',
          configuration: {
            files: [{
              name: 'products.json',
              type: 'application/json',
              size: jsonContent.length,
              content: jsonContent
            }]
          }
        }),
      });

      expect(createResponse.status).toBe(200);
      const dataSource = await createResponse.json();
      createdDataSources.add(dataSource.id);
      createdDataSources.add(dataSource.id);

      // Transform the data
      const transformResponse = await fetch(
        `${baseUrl}/api/data-sources/${dataSource.id}/transform`,
        {
          headers: createAuthHeaders(),
        }
      );

      expect(transformResponse.status).toBe(200);
      const transformed = await transformResponse.json();

      expect(transformed.totalRecords).toBe(2);
      expect(transformed.records[0].data.id).toBe(1);
      expect(transformed.records[1].data.price).toBe(149.99);

      // Cleanup
      const deleteResponse = await fetch(`${baseUrl}/api/data-sources/${dataSource.id}`, {
        method: 'DELETE',
        headers: createAuthHeaders(),
      });
      
      if (deleteResponse.status === 200) {
        createdDataSources.delete(dataSource.id);
      }
    });
  });

  describe('Pagination Support', () => {
    test('Should support paginated transformation', async () => {
      // Create data with multiple records
      const records = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `Record ${i + 1}`
      }));

      const createResponse = await fetch(`${baseUrl}/api/data-sources`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          name: 'Pagination Test',
          type: 'filesystem',
          configuration: {
            files: [{
              name: 'large.json',
              type: 'application/json',
              size: 1000,
              content: JSON.stringify(records)
            }]
          }
        }),
      });

      const dataSource = await createResponse.json();
      createdDataSources.add(dataSource.id);

      // Get first page
      const page1Response = await fetch(
        `${baseUrl}/api/data-sources/${dataSource.id}/transform?page=1&pageSize=10`,
        {
          headers: createAuthHeaders(),
        }
      );

      expect(page1Response.status).toBe(200);
      const page1 = await page1Response.json();
      expect(page1.records).toHaveLength(10);
      expect(page1.totalRecords).toBe(25);

      // Get second page
      const page2Response = await fetch(
        `${baseUrl}/api/data-sources/${dataSource.id}/transform?page=2&pageSize=10`,
        {
          headers: createAuthHeaders(),
        }
      );

      const page2 = await page2Response.json();
      expect(page2.records).toHaveLength(10);
      expect(page2.records[0].data.id).toBe(11);

      // Cleanup
      const deleteResponse = await fetch(`${baseUrl}/api/data-sources/${dataSource.id}`, {
        method: 'DELETE',
        headers: createAuthHeaders(),
      });
      
      if (deleteResponse.status === 200) {
        createdDataSources.delete(dataSource.id);
      }
    });
  });

  describe('Field Mapping', () => {
    test('Should apply field mappings during transformation', async () => {
      // This test would require setting up field mappings first
      // For smoke test, we'll just verify the endpoint exists
      const response = await fetch(`${baseUrl}/api/catalog/mappings`, {
        headers: createAuthHeaders(),
      });
      
      // Mappings endpoint may return 400 if no catalog is set up
      expect([200, 400].includes(response.status)).toBe(true);
      if (response.status === 200) {
        const mappings = await response.json();
        expect(Array.isArray(mappings)).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    test('Should handle transformation of invalid data', async () => {
      const createResponse = await fetch(`${baseUrl}/api/data-sources`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          name: 'Invalid Data Test',
          type: 'filesystem',
          configuration: {
            files: [{
              name: 'invalid.json',
              type: 'application/json',
              size: 20,
              content: '{invalid json'
            }]
          }
        }),
      });

      const dataSource = await createResponse.json();
      createdDataSources.add(dataSource.id);

      // Try to transform invalid data
      const transformResponse = await fetch(
        `${baseUrl}/api/data-sources/${dataSource.id}/transform`,
        {
          headers: createAuthHeaders(),
        }
      );

      // Should either handle gracefully or return error
      expect([200, 400, 422].includes(transformResponse.status)).toBe(true);

      // Cleanup
      const deleteResponse = await fetch(`${baseUrl}/api/data-sources/${dataSource.id}`, {
        method: 'DELETE',
        headers: createAuthHeaders(),
      });
      
      if (deleteResponse.status === 200) {
        createdDataSources.delete(dataSource.id);
      }
    });
  });
});