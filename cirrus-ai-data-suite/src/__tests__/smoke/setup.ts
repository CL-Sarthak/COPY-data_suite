/**
 * Smoke Test Setup
 * 
 * Configuration for smoke tests that verify basic functionality
 * after deployment. These tests should be fast and focused on
 * critical paths only.
 */

// Skip dotenv in test environment as it's already handled by Next.js

// Configure test environment
process.env.NODE_ENV = 'test';
process.env.SMOKE_TEST = 'true';

// Global test timeout for smoke tests
jest.setTimeout(30000);

// Helper to check if we're testing against a deployed instance
export const isDeployedTest = (): boolean => {
  return !!process.env.SMOKE_TEST_URL;
};

// Get the base URL for testing
export const getTestUrl = (): string => {
  return process.env.SMOKE_TEST_URL || 'http://localhost:3000';
};

// Helper to create authenticated requests if needed
export const createAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (process.env.SMOKE_TEST_AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.SMOKE_TEST_AUTH_TOKEN}`;
  }
  
  return headers;
};

// Skip test if running against deployed instance and feature not available
export const skipIfDeployed = () => {
  return isDeployedTest() ? test.skip : test;
};

// Run test only if running against deployed instance
export const deployedOnly = () => {
  return isDeployedTest() ? test : test.skip;
};

// Cleanup function for after all tests
afterAll(async () => {
  // Add any cleanup logic here
});

console.log(`🔥 Smoke tests running against: ${getTestUrl()}`);
console.log(`📍 Deployed test mode: ${isDeployedTest()}`);