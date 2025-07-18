# Smoke Tests Reference Guide

## Overview

The smoke test suite for the Data Redaction Tool provides rapid verification of critical functionality after deployment. These tests are designed to be fast, focused, and provide early warning of major issues in both development and production environments.

### Purpose
- Quickly verify critical features are working
- Run after each deployment
- Provide early warning of major issues
- Complete within 2 minutes
- Ensure basic functionality across all major components

## Test Suite Structure

### Test Files and Their Purpose

#### 1. **api-crud-operations.test.ts**
Comprehensive CRUD operation testing for all API endpoints, ensuring TypeORM entity metadata persists correctly in serverless environments.

**Tests:**
- Data Sources CRUD (create, read, update, delete)
- Patterns CRUD operations
- Dashboard metrics retrieval
- Health check endpoints
- Synthetic data operations
- Catalog API endpoints

**Key Features:**
- Tests entity metadata persistence in Next.js hot reload scenarios
- Validates all basic database operations
- Ensures API consistency across environments

#### 2. **api.smoke.test.ts**
Basic API endpoint availability and response validation.

**Tests:**
- Health check endpoints (`/api/health`, `/api/health/db`)
- Core API endpoints (dashboard, data sources, patterns)
- Service status endpoints (LLM, ML)
- Error handling (404s, invalid payloads)

**Key Features:**
- Validates API contract consistency
- Checks service availability
- Tests basic authentication flow

#### 3. **data-transformation.smoke.test.ts**
Verifies the data transformation pipeline functionality.

**Tests:**
- CSV data transformation
- JSON data transformation
- Pagination support for large datasets
- Field mapping capabilities
- Error handling for invalid data

**Key Features:**
- Tests multiple file format support
- Validates schema detection
- Ensures pagination works for large datasets

#### 4. **database.smoke.test.ts**
Database connectivity and operation verification.

**Tests:**
- Database health and accessibility
- Migration status verification
- CRUD operations for data persistence
- Concurrent operation handling
- Data persistence across requests

**Key Features:**
- Validates database connection
- Tests transaction handling
- Ensures data consistency

#### 5. **file-upload.smoke.test.ts**
File upload functionality across different methods and formats.

**Tests:**
- Streaming upload session initialization
- Regular file upload (small files)
- Multiple file upload
- Support for various file types (txt, csv, json)
- Error handling for invalid uploads

**Key Features:**
- Tests both streaming and regular uploads
- Validates file type support
- Ensures proper error handling

#### 6. **llm-ml.smoke.test.ts**
LLM and ML service integration testing.

**Tests:**
- LLM service status and configuration
- ML service status and availability
- ML pattern detection functionality
- Dataset enhancement capabilities
- Synthetic data generation
- Service configuration reporting

**Key Features:**
- Graceful handling when services are not configured
- Tests both LLM and ML endpoints
- Validates AI service integrations

#### 7. **pattern-matching.smoke.test.ts**
Pattern detection and matching functionality.

**Tests:**
- Pattern CRUD operations
- Pattern testing against sample text
- Invalid regex handling
- Pattern categories verification
- Pattern detection in transformed data

**Key Features:**
- Tests regex pattern validation
- Ensures pattern matching works correctly
- Validates pattern management

### Support Files

#### **setup.ts**
Configuration and utilities for smoke test execution.

**Features:**
- Environment detection (local vs deployed)
- Base URL configuration
- Authentication header creation
- Test skipping utilities for environment-specific tests
- Global test timeout configuration

#### **test-utils.ts**
API request utilities using axios.

**Features:**
- Centralized API request handling
- Response normalization
- Error handling
- Timeout configuration

## Test Categories

### 1. **Infrastructure Tests**
- Database connectivity
- Service availability
- Health checks
- Migration status

### 2. **Data Management Tests**
- File upload and storage
- Data source CRUD
- Data transformation
- Pattern management

### 3. **AI/ML Integration Tests**
- LLM service status
- ML pattern detection
- Synthetic data generation
- Dataset enhancement

### 4. **API Contract Tests**
- Endpoint availability
- Response format validation
- Error handling
- Authentication

## Running the Tests

### Local Development

```bash
# Run all smoke tests against local server
npm run test:smoke

# Run specific smoke test file
npx jest --config jest.smoke.config.js src/__tests__/smoke/api.smoke.test.ts

# Run with specific base URL
SMOKE_TEST_URL=http://localhost:3000 npm run test:smoke
```

### Against Deployed Instance

```bash
# Run against production
npm run smoke:prod

# Run against staging
SMOKE_TEST_URL=https://staging.example.com npm run test:smoke

# Run with authentication
SMOKE_TEST_AUTH_TOKEN=your-token npm run test:smoke
```

### CI/CD Pipeline

```bash
# Run in CI mode (no watch, proper exit codes)
npm run test:smoke:ci

# With custom URL
SMOKE_TEST_URL=https://preview.vercel.app npm run test:smoke:ci
```

## Environment-Specific Considerations

### Local Development
- Requires PostgreSQL database via DATABASE_URL
- No authentication required
- All features available
- Streaming upload may have issues (known limitation)

### Production (Vercel)
- May use in-memory database (data doesn't persist)
- Pattern creation may fail due to permissions
- Catalog endpoints may return 500 if empty
- Some debug endpoints not available

### Environment Detection
Tests automatically adapt based on:
- `SMOKE_TEST_URL` environment variable
- `isDeployedTest()` helper function
- `skipIfDeployed()` for local-only tests
- `deployedOnly()` for production-only tests

## Common Issues and Troubleshooting

### 1. **Server Not Running**
**Error:** "Server is not running!"
**Solution:** Ensure the application is running at the specified URL before running smoke tests.

### 2. **Database Connection Issues**
**Error:** Database health check fails
**Solution:** 
- Check DATABASE_URL environment variable
- Ensure migrations have run
- Verify database server is accessible

### 3. **API Authentication Failures**
**Error:** 401/403 responses
**Solution:** Set `SMOKE_TEST_AUTH_TOKEN` environment variable if authentication is required.

### 4. **Streaming Upload Failures**
**Error:** "Streaming upload failed locally"
**Note:** This is a known issue in local development and tests will skip appropriately.

### 5. **Pattern Creation Failures in Production**
**Error:** 500 errors when creating patterns
**Note:** May be due to database permissions or in-memory database limitations in production.

### 6. **Timeout Issues**
**Error:** Test timeout exceeded
**Solution:** 
- Default timeout is 30 seconds
- Increase with `jest.setTimeout()` if needed
- Check network connectivity to target URL

## Best Practices

### Writing New Smoke Tests

1. **Keep Tests Fast**
   - Each test should complete in < 5 seconds
   - Use minimal data for testing
   - Clean up created resources

2. **Test Critical Paths Only**
   - Focus on user-facing functionality
   - Test happy paths primarily
   - Include basic error handling

3. **Handle Service Availability**
   - Check service status before testing features
   - Skip tests gracefully if services unavailable
   - Log warnings for missing services

4. **Environment Awareness**
   - Use `skipIfDeployed()` for local-only tests
   - Handle production limitations gracefully
   - Adapt expectations based on environment

5. **Resource Cleanup**
   - Always clean up created resources
   - Use try-finally blocks for cleanup
   - Store resource IDs for deletion

### Example Test Structure

```typescript
describe('Feature Smoke Tests', () => {
  let resourceId: string;

  beforeAll(async () => {
    // Setup test data
  });

  afterAll(async () => {
    // Cleanup resources
    if (resourceId) {
      await cleanup(resourceId);
    }
  });

  test('Should perform basic operation', async () => {
    const response = await apiRequest('/api/endpoint');
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('expected');
  });

  skipIfDeployed('Should work in local only', async () => {
    // Local-specific test
  });
});
```

## Maintenance

### Adding New Tests
1. Create test file in `src/__tests__/smoke/`
2. Follow naming convention: `feature.smoke.test.ts`
3. Import utilities from `setup.ts` and `test-utils.ts`
4. Add cleanup in `afterAll` hooks
5. Document in this reference guide

### Updating Existing Tests
1. Maintain backward compatibility
2. Update timeout values if needed
3. Add environment-specific handling
4. Update documentation

### Monitoring Test Health
1. Review test execution times regularly
2. Remove flaky tests or add retries
3. Update assertions for API changes
4. Monitor failure patterns in CI/CD

## Integration with CI/CD

The smoke tests are designed to integrate seamlessly with CI/CD pipelines:

1. **Pre-deployment:** Run against staging environment
2. **Post-deployment:** Verify production deployment
3. **PR Validation:** Test feature branches
4. **Scheduled Runs:** Monitor production health

### Exit Codes
- `0`: All tests passed
- `1`: Test failures or setup issues
- Other: Jest-specific error codes

### Reporting
Tests output:
- Console logs with emojis for clarity
- Jest test results
- Detailed error messages
- Service availability warnings