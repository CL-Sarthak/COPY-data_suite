#!/usr/bin/env node

/**
 * Smoke test runner
 * Runs smoke tests against a running Next.js application
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const isCI = args.includes('--ci');

async function runSmokeTests() {
  console.log('🔥 Running smoke tests...\n');

  // Determine the base URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  console.log(`📍 Testing against: ${baseUrl}\n`);

  // Check if the server is running
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Server is not running!');
    console.error(`   Please start the server with: npm run dev`);
    console.error(`   Error: ${error.message}\n`);
    process.exit(1);
  }

  // Run the smoke tests
  const jestArgs = [
    '--config',
    'jest.smoke.config.js',
    '--verbose',
    '--forceExit',
    '--detectOpenHandles'
  ];

  if (isCI) {
    jestArgs.push('--ci');
  }

  const jest = spawn('npx', ['jest', ...jestArgs], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_PUBLIC_BASE_URL: baseUrl,
      NODE_ENV: 'test'
    }
  });

  jest.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ All smoke tests passed!');
    } else {
      console.log(`\n❌ Smoke tests failed with code ${code}`);
    }
    process.exit(code);
  });
}

// Add error handling for fetch in Node.js < 18
if (typeof fetch === 'undefined') {
  try {
    global.fetch = require('node-fetch');
  } catch {
    // node-fetch not available, assume fetch is available in Node.js 18+
  }
}

runSmokeTests().catch((error) => {
  console.error('Failed to run smoke tests:', error);
  process.exit(1);
});