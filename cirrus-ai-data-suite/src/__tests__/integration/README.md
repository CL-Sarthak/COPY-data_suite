# Integration Tests

This directory contains integration tests for critical user paths in the data redaction tool.

## Overview

Integration tests verify that multiple components work together correctly to complete user workflows. Unlike unit tests, these tests interact with real services, databases, and file systems (in test mode).

## Test Coverage

### 1. File Upload Flow (`fileUpload.integration.test.ts`)
Tests the complete file upload process:
- Streaming file upload with chunking
- Retry logic for failed chunks
- Storage integration
- Data source creation
- Concurrent uploads
- Error handling and recovery

### 2. Pattern Detection Flow (`patternDetection.integration.test.ts`)
Tests pattern detection and refinement:
- Pattern learning from examples
- Pattern matching in documents
- User feedback collection
- Auto-refinement after negative feedback
- Context clue detection
- ML-enhanced pattern detection
- Pattern persistence across sessions

### 3. Field Mapping Flow (`fieldMapping.integration.test.ts`)
Tests field mapping and catalog management:
- Source field analysis
- Intelligent mapping suggestions
- Field transformations
- Multiple sources to same catalog
- Catalog hierarchy and relationships
- Export/import catalog configuration

### 4. Data Export Flow (`dataExport.integration.test.ts`)
Tests data transformation and export:
- Redaction with multiple methods (mask, hash, partial, remove)
- Field mapping application
- Multiple export formats (CSV, JSON, Excel)
- Large dataset handling with pagination
- Data type preservation

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run with watch mode
npm run test:integration:watch

# Run with coverage
npm run test:integration:coverage

# Run a specific test file
npm run test:integration fileUpload
```

## Test Environment

- Uses test PostgreSQL database (configured via TEST_DATABASE_URL)
- Isolated test environment with clean state between tests
- Mocked external services where appropriate
- 30-second timeout for long-running operations

## Writing New Integration Tests

1. Create a new test file in this directory with `.integration.test.ts` extension
2. Set up database connection and clean state in `beforeEach`
3. Test complete user workflows, not individual functions
4. Include error cases and edge conditions
5. Clean up resources in `afterAll`

Example structure:
```typescript
describe('Feature Integration', () => {
  let connection: any;
  
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    connection = await getConnection();
    await connection.runMigrations();
  });
  
  afterAll(async () => {
    if (connection?.isConnected) {
      await connection.close();
    }
  });
  
  beforeEach(async () => {
    // Clear relevant tables
  });
  
  it('should complete user workflow', async () => {
    // Test complete flow
  });
});
```

## Best Practices

1. **Test Real Workflows**: Focus on actual user paths, not technical implementation
2. **Clean State**: Always start with clean database state
3. **Meaningful Assertions**: Verify business outcomes, not just technical details
4. **Error Scenarios**: Include tests for failure cases and recovery
5. **Performance**: Test with realistic data sizes
6. **Concurrency**: Test concurrent operations where applicable

## Debugging

- Use `console.log` for debugging (will appear in test output)
- Run single test with `.only()` for isolation
- Check test database state with debug endpoints
- Use `--verbose` flag for detailed output