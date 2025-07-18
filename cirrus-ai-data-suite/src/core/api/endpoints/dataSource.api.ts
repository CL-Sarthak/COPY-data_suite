import { apiClient } from '../client';
import { DataSource, DataSourceConfig } from '@/types/discovery';
import { UnifiedDataCatalog } from '@/services/dataTransformationService';
import { ApiResponse } from '@/core/types/api.types';

export interface CreateDataSourceRequest {
  name: string;
  type: DataSource['type'];
  configuration: DataSourceConfig;
  metadata?: Record<string, unknown>;
  recordCount?: number;
}

export interface UpdateDataSourceRequest {
  name?: string;
  tags?: string[];
  configuration?: DataSourceConfig;
}

export interface TransformOptions {
  page?: number;
  pageSize?: number;
  forceRetransform?: boolean;
}

export interface SchemaResponse {
  schema?: Record<string, unknown>;
  originalSchema?: { fields: Array<{ name: string; type: string }> };
  normalizedSchema?: { fields: Array<{ name: string; type: string }> };
  fields?: Array<{ name: string; type: string }>;
}

export interface ProfileResponse {
  sourceId: string;
  sourceName: string;
  lastProfiledAt: string;
  fieldProfiles: Array<{
    fieldName: string;
    dataType: string;
    uniqueCount: number;
    nullCount: number;
    minValue?: string | number;
    maxValue?: string | number;
    avgValue?: number;
    topValues: Array<{ value: string | number | boolean | null; count: number }>;
    patterns?: Array<{ pattern: string; count: number; examples: string[] }>;
  }>;
  statistics: {
    totalRecords: number;
    totalFields: number;
    completeness: number;
  };
}

export class DataSourceAPI {
  // Get all data sources
  async getDataSources(): Promise<DataSource[]> {
    return apiClient.get<DataSource[]>('/api/data-sources');
  }

  // Get a single data source
  async getDataSource(id: string, includeFileContent = false): Promise<DataSource> {
    return apiClient.get<DataSource>(`/api/data-sources/${id}`, {
      params: { includeFileContent }
    });
  }

  // Create a new data source
  async createDataSource(data: CreateDataSourceRequest): Promise<DataSource> {
    return apiClient.post<DataSource>('/api/data-sources', data);
  }

  // Update a data source
  async updateDataSource(id: string, data: UpdateDataSourceRequest): Promise<DataSource> {
    return apiClient.patch<DataSource>(`/api/data-sources/${id}`, data);
  }

  // Delete a data source
  async deleteDataSource(id: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/api/data-sources/${id}`);
  }

  // Get data source schema
  async getSchema(id: string): Promise<SchemaResponse> {
    return apiClient.get<SchemaResponse>(`/api/data-sources/${id}/schema`);
  }

  // Transform data source
  async transformDataSource(id: string, options?: TransformOptions): Promise<UnifiedDataCatalog> {
    return apiClient.get<UnifiedDataCatalog>(`/api/data-sources/${id}/transform`, {
      params: options ? { ...options } : undefined
    });
  }

  // Apply field mappings
  async applyMappings(id: string, forceRetransform = false): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(`/api/data-sources/${id}/transform/apply-mappings`, {
      forceRetransform
    });
  }

  // Save transformed data
  async saveTransformedData(id: string, data: unknown): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(`/api/data-sources/${id}/transform/save`, data);
  }

  // Export transformed data
  async exportTransformedData(id: string, format: 'json' | 'csv'): Promise<void> {
    const filename = `export-${id}-${Date.now()}.${format}`;
    return apiClient.download(`/api/data-sources/${id}/transform/export?format=${format}`, filename);
  }

  // Download transformed data
  async downloadTransformedData(id: string): Promise<void> {
    const filename = `data-${id}-${Date.now()}.json`;
    return apiClient.download(`/api/data-sources/${id}/transform/download`, filename);
  }

  // Profile data source
  async profileDataSource(id: string): Promise<ProfileResponse> {
    return apiClient.get<ProfileResponse>(`/api/data-sources/${id}/profile`);
  }

  // Batch profile multiple sources
  async batchProfile(sourceIds: string[]): Promise<ProfileResponse[]> {
    return apiClient.post<ProfileResponse[]>('/api/data-sources/profile/batch', { sourceIds });
  }

  // Get raw data (for preview)
  async getRawData(id: string, limit?: number): Promise<{ data: unknown[]; totalRecords: number }> {
    return apiClient.get<{ data: unknown[]; totalRecords: number }>(`/api/data-sources/${id}/raw`, {
      params: limit ? { limit } : {}
    });
  }

  // Seed sample data sources
  async seedSampleData(): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>('/api/data-sources/seed');
  }

  // Add files to existing data source
  async addFiles(id: string, files: FormData): Promise<DataSource> {
    return apiClient.upload<DataSource>(`/api/data-sources/${id}/files`, files);
  }
}

export const dataSourceAPI = new DataSourceAPI();