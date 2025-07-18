# Comprehensive Test Documentation

## Overview

The Data Redaction Tool project uses a multi-layered testing strategy to ensure code quality and reliability. This document consolidates all testing information, commands, and best practices.

## Test Types

### 1. Unit Tests

Unit tests focus on individual components, utilities, and functions in isolation.

**Configuration File:** `jest.config.js`
**Test Location:** `src/**/__tests__/`, `src/**/*.test.ts(x)`, `src/**/*.spec.ts(x)`
**Environment:** jsdom (browser-like)

#### Running Unit Tests

```bash
# Run all unit tests (excludes integration and smoke tests)
npm run test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run ALL tests including integration and smoke tests
npm run test:all

# Explicit unit test command (same as npm test)
npm run test:unit

# Run coverage for specific areas
npm run test:coverage:components  # Components only
npm run test:coverage:services   # Services only
npm run test:coverage:utils      # Utilities only

# Fast coverage (key areas only)
npm run test:coverage:fast
```

**Note:** As of the latest update, `npm run test` only runs unit tests that don't require a running server or database connection. This makes the default test command faster and more reliable for development.

#### Coverage Thresholds

- Global: 6% statements, 6% branches, 8% functions, 6% lines
- Well-tested components have higher thresholds (e.g., TagManager: 85%)

### 2. Integration Tests

Integration tests verify that different parts of the system work together correctly.

**Configuration File:** `jest.integration.config.js`
**Test Location:** `src/__tests__/integration/`, `src/**/*.integration.test.ts`
**Environment:** node
**Characteristics:** 
- Run sequentially (maxWorkers: 1)
- 30-second timeout
- Higher coverage thresholds (70%)

#### Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run in watch mode
npm run test:integration:watch

# Run with coverage
npm run test:integration:coverage
```

### 3. Smoke Tests

Smoke tests provide rapid post-deployment verification of critical functionality.

**Configuration File:** `jest.smoke.config.js`
**Test Location:** `src/__tests__/smoke/`
**Environment:** node
**Timeout:** 30 seconds

#### Running Smoke Tests

```bash
# Using TypeScript runner (recommended)
npm run test:smoke                    # Test local server
npm run test:smoke -- https://staging.example.com  # Test specific URL

# Using Jest directly
npm run test:smoke:ci                 # CI mode (no watch)

# Quick verification scripts
npm run smoke                         # Lightweight tests
npm run smoke:local                   # Test http://localhost:3000
npm run smoke:prod                    # Test production

# With custom URL
npm run smoke https://custom-deployment.vercel.app
```

#### Smoke Test Suite Contents

1. **api-crud-operations.test.ts** - Complete CRUD testing for all entities
2. **api.smoke.test.ts** - Basic API endpoint availability
3. **data-transformation.smoke.test.ts** - Data processing pipeline
4. **database.smoke.test.ts** - Database connectivity and operations
5. **file-upload.smoke.test.ts** - File upload functionality
6. **llm-ml.smoke.test.ts** - AI service integrations
7. **pattern-matching.smoke.test.ts** - Pattern detection and matching

## Environment Variables for Testing

### Unit/Integration Tests
- Automatically loads `.env.test` if present
- Uses mocked services by default

### Smoke Tests
```bash
# Target URL (defaults to http://localhost:3000)
SMOKE_TEST_URL=https://staging.example.com

# Authentication token (if required)
SMOKE_TEST_AUTH_TOKEN=your-auth-token

# Automatically set
NODE_ENV=test
SMOKE_TEST=true
```

## Test Scripts Overview

### Package.json Scripts

```json
{
  "test": "jest",                      // Run unit tests
  "test:watch": "jest --watch",        // Watch mode
  "test:coverage": "NODE_OPTIONS='--max-old-space-size=4096' jest --coverage",
  "test:ci": "NODE_OPTIONS='--max-old-space-size=4096' jest --ci --coverage --watchAll=false",
  "test:integration": "jest --config jest.integration.config.js",
  "test:smoke": "tsx scripts/run-smoke-tests.ts",
  "test:smoke:ci": "jest --config jest.smoke.config.js --ci",
  "smoke": "node scripts/smoke-tests.js",
  "smoke:local": "node scripts/smoke-tests.js http://localhost:3000",
  "smoke:prod": "node scripts/smoke-tests.js https://cirrus-ai-data-suite.vercel.app"
}
```

## Test Runners

### 1. TypeScript Smoke Test Runner (`scripts/run-smoke-tests.ts`)
- Performs health check before running tests
- Sets up environment variables
- Creates test results directory
- Saves JSON test results with timestamps
- Supports verbose output flag

### 2. JavaScript Smoke Test Runner (`scripts/run-smoke-tests.js`)
- Similar to TypeScript runner
- Uses NEXT_PUBLIC_BASE_URL environment variable
- Includes Node.js compatibility for fetch

### 3. Quick Smoke Test Script (`scripts/smoke-tests.js`)
- Standalone script without Jest dependency
- Direct HTTP calls for rapid verification
- Ideal for CI/CD pipelines
- Provides immediate pass/fail status

## Best Practices

### Writing Unit Tests

1. **Use React Testing Library** for component tests
2. **Mock external dependencies** (APIs, services)
3. **Test user interactions** not implementation details
4. **Keep tests focused** - one behavior per test
5. **Use descriptive test names** that explain the scenario

Example:
```typescript
describe('DataSourceTable', () => {
  it('should display loading state while fetching data', () => {
    // Test implementation
  });
  
  it('should show error message when API call fails', () => {
    // Test implementation
  });
});
```

### Writing Integration Tests

1. **Test complete workflows** end-to-end
2. **Use real database** (test database)
3. **Clean up after tests** to ensure isolation
4. **Test error scenarios** and edge cases
5. **Verify data persistence** across operations

### Writing Smoke Tests

1. **Keep tests fast** (< 5 seconds per test)
2. **Test critical paths only** (happy paths)
3. **Handle environment differences** gracefully
4. **Use environment detection** for conditional tests
5. **Always clean up** created resources

Example:
```typescript
import { skipIfDeployed, deployedOnly } from './setup';

describe('Feature Smoke Tests', () => {
  skipIfDeployed('should work in local environment', async () => {
    // Local-only test
  });
  
  deployedOnly('should handle production constraints', async () => {
    // Production-only test
  });
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:ci
      
  smoke-tests:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:smoke -- ${{ secrets.STAGING_URL }}
        env:
          SMOKE_TEST_AUTH_TOKEN: ${{ secrets.STAGING_TOKEN }}
```

### Vercel Integration

Add to `vercel.json` for post-deployment verification:

```json
{
  "buildCommand": "npm run build && npm run test:smoke"
}
```

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**
   - Run `npm install`
   - Check tsconfig paths configuration
   - Ensure `@/` alias is properly configured

2. **Test timeouts**
   - Increase timeout in test file: `jest.setTimeout(60000)`
   - Check network connectivity
   - Verify target service is running

3. **Database connection errors**
   - Check DATABASE_URL environment variable
   - Ensure test database is running
   - Run migrations: `npm run migrate`

4. **Smoke test failures in production**
   - Check for in-memory database limitations
   - Verify service configurations (API keys)
   - Review production-specific constraints

### Debug Commands

```bash
# Run specific test file
npm test -- DataSourceTable.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should create"

# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Show test coverage gaps
npm run test:coverage -- --collectCoverageFrom='src/components/DataSourceTable.tsx'
```

## Test Maintenance

### Regular Tasks

1. **Update test snapshots** when UI changes
2. **Review and update timeouts** based on performance
3. **Remove obsolete tests** for deleted features
4. **Add tests for new features** before merging
5. **Monitor test execution time** and optimize slow tests

### Test Quality Metrics

- **Coverage**: Aim for 80% coverage on new code
- **Execution Time**: Unit tests < 10s, Integration < 60s, Smoke < 120s
- **Flakiness**: Zero tolerance for flaky tests
- **Maintainability**: Tests should be easy to understand and modify

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Smoke Tests Guide](./SMOKE_TESTS_GUIDE.md)
- [Smoke Tests Reference](./SMOKE_TESTS_REFERENCE.md)