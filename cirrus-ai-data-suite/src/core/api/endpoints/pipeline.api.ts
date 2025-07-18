import { apiClient } from '../client';
import { Pipeline, PipelineExecution, PipelineNode } from '@/types/pipeline';
import { ApiResponse } from '@/core/types/api.types';

export interface CreatePipelineRequest {
  name: string;
  description?: string;
  category?: string;
  nodes: PipelineNode[];
  edges: Array<{ source: string; target: string }>;
  configuration?: Record<string, unknown>;
}

export interface UpdatePipelineRequest extends Partial<CreatePipelineRequest> {
  status?: Pipeline['status'];
}

export interface ExecutePipelineRequest {
  input?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  dryRun?: boolean;
}

export interface PipelineExecutionUpdate {
  executionId: string;
  status: PipelineExecution['status'];
  progress?: number;
  currentNode?: string;
  logs?: Array<{
    timestamp: string;
    level: 'info' | 'warning' | 'error';
    message: string;
    nodeId?: string;
  }>;
  error?: string;
}

export class PipelineAPI {
  // Get all pipelines
  async getPipelines(category?: string, status?: Pipeline['status']): Promise<Pipeline[]> {
    const params: Record<string, string> = {};
    if (category) params.category = category;
    if (status) params.status = status;
    
    return apiClient.get<Pipeline[]>('/pipelines', {
      params: Object.keys(params).length > 0 ? params : undefined
    });
  }

  // Get a single pipeline
  async getPipeline(id: string): Promise<Pipeline> {
    return apiClient.get<Pipeline>(`/pipelines/${id}`);
  }

  // Create a new pipeline
  async createPipeline(data: CreatePipelineRequest): Promise<Pipeline> {
    return apiClient.post<Pipeline>('/pipelines', data);
  }

  // Update a pipeline
  async updatePipeline(id: string, data: UpdatePipelineRequest): Promise<Pipeline> {
    return apiClient.put<Pipeline>(`/pipelines/${id}`, data);
  }

  // Delete a pipeline
  async deletePipeline(id: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/pipelines/${id}`);
  }

  // Execute a pipeline
  async executePipeline(id: string, data?: ExecutePipelineRequest): Promise<{
    executionId: string;
    status: PipelineExecution['status'];
    message: string;
  }> {
    return apiClient.post(`/pipelines/${id}/execute`, data || {});
  }

  // Get pipeline execution status
  async getExecutionStatus(pipelineId: string, executionId: string): Promise<PipelineExecution> {
    return apiClient.get<PipelineExecution>(`/pipelines/${pipelineId}/execution/${executionId}`);
  }

  // Get pipeline status (simpler status endpoint)
  async getPipelineStatus(id: string): Promise<{
    status: Pipeline['status'];
    lastExecution?: {
      id: string;
      status: PipelineExecution['status'];
      startedAt: string;
      completedAt?: string;
    };
    statistics?: {
      totalExecutions: number;
      successfulExecutions: number;
      failedExecutions: number;
      averageDuration: number;
    };
  }> {
    return apiClient.get(`/pipelines/${id}/status`);
  }

  // Clone a pipeline
  async clonePipeline(id: string, newName: string): Promise<Pipeline> {
    return apiClient.post<Pipeline>(`/pipelines/${id}/clone`, { name: newName });
  }

  // Validate a pipeline configuration
  async validatePipeline(data: CreatePipelineRequest): Promise<{
    valid: boolean;
    errors?: Array<{
      nodeId?: string;
      field?: string;
      message: string;
    }>;
    warnings?: Array<{
      nodeId?: string;
      message: string;
    }>;
  }> {
    return apiClient.post('/pipelines/validate', data);
  }

  // Get pipeline templates
  async getTemplates(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    nodes: PipelineNode[];
    edges: Array<{ source: string; target: string }>;
  }>> {
    return apiClient.get('/pipelines/templates');
  }

  // Export pipeline
  async exportPipeline(id: string): Promise<void> {
    const pipeline = await this.getPipeline(id);
    const filename = `pipeline-${pipeline.name.replace(/\s+/g, '-')}-${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(pipeline, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Import pipeline
  async importPipeline(file: File): Promise<Pipeline> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload<Pipeline>('/pipelines/import', formData);
  }

  // Subscribe to execution updates (SSE)
  subscribeToExecutionUpdates(
    pipelineId: string,
    executionId: string,
    onUpdate: (update: PipelineExecutionUpdate) => void,
    onError?: (error: Error) => void
  ): EventSource {
    const eventSource = new EventSource(
      `/api/pipelines/${pipelineId}/execution/updates?executionId=${executionId}`
    );

    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data) as PipelineExecutionUpdate;
        onUpdate(update);
      } catch (error) {
        console.error('Failed to parse execution update:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      if (onError) {
        onError(new Error('Lost connection to execution updates'));
      }
      eventSource.close();
    };

    return eventSource;
  }
}

export const pipelineAPI = new PipelineAPI();