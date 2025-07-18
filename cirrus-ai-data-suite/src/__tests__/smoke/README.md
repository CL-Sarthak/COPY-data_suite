# Smoke Tests

This directory contains smoke tests that verify basic functionality after deployment.

## Purpose

Smoke tests are designed to:
- Quickly verify critical features are working
- Run after each deployment
- Provide early warning of major issues
- Complete within 2 minutes

## Test Structure

- `api.smoke.test.ts` - API endpoint availability
- `database.smoke.test.ts` - Database CRUD operations
- `file-upload.smoke.test.ts` - File upload functionality
- `pattern-matching.smoke.test.ts` - Pattern detection
- `data-transformation.smoke.test.ts` - Data processing pipeline
- `llm-ml.smoke.test.ts` - AI service integrations

## Running Tests

```bash
# Local development
npm run test:smoke

# Against deployed instance
npm run test:smoke -- https://app.example.com

# Specific test file
npx jest --config jest.smoke.config.js src/__tests__/smoke/api.smoke.test.ts
```

## Writing Smoke Tests

1. Import setup utilities
2. Keep tests focused and fast
3. Clean up created resources
4. Handle service availability gracefully

Example:
```typescript
import { getTestUrl, createAuthHeaders } from './setup';

describe('Feature Smoke Tests', () => {
  test('Should work', async () => {
    const response = await fetch(`${getTestUrl()}/api/feature`);
    expect(response.status).toBe(200);
  });
});
```