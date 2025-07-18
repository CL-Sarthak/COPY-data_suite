/**
 * API Connections Smoke Tests
 * 
 * Tests for API connection management functionality
 */

import { getTestUrl, createAuthHeaders } from './setup';
import axios from 'axios';

// Create a fetch-like wrapper around axios for consistency
const fetch = async (url: string, options?: any) => {
  try {
    const response = await axios({
      url,
      method: options?.method || 'GET',
      headers: options?.headers || {},
      data: options?.body,
      validateStatus: () => true // Don't throw on any status
    });
    
    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      json: async () => response.data,
      text: async () => JSON.stringify(response.data)
    };
  } catch (error) {
    // Network errors
    throw error;
  }
};

const baseUrl = getTestUrl();

describe('API Connections Smoke Tests', () => {
  let testConnectionId: string | null = null;

  afterAll(async () => {
    // Clean up test connection if created
    if (testConnectionId) {
      try {
        await fetch(`${baseUrl}/api/api-connections/${testConnectionId}`, {
          method: 'DELETE',
          headers: createAuthHeaders()
        });
      } catch (error) {
        console.log('Cleanup failed:', error);
      }
    }
  });

  describe('API Connection CRUD Operations', () => {
    test('GET /api/api-connections should return array', async () => {
      const response = await fetch(`${baseUrl}/api/api-connections`, {
        headers: createAuthHeaders()
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('POST /api/api-connections should create new connection', async () => {
      const newConnection = {
        name: 'Test API Connection',
        endpoint: 'https://jsonplaceholder.typicode.com/posts',
        method: 'GET',
        authType: 'none',
        timeout: 30000,
        retryCount: 3
      };

      const response = await fetch(`${baseUrl}/api/api-connections`, {
        method: 'POST',
        headers: {
          ...createAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newConnection)
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data.name).toBe(newConnection.name);
      expect(data.status).toBe('inactive');
      
      testConnectionId = data.id;
    });

    test('GET /api/api-connections/:id should return specific connection', async () => {
      if (!testConnectionId) {
        console.log('Skipping test - no connection ID');
        return;
      }

      const response = await fetch(`${baseUrl}/api/api-connections/${testConnectionId}`, {
        headers: createAuthHeaders()
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(testConnectionId);
      expect(data.name).toBe('Test API Connection');
    });

    test('POST /api/api-connections/test should test connection', async () => {
      const response = await fetch(`${baseUrl}/api/api-connections/test`, {
        method: 'POST',
        headers: {
          ...createAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: testConnectionId,
          endpoint: 'https://jsonplaceholder.typicode.com/posts',
          method: 'GET',
          authType: 'none',
          timeout: 30000
        })
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('statusCode');
      expect(data).toHaveProperty('responseTime');
    });

    test('POST /api/api-connections/:id/import should import data', async () => {
      if (!testConnectionId) {
        console.log('Skipping test - no connection ID');
        return;
      }

      // First ensure connection is active by testing it
      await fetch(`${baseUrl}/api/api-connections/test`, {
        method: 'POST',
        headers: {
          ...createAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: testConnectionId,
          endpoint: 'https://jsonplaceholder.typicode.com/posts',
          method: 'GET',
          authType: 'none'
        })
      });

      // Wait a moment for status update
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await fetch(`${baseUrl}/api/api-connections/${testConnectionId}/import`, {
        method: 'POST',
        headers: {
          ...createAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Import',
          description: 'Test import from JSONPlaceholder',
          maxRecords: 5
        })
      });
      
      if (response.status === 400) {
        const error = await response.json();
        console.log('Import error:', error);
      }
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('dataSourceId');
      expect(data).toHaveProperty('recordCount');
    });

    test('DELETE /api/api-connections/:id should delete connection', async () => {
      if (!testConnectionId) {
        console.log('Skipping test - no connection ID');
        return;
      }

      const response = await fetch(`${baseUrl}/api/api-connections/${testConnectionId}`, {
        method: 'DELETE',
        headers: createAuthHeaders()
      });
      
      // Accept either 204 (success) or 404 (already deleted)
      expect([204, 404]).toContain(response.status);
      
      // Clear the ID so cleanup doesn't try to delete again
      testConnectionId = null;
    });
  });

  describe('API Connection Validation', () => {
    test('POST /api/api-connections should validate required fields', async () => {
      const response = await fetch(`${baseUrl}/api/api-connections`, {
        method: 'POST',
        headers: {
          ...createAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Missing required fields
          method: 'GET'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('POST /api/api-connections/test should validate endpoint', async () => {
      const response = await fetch(`${baseUrl}/api/api-connections/test`, {
        method: 'POST',
        headers: {
          ...createAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Missing endpoint
          method: 'GET'
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });
});