# Smoke Tests Guide

## Overview

Smoke tests are lightweight tests that verify the basic functionality of the application after deployment. They ensure that critical features are working correctly without performing exhaustive testing.

## Test Coverage

Our smoke tests cover the following areas:

1. **API Endpoints** - Verify all critical APIs are responding
   - Health checks (`/api/health`, `/api/health/db`)
   - CRUD operations for data sources, patterns, pipelines
   - Dashboard metrics and analytics
   
2. **Database Connectivity** - Ensure database operations work
   - Connection health verification
   - Migration status checks
   - Data persistence validation
   
3. **File Upload** - Test file upload functionality
   - Streaming upload session initialization
   - Regular file uploads (small files)
   - Multiple file format support (txt, csv, json)
   
4. **Pattern Matching** - Verify pattern detection works
   - Pattern CRUD operations
   - Regex validation and testing
   - Pattern category management
   
5. **Data Transformation** - Test data processing pipeline
   - CSV and JSON transformation
   - Pagination for large datasets
   - Field mapping capabilities
   
6. **LLM/ML Integrations** - Check AI service availability
   - LLM service status and configuration
   - ML pattern detection functionality
   - Synthetic data generation
   - Dataset enhancement capabilities

## Running Smoke Tests

### Local Development

```bash
# Run against local instance (default: http://localhost:3000)
npm run test:smoke

# Run against specific URL
npm run test:smoke -- http://localhost:3001
```

### Against Deployed Instance

```bash
# Run against staging
npm run test:smoke -- https://staging.example.com

# Run against production
npm run test:smoke -- https://app.example.com

# With authentication (if required)
SMOKE_TEST_AUTH_TOKEN=your-token npm run test:smoke -- https://app.example.com
```

### Using the Runner Script

The project includes multiple smoke test runners:

#### TypeScript Runner (run-smoke-tests.ts)
```bash
# Uses Jest framework with comprehensive test suite
npm run test:smoke
npm run test:smoke -- https://app.example.com
```

#### JavaScript Runner (run-smoke-tests.js)  
```bash
# Jest-based runner with environment detection
npx node scripts/run-smoke-tests.js
```

#### Quick Smoke Tests (smoke-tests.js)
```bash
# Lightweight verification script without Jest
npm run smoke
npm run smoke https://app.example.com
npm run smoke:local  # Pre-configured for localhost
npm run smoke:prod   # Pre-configured for production
```

## Environment Variables

- `SMOKE_TEST_URL` - Target URL for testing (default: http://localhost:3000)
- `SMOKE_TEST_AUTH_TOKEN` - Authentication token if required
- `NODE_ENV` - Set to 'test' automatically

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Smoke Tests
  env:
    SMOKE_TEST_URL: ${{ secrets.STAGING_URL }}
    SMOKE_TEST_AUTH_TOKEN: ${{ secrets.STAGING_TOKEN }}
  run: npm run test:smoke
```

### Vercel Post-Deployment

Add to `vercel.json`:

```json
{
  "functions": {
    "api/health.ts": {
      "maxDuration": 10
    }
  },
  "buildCommand": "npm run build && npm run test:smoke"
}
```

### Jenkins

```groovy
stage('Smoke Tests') {
  steps {
    sh 'npm run test:smoke -- $DEPLOY_URL'
  }
}
```

## Test Results

Test results are saved to `test-results/` directory with timestamps:
- `smoke-tests-{timestamp}.json` - Detailed test results

## Writing New Smoke Tests

1. Create test file in `src/__tests__/smoke/`
2. Import setup utilities: `import { getTestUrl, createAuthHeaders } from './setup'`
3. Keep tests focused on critical paths
4. Use appropriate timeouts (default: 30s)

Example:

```typescript
describe('New Feature Smoke Tests', () => {
  test('Should verify feature is accessible', async () => {
    const response = await fetch(`${getTestUrl()}/api/new-feature`);
    expect(response.status).toBe(200);
  });
});
```

## Best Practices

1. **Keep tests fast** - Smoke tests should complete in < 2 minutes
2. **Focus on critical paths** - Don't test edge cases
3. **Clean up test data** - Always cleanup created resources
4. **Handle service availability** - Check if services are enabled before testing
5. **Use descriptive names** - Make failures easy to understand

## Troubleshooting

### Common Issues

1. **Connection refused** - Ensure target is running and accessible
2. **Authentication errors** - Check SMOKE_TEST_AUTH_TOKEN
3. **Timeout errors** - Increase jest.setTimeout in setup.ts
4. **Database errors** - Verify database is accessible from test environment

### Debug Mode

```bash
# Run with Node debugging
node --inspect ./scripts/run-smoke-tests.ts

# Run specific test file
npx jest --config jest.smoke.config.js src/__tests__/smoke/api.smoke.test.ts
```

## Monitoring

Consider integrating smoke tests with monitoring tools:

1. **Scheduled runs** - Run smoke tests every 30 minutes
2. **Alert on failure** - Send notifications to Slack/email
3. **Dashboard** - Display test status on monitoring dashboard
4. **Historical tracking** - Track test performance over time