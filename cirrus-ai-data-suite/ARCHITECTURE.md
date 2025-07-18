# Architecture Documentation

## Overview

This document outlines the architecture decisions and standards for the Cirrus AI Data Suite codebase following the consistency cleanup.

## Database Standards

### Column Naming Convention

All database columns use **snake_case** naming convention for PostgreSQL compatibility.

#### Entity Configuration
```typescript
@Column({ name: 'created_at' })
createdAt: Date;

@Column({ name: 'is_active' })
isActive: boolean;
```

### Migration Strategy

1. All new migrations must use snake_case for column names
2. The `ConsistentNamingStrategy` is configured but explicit column names in entities take precedence
3. Migration 028 standardizes all existing tables to snake_case

### Database Compatibility

The codebase uses PostgreSQL exclusively:
- TypeORM handles database operations consistently
- All environments use the same PostgreSQL setup
- Migrations ensure schema consistency across deployments

## Service Layer Architecture

### Single Service Implementation

We use a single service implementation per domain, removing the need for "Direct" services:
- `PatternService` - handles all pattern operations
- `StreamingUploadService` - handles file uploads
- Services use TypeORM repositories for database operations

### Serverless Considerations

For Vercel's serverless environment:
1. **No in-memory caching** - Each request may hit a different instance
2. **Database connection pooling** - Handled by TypeORM
3. **File storage** - Use external storage (Vercel Blob, S3) for file persistence

## API Standards

### Error Handling

All API routes use standardized error handling utilities:

```typescript
import { apiHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';

export const GET = apiHandler(
  async (request) => {
    const data = await service.getData();
    return successResponse(data);
  },
  { 
    routeName: 'GET /api/resource',
    defaultErrorMessage: 'Failed to fetch resource'
  }
);
```

### Response Formats

#### Success Response
```json
{
  "data": { ... }
}
```

#### Error Response
```json
{
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": { ... } // Only in development
}
```

### Status Codes

- `200` - Success (GET, PUT, PATCH)
- `201` - Created (POST)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `404` - Not Found
- `413` - Payload Too Large
- `500` - Internal Server Error

### Request Validation

Use the `withValidation` wrapper for request body validation:

```typescript
export const POST = withValidation(
  async (request, body) => {
    const result = await service.create(body);
    return successResponse(result, 'Created successfully', 201);
  },
  (body: any) => {
    if (!body?.requiredField) return null;
    return body;
  }
);
```

## File Upload Architecture

### Chunk-Based Uploads

Large files are uploaded in chunks to handle Vercel's 4.5MB body size limit:
1. Initialize upload session
2. Upload chunks (max 4MB each)
3. Complete upload (with retry logic for race conditions)

### Storage Strategy

- Development: Local file storage
- Production: External storage (Vercel Blob or S3)
- Check for storage availability: `process.env.VERCEL_BLOB_READ_WRITE_TOKEN`

## Environment Variables

### Required Variables

```env
# Database
DATABASE_URL=              # PostgreSQL connection string (production)

# Storage (one of these for production)
VERCEL_BLOB_READ_WRITE_TOKEN=  # Vercel Blob storage
S3_ACCESS_KEY_ID=              # AWS S3
S3_SECRET_ACCESS_KEY=
S3_BUCKET=
S3_REGION=

# ML/AI Services
ANTHROPIC_API_KEY=         # For LLM features
GOOGLE_AI_API_KEY=         # For ML pattern detection
```

## Testing Strategy

### Test Types

1. **Unit Tests** - Component and utility function testing
   - Jest with React Testing Library
   - Coverage thresholds enforced
   - Run with `npm run test`

2. **Integration Tests** - API and database testing
   - Separate Jest configuration
   - Tests full request/response cycle
   - Run with `npm run test:integration`

3. **Smoke Tests** - Post-deployment verification
   - Lightweight health checks
   - Critical path validation
   - Run with `npm run test:smoke`

### Smoke Test Infrastructure

The project includes three smoke test implementations:

1. **Jest-based Test Suite** (`src/__tests__/smoke/`)
   - Comprehensive test coverage
   - Environment-aware test skipping
   - Detailed assertions and error reporting

2. **TypeScript Runner** (`scripts/run-smoke-tests.ts`)
   - Orchestrates Jest smoke tests
   - Health check before running tests
   - Saves results to `test-results/` directory

3. **Quick Verification Script** (`scripts/smoke-tests.js`)
   - Standalone script without Jest dependency
   - Rapid deployment verification
   - Suitable for CI/CD pipelines

### No Test/Debug Endpoints in Production

All `/api/test/*` and `/api/debug/*` endpoints should be removed before production deployment.

### Environment Detection

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
const isSmokeTest = process.env.SMOKE_TEST === 'true';
```

## Code Organization

### Directory Structure

```
src/
├── app/
│   └── api/          # Next.js API routes
├── entities/         # TypeORM entities
├── services/         # Business logic services
├── utils/           # Shared utilities
├── database/
│   ├── migrations/  # Database migrations
│   └── connection.ts # Database configuration
└── config/          # Configuration files
```

### Import Conventions

1. Use absolute imports with `@/` prefix
2. Group imports: external, internal, types
3. Avoid circular dependencies

## Security Considerations

1. **Never expose sensitive error details in production**
2. **Validate all user inputs**
3. **Use parameterized queries to prevent SQL injection**
4. **Store secrets in environment variables**
5. **Implement proper CORS headers for API routes**

## Performance Guidelines

1. **Use pagination for large datasets**
2. **Implement request throttling for expensive operations**
3. **Cache static data appropriately**
4. **Optimize database queries with proper indexes**
5. **Use streaming for large file operations**

## Maintenance Guidelines

1. **Run migrations in order**
2. **Test database changes locally first**
3. **Document breaking changes**
4. **Keep dependencies updated**
5. **Monitor error logs in production**