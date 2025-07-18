/**
 * Files to be removed or deprecated in the codebase cleanup
 */

export const DEPRECATED_FILES = [
  // Direct service implementations (replaced with unified services)
  'src/services/patternServiceDirect.ts',
  'src/services/streaming/streamingUploadServiceDirect.ts',
  
  // Test/debug endpoints that shouldn't be in production
  'src/app/api/test/upload-init-debug/route.ts',
  'src/app/api/test/upload-status-debug/route.ts', 
  'src/app/api/test/upload-complete-test/route.ts',
  'src/app/api/test/pattern-table-check/route.ts',
  'src/app/api/debug/database/route.ts',
  'src/app/api/debug/ml-config/route.ts',
  'src/app/api/debug/enhancement/route.ts',
  'src/app/api/debug/run-migrations/route.ts',
  'src/app/api/debug/pattern-columns/route.ts',
  'src/app/api/debug/database-state/route.ts',
  
  // Duplicate/temporary implementations
  'src/app/api/streaming/upload/complete-v2/route.ts',
];

export const FILES_TO_UPDATE = [
  // API routes that need to switch from Direct services
  'src/app/api/streaming/upload/chunk/route.ts',
  'src/app/api/streaming/upload/complete/route.ts',
  
  // Routes that need standardized error handling
  'src/app/api/data-sources/route.ts',
  'src/app/api/sessions/route.ts',
  'src/app/api/synthetic/route.ts',
  'src/app/api/catalog/fields/route.ts',
  'src/app/api/ml/detect/route.ts',
];

export const MIGRATIONS_TO_REVIEW = [
  // Conflicting migrations that need resolution
  'src/database/migrations/022_fix_column_case_sensitivity.ts',
  'src/database/migrations/023_convert_to_snake_case.ts',
];