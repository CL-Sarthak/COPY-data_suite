// Export the API client
export { apiClient, APIError, type RequestConfig } from './client';

// Export all API endpoints
export { syntheticAPI } from './endpoints/synthetic.api';
export { dataSourceAPI } from './endpoints/dataSource.api';
export { patternAPI } from './endpoints/pattern.api';
export { catalogAPI } from './endpoints/catalog.api';
export { pipelineAPI } from './endpoints/pipeline.api';
export { utilityAPI } from './endpoints/utility.api';
export { uploadAPI } from './endpoints/upload.api';

// Re-export types from endpoints
export type {
  CreateSyntheticDatasetRequest,
  UpdateSyntheticDatasetRequest,
  SyntheticJobResponse,
  GenerateDataResponse,
  PreviewDataResponse
} from './endpoints/synthetic.api';

export type {
  CreateDataSourceRequest,
  UpdateDataSourceRequest,
  TransformOptions,
  SchemaResponse,
  ProfileResponse
} from './endpoints/dataSource.api';

export type {
  CreatePatternRequest,
  UpdatePatternRequest,
  PatternTestRequest,
  PatternTestResponse,
  PatternFeedbackRequest,
  RefinedPatternsResponse,
  PatternRefinementSuggestion,
  MLDetectionRequest,
  MLDetectionResponse
} from './endpoints/pattern.api';

export type {
  CatalogField,
  CatalogCategory,
  FieldMapping,
  MappingSuggestion,
  CreateFieldRequest,
  CreateCategoryRequest,
  CreateMappingRequest
} from './endpoints/catalog.api';

export type {
  CreatePipelineRequest,
  UpdatePipelineRequest,
  ExecutePipelineRequest,
  PipelineExecutionUpdate
} from './endpoints/pipeline.api';

export type {
  HealthCheckResponse,
  DashboardStats,
  SessionInfo,
  RedactionRequest,
  RedactionResponse,
  DatasetEnhancementRequest,
  DatasetEnhancementResponse
} from './endpoints/utility.api';

export type {
  UploadSession,
  InitializeUploadRequest,
  UploadChunkRequest,
  CompleteUploadRequest,
  UploadProgressUpdate
} from './endpoints/upload.api';