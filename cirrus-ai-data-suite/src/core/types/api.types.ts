// Base API response types
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// Pagination types
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// Common entity types
export interface TimestampedEntity {
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IdentifiableEntity {
  id: string;
}

// File upload types
export interface FileUploadResponse {
  success: boolean;
  files?: Array<{
    name: string;
    size: number;
    type: string;
    storageKey?: string;
  }>;
  error?: string;
}

export interface ChunkedUploadSession {
  uploadId: string;
  chunkSize: number;
  totalChunks: number;
}

// Job/Task types
export interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  result?: unknown;
  error?: string;
  startedAt?: Date | string;
  completedAt?: Date | string;
}