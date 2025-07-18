// API connector types and interfaces

export type ApiAuthType = 'none' | 'api-key' | 'bearer' | 'basic' | 'oauth2';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiConnection {
  id: string;
  name: string;
  endpoint: string;
  method: HttpMethod;
  authType: ApiAuthType;
  authConfig?: ApiAuthConfig;
  headers?: Record<string, string>;
  requestBody?: unknown;
  paginationConfig?: PaginationConfig;
  rateLimit?: number; // requests per minute
  timeout?: number; // milliseconds
  retryCount?: number;
  refreshEnabled?: boolean;
  refreshInterval?: number; // minutes
  lastRefreshAt?: Date;
  nextRefreshAt?: Date;
  lastTestedAt?: Date;
  status: 'active' | 'inactive' | 'error';
  errorMessage?: string;
  responseMapping?: ResponseMapping;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiAuthConfig {
  // API Key auth
  apiKey?: string;
  apiKeyHeader?: string; // Default: X-API-Key
  
  // Bearer token auth
  bearerToken?: string;
  
  // Basic auth
  username?: string;
  password?: string;
  
  // OAuth2
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  scope?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface PaginationConfig {
  type: 'offset' | 'page' | 'cursor' | 'link-header' | 'none';
  
  // Offset-based pagination
  offsetParam?: string;
  limitParam?: string;
  defaultLimit?: number;
  
  // Page-based pagination
  pageParam?: string;
  pageSizeParam?: string;
  startPage?: number;
  
  // Cursor-based pagination
  cursorParam?: string;
  cursorPath?: string; // JSON path to cursor in response
  
  // Response parsing
  dataPath?: string; // JSON path to data array
  totalPath?: string; // JSON path to total count
  hasMorePath?: string; // JSON path to hasMore flag
  nextLinkPath?: string; // JSON path to next page link
}

export interface ResponseMapping {
  dataPath?: string; // JSON path to data (e.g., "data.items")
  recordsPath?: string; // Alternative path for records
  errorPath?: string; // Path to error messages
  successPath?: string; // Path to success flag
  transformations?: DataTransformation[];
}

export interface DataTransformation {
  type: 'rename' | 'extract' | 'flatten' | 'filter' | 'map';
  config: Record<string, unknown>;
}

export interface ApiQueryResult {
  data: unknown[];
  totalCount?: number;
  hasMore?: boolean;
  nextCursor?: string;
  nextPage?: number;
  metadata?: Record<string, unknown>;
}

export interface ApiTestResult {
  success: boolean;
  message: string;
  statusCode?: number;
  responseTime?: number;
  sampleData?: unknown;
  error?: string;
}

export interface IApiConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<ApiTestResult>;
  fetchData(params?: FetchParams): Promise<ApiQueryResult>;
  fetchAllData(params?: FetchParams): Promise<unknown[]>;
}

export interface FetchParams {
  // Query parameters to add to the request
  queryParams?: Record<string, string | number>;
  
  // Override request body
  body?: unknown;
  
  // Additional headers for this request
  headers?: Record<string, string>;
  
  // Pagination overrides
  offset?: number;
  limit?: number;
  page?: number;
  cursor?: string;
  
  // Request options
  timeout?: number;
  maxRetries?: number;
}

export interface ApiConnectorOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  rateLimitPerMinute?: number;
  userAgent?: string;
}