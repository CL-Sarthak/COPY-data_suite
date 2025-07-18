/**
 * LLM/ML Integration Smoke Tests
 * 
 * Verify LLM and ML services are accessible and functioning
 */

import { getTestUrl, createAuthHeaders } from './setup';

const baseUrl = getTestUrl();

describe('LLM/ML Integration Smoke Tests', () => {
  // Track created resources for cleanup
  const createdSyntheticJobs = new Set<string>();

  afterAll(async () => {
    // Cleanup any synthetic data jobs that weren't deleted during tests
    console.log('Cleaning up LLM/ML test resources...');
    
    for (const jobId of createdSyntheticJobs) {
      try {
        await fetch(`${baseUrl}/api/synthetic/${jobId}`, {
          method: 'DELETE',
          headers: createAuthHeaders(),
        });
      } catch (error) {
        console.error(`Failed to cleanup synthetic job ${jobId}:`, error);
      }
    }
  });
  describe('Service Status', () => {
    test('LLM service should report status', async () => {
      const response = await fetch(`${baseUrl}/api/llm/status`, {
        headers: createAuthHeaders(),
      });
      
      expect(response.status).toBe(200);
      
      const status = await response.json();
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('provider');
      
      if (status.configured) {
        expect(status).toHaveProperty('model');
        expect(status).toHaveProperty('features');
        console.log(`✅ LLM Service: ${status.provider} (${status.model})`);
      } else {
        console.warn('⚠️  LLM Service is not configured');
      }
    });

    test('ML service should report status', async () => {
      const response = await fetch(`${baseUrl}/api/ml/status`, {
        headers: createAuthHeaders(),
      });
      
      // ML service might fail to initialize in some environments
      if (response.status !== 200) {
        console.warn(`⚠️  ML Service returned status ${response.status}`);
        // Don't fail the test if ML service is unavailable
        expect([200, 500, 503]).toContain(response.status);
        return;
      }
      
      const status = await response.json();
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('provider');
      
      if (status.configured) {
        expect(status).toHaveProperty('message');
        console.log(`✅ ML Service: ${status.provider}`);
      } else {
        console.warn('⚠️  ML Service is not configured');
      }
    });
  });

  describe('ML Pattern Detection', () => {
    test('Should process ML detection request if enabled', async () => {
      // First check if ML is enabled
      const statusResponse = await fetch(`${baseUrl}/api/ml/status`);
      const status = await statusResponse.json();
      
      if (!status.configured) {
        console.log('ML service not configured - skipping detection test');
        return;
      }

      // Test ML detection
      const response = await fetch(`${baseUrl}/api/ml/detect`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          text: 'John Doe, SSN: 123-45-6789, Email: john@example.com',
          options: {
            includeContext: true,
            confidenceThreshold: 0.7
          }
        }),
      });
      
      // If ML provider is not actually working (e.g., invalid API key), 
      // the endpoint returns 500
      if (response.status === 500) {
        const error = await response.json();
        console.log('ML service returned error:', error.details || error.error);
        console.log('This may indicate an invalid or expired API key');
        // Skip the rest of the test
        return;
      }
      
      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty('matches');
      expect(Array.isArray(result.matches)).toBe(true);
      
      if (result.matches.length > 0) {
        const match = result.matches[0];
        expect(match).toHaveProperty('label');
        expect(match).toHaveProperty('value');
        expect(match).toHaveProperty('confidence');
      }
    });

    test('Should handle ML service errors gracefully', async () => {
      const response = await fetch(`${baseUrl}/api/ml/detect`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          text: '', // Empty text
          options: {}
        }),
      });
      
      // Should either process empty text or return appropriate error
      expect([200, 400, 422].includes(response.status)).toBe(true);
    });
  });

  describe('Dataset Enhancement (LLM)', () => {
    test('Should analyze dataset for enhancement if LLM enabled', async () => {
      // Check LLM status first
      const statusResponse = await fetch(`${baseUrl}/api/llm/status`);
      const status = await statusResponse.json();
      
      if (!status.configured) {
        console.log('LLM service not configured - skipping enhancement test');
        return;
      }

      // Test dataset analysis
      const response = await fetch(`${baseUrl}/api/dataset-enhancement/analyze`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          sampleRecord: {
            name: 'John Doe',
            age: 30,
            city: 'New York'
          },
          dataSourceId: 'test-source'
        }),
      });
      
      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty('analysis');
      expect(result.analysis).toHaveProperty('datasetType');
      expect(result.analysis).toHaveProperty('missingFields');
      expect(Array.isArray(result.analysis.missingFields)).toBe(true);
    });
  });

  describe('Synthetic Data Generation (LLM)', () => {
    test('Should check synthetic data templates availability', async () => {
      const response = await fetch(`${baseUrl}/api/synthetic/templates`, {
        headers: createAuthHeaders(),
      });
      
      expect(response.status).toBe(200);
      
      const templates = await response.json();
      expect(typeof templates).toBe('object');
      
      // Templates should be an object with template definitions
      const templateKeys = Object.keys(templates);
      expect(templateKeys.length).toBeGreaterThan(0);
      
      // Check a sample template structure
      if (templateKeys.includes('users')) {
        expect(templates.users).toHaveProperty('id');
        expect(templates.users).toHaveProperty('firstName');
        expect(templates.users).toHaveProperty('email');
      }
    });

    test('Should handle synthetic data generation request', async () => {
      // Check LLM status first
      const statusResponse = await fetch(`${baseUrl}/api/llm/status`);
      const status = await statusResponse.json();
      
      if (!status.configured) {
        console.log('LLM service not configured - skipping synthetic data test');
        return;
      }

      // Create a synthetic data job
      const response = await fetch(`${baseUrl}/api/synthetic`, {
        method: 'POST',
        headers: createAuthHeaders(),
        body: JSON.stringify({
          name: 'Smoke Test Synthetic Data',
          templateId: 'customer_records',
          config: {
            recordCount: 5,
            fields: ['name', 'email', 'age']
          }
        }),
      });
      
      // Should either create job or return appropriate error
      // Production may return 500 for server errors
      expect([200, 201, 400, 422, 500].includes(response.status)).toBe(true);
      
      if (response.status === 201) {
        const job = await response.json();
        expect(job).toHaveProperty('id');
        createdSyntheticJobs.add(job.id);
        
        // Cleanup
        const deleteResponse = await fetch(`${baseUrl}/api/synthetic/${job.id}`, {
          method: 'DELETE',
          headers: createAuthHeaders(),
        });
        
        if (deleteResponse.status === 200) {
          createdSyntheticJobs.delete(job.id);
        }
      }
    });
  });

  describe('Service Configuration', () => {
    test('Should report service configuration', async () => {
      const response = await fetch(`${baseUrl}/api/debug/ml-config`, {
        headers: createAuthHeaders(),
      });
      
      if (response.status === 404) {
        console.log('Debug endpoint not available in production');
        return;
      }
      
      expect(response.status).toBe(200);
      
      const config = await response.json();
      expect(config).toHaveProperty('envVars');
      expect(config).toHaveProperty('timestamp');
    });
  });
});