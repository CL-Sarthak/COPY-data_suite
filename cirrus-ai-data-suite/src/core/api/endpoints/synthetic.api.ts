import { apiClient } from '../client';
import { 
  SyntheticDataConfig, 
  SyntheticDataJob
} from '@/types/synthetic';
import { SyntheticDataset } from '@/entities/SyntheticDataset';
import { ApiResponse } from '@/core/types/api.types';

export interface CreateSyntheticDatasetRequest {
  name: string;
  description?: string;
  dataType: string;
  recordCount: number;
  schema: Record<string, unknown>;
  outputFormat: 'json' | 'csv' | 'parquet';
  configuration?: {
    seed?: number;
    locale?: string;
  };
  sourceDataId?: string;
}

export interface UpdateSyntheticDatasetRequest {
  name?: string;
  recordCount?: number;
  outputFormat?: 'json' | 'csv' | 'parquet';
  configuration?: Record<string, unknown>;
}

export interface SyntheticJobResponse {
  id: string;
  datasetId: string;
  status: string;
  progress: number;
  recordsGenerated: number;
  startTime: string;
  endTime?: string;
  outputFile?: string;
  errorMessage?: string;
  createdAt?: string;
}

export interface GenerateDataResponse {
  success: boolean;
  message: string;
  job?: SyntheticJobResponse;
}

export interface PreviewDataResponse {
  records: Record<string, unknown>[];
  schema: Record<string, unknown>;
  dataset: {
    name: string;
    recordCount: number;
  };
}

export class SyntheticAPI {
  // Get all synthetic datasets/configurations
  async getDatasets(): Promise<SyntheticDataset[]> {
    return apiClient.get<SyntheticDataset[]>('/api/synthetic');
  }

  // Get a single dataset
  async getDataset(id: string): Promise<SyntheticDataset> {
    return apiClient.get<SyntheticDataset>(`/api/synthetic/${id}`);
  }

  // Create a new synthetic dataset
  async createDataset(data: CreateSyntheticDatasetRequest): Promise<SyntheticDataset> {
    return apiClient.post<SyntheticDataset>('/api/synthetic', data);
  }

  // Update a dataset
  async updateDataset(id: string, data: UpdateSyntheticDatasetRequest): Promise<SyntheticDataset> {
    return apiClient.put<SyntheticDataset>(`/api/synthetic/${id}`, data);
  }

  // Delete a dataset
  async deleteDataset(id: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/api/synthetic/${id}`);
  }

  // Get available templates
  async getTemplates(): Promise<Record<string, Record<string, unknown>>> {
    return apiClient.get<Record<string, Record<string, unknown>>>('/api/synthetic/templates', {
      timeout: 10000 // 10 second timeout
    });
  }

  // Generate synthetic data for a dataset
  async generateData(datasetId: string): Promise<GenerateDataResponse> {
    return apiClient.post<GenerateDataResponse>(`/api/synthetic/${datasetId}/generate`);
  }

  // Preview synthetic data
  async previewData(datasetId: string): Promise<PreviewDataResponse> {
    return apiClient.get<PreviewDataResponse>(`/api/synthetic/${datasetId}/preview`);
  }

  // Download generated data
  async downloadData(datasetId: string, filename: string): Promise<void> {
    return apiClient.download(`/api/synthetic/${datasetId}/download`, filename);
  }

  // Get all jobs
  async getJobs(): Promise<SyntheticJobResponse[]> {
    return apiClient.get<SyntheticJobResponse[]>('/api/synthetic/jobs');
  }

  // Get a specific job
  async getJob(jobId: string): Promise<SyntheticJobResponse> {
    return apiClient.get<SyntheticJobResponse>(`/api/synthetic/jobs/${jobId}`);
  }

  // Delete a job
  async deleteJob(jobId: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/api/synthetic/jobs/${jobId}`);
  }

  // Add synthetic data to data sources
  async addToDataSource(datasetId: string, dataSourceName: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(`/api/synthetic/${datasetId}/add-to-datasource`, {
      name: dataSourceName
    });
  }

  // Convert API response to local format
  convertApiDatasetToConfig(dataset: SyntheticDataset): SyntheticDataConfig {
    return {
      id: dataset.id,
      name: dataset.name,
      sourceDataset: `${dataset.dataType} template`,
      outputFormat: dataset.outputFormat || 'json',
      privacyLevel: 'medium' as const,
      preserveStatistics: true,
      preserveRelationships: true,
      configuration: {
        recordCount: dataset.recordCount,
        transformationRules: [],
        includeMetadata: true,
        generateReport: true
      }
    };
  }

  // Convert API job to local format
  convertApiJobToLocal(job: SyntheticJobResponse): SyntheticDataJob {
    return {
      id: job.id,
      configId: job.datasetId,
      status: job.status as SyntheticDataJob['status'],
      progress: job.progress,
      recordsGenerated: job.recordsGenerated,
      startTime: new Date(job.startTime || job.createdAt || Date.now()),
      endTime: job.endTime ? new Date(job.endTime) : undefined,
      outputFile: job.outputFile,
      errorMessage: job.errorMessage
    };
  }
}

export const syntheticAPI = new SyntheticAPI();