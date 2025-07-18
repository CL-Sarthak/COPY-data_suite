// Setup for smoke tests
import 'reflect-metadata';

// Use native fetch if available (Node.js 18+), otherwise we'll handle in individual tests
// The smoke tests should handle the fetch polyfill themselves if needed

// Set up environment for smoke tests
process.env.NODE_ENV = 'test';
process.env.SMOKE_TEST = 'true';

// Load environment variables from .env.local for smoke tests
require('dotenv').config({ path: '.env.local' });

// Ensure DATABASE_URL is available for smoke tests  
if (!process.env.DATABASE_URL) {
  console.log('⚠️  DATABASE_URL not found in environment, using default for smoke tests');
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/data_redaction_dev';
}

// Smoke tests should run against a live application, not in isolated Jest environment
if (!process.env.SMOKE_TEST_URL) {
  console.log('💡 Smoke tests will run against: http://localhost:3000');
  console.log('   Make sure the development server is running: npm run dev');
}

// For smoke tests, we want to test against real database
// so we don't mock TypeORM