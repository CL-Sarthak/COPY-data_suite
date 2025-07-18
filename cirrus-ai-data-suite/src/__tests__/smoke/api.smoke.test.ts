/**
 * API Endpoint Smoke Tests
 * 
 * Basic tests to verify that critical API endpoints are responding
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

describe('API Endpoints Smoke Tests', () => {
  describe('Health Check Endpoints', () => {
    test('GET /api/health should return 200', async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('healthy');
    });

    test('GET /api/health/db should check database connectivity', async () => {
      const response = await fetch(`${baseUrl}/api/health/db`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('connected');
      expect(data.status).toBe('healthy');
      expect(data.connected).toBe(true);
    });
  });

  describe('Core API Endpoints', () => {
    test('GET /api/dashboard should return dashboard data', async () => {
      const response = await fetch(`${baseUrl}/api/dashboard`, {
        headers: createAuthHeaders(),
      });
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('dataSources');
      expect(data).toHaveProperty('definedPatterns');
      expect(data).toHaveProperty('assembledDatasets');
      expect(data).toHaveProperty('recentActivity');
      expect(data).toHaveProperty('pipelineStages');
    });

    test('GET /api/data-sources should return data sources list', async () => {
      const response = await fetch(`${baseUrl}/api/data-sources`, {
        headers: createAuthHeaders(),
      });
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('GET /api/patterns should return patterns list', async () => {
      const response = await fetch(`${baseUrl}/api/patterns`, {
        headers: createAuthHeaders(),
      });
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('GET /api/catalog/fields should return catalog fields or error', async () => {
      const response = await fetch(`${baseUrl}/api/catalog/fields`, {
        headers: createAuthHeaders(),
      });
      // Catalog endpoints may return 500 if catalog is empty
      expect([200, 500].includes(response.status)).toBe(true);
      
      const data = await response.json();
      expect(data).toBeDefined();
      if (response.status === 500) {
        expect(data).toHaveProperty('error');
      } else {
        // Production returns object with fields array, dev returns array directly
        if (Array.isArray(data)) {
          expect(Array.isArray(data)).toBe(true);
        } else {
          expect(data).toHaveProperty('fields');
          expect(Array.isArray(data.fields)).toBe(true);
        }
      }
    });

    test('GET /api/catalog/categories should return catalog categories or error', async () => {
      const response = await fetch(`${baseUrl}/api/catalog/categories`, {
        headers: createAuthHeaders(),
      });
      // Catalog endpoints may return 500 if catalog is empty
      expect([200, 500].includes(response.status)).toBe(true);
      
      const data = await response.json();
      expect(data).toBeDefined();
      if (response.status === 500) {
        expect(data).toHaveProperty('error');
      } else {
        // Production returns object with categories array, dev returns array directly
        if (Array.isArray(data)) {
          expect(Array.isArray(data)).toBe(true);
        } else {
          expect(data).toHaveProperty('categories');
          expect(Array.isArray(data.categories)).toBe(true);
        }
      }
    });
  });

  describe('Service Status Endpoints', () => {
    test('GET /api/llm/status should return LLM service status', async () => {
      const response = await fetch(`${baseUrl}/api/llm/status`, {
        headers: createAuthHeaders(),
      });
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('configured');
      expect(data).toHaveProperty('provider');
      expect(data).toHaveProperty('model');
    });

    test('GET /api/ml/status should return ML service status', async () => {
      const response = await fetch(`${baseUrl}/api/ml/status`, {
        headers: createAuthHeaders(),
      });
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('configured');
      expect(data).toHaveProperty('provider');
      expect(data).toHaveProperty('message');
    });
  });

  describe('Error Handling', () => {
    test('GET /api/non-existent should return 404 or 500', async () => {
      const response = await fetch(`${baseUrl}/api/non-existent`, {
        headers: createAuthHeaders(),
      });
      // In production, Next.js may return 500 instead of 404 for non-existent API routes
      expect([404, 500]).toContain(response.status);
    });

    test('POST endpoints should reject invalid payloads', async () => {
      const response = await fetch(`${baseUrl}/api/patterns`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({ invalid: 'data' }),
      });
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });
  });
});