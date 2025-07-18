#!/usr/bin/env node

/**
 * Smoke Test Runner
 * 
 * Run smoke tests against local or deployed instances
 */

import { spawn } from 'child_process';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local first, then .env
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  config();
}

const args = process.argv.slice(2);
const targetUrl = args[0] || process.env.SMOKE_TEST_URL || 'http://localhost:3000';
const isLocal = targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1');

console.log('🔥 Smoke Test Runner');
console.log('===================');
console.log(`Target URL: ${targetUrl}`);
console.log(`Test Mode: ${isLocal ? 'Local' : 'Deployed'}`);
console.log('');

// Check if target is reachable
async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${targetUrl}/api/health`);
    if (response.ok) {
      console.log('✅ Target is healthy');
      return true;
    } else {
      console.error(`❌ Health check failed: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Cannot reach target:', error);
    return false;
  }
}

// Run the tests
async function runTests() {
  // Check health first
  const isHealthy = await checkHealth();
  if (!isHealthy && !isLocal) {
    console.error('Target is not healthy. Aborting tests.');
    process.exit(1);
  }

  // Set environment variables for tests
  const env = {
    ...process.env,
    SMOKE_TEST_URL: targetUrl,
    NODE_ENV: 'test' as const,
  };

  // Create test results directory
  const resultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Run Jest with smoke test configuration
  const jestArgs = [
    '--config',
    'jest.smoke.config.js',
    '--json',
    '--outputFile',
    path.join(resultsDir, `smoke-tests-${Date.now()}.json`),
    ...(process.env.CI ? ['--ci'] : []),
    ...(args.includes('--verbose') ? ['--verbose'] : []),
  ];

  console.log('🏃 Running smoke tests...\n');

  const jest = spawn('npx', ['jest', ...jestArgs], {
    env,
    stdio: 'inherit',
  });

  jest.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ All smoke tests passed!');
    } else {
      console.log(`\n❌ Smoke tests failed with code ${code}`);
    }
    process.exit(code || 0);
  });

  jest.on('error', (error) => {
    console.error('Failed to run tests:', error);
    process.exit(1);
  });
}

// Run the script
runTests().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});