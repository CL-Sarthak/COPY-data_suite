import { apiClient } from '../client';

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  database: {
    connected: boolean;
    type: string;
    error?: string;
  };
  timestamp: string;
  version?: string;
}

export interface DashboardStats {
  dataSources: {
    total: number;
    byType: Record<string, number>;
    recentlyAdded: number;
  };
  patterns: {
    total: number;
    active: number;
    byCategory: Record<string, number>;
  };
  syntheticData: {
    totalDatasets: number;
    totalRecordsGenerated: number;
    activeJobs: number;
  };
  pipelines: {
    total: number;
    active: number;
    recentExecutions: number;
  };
  storage: {
    used: number;
    limit: number;
    percentage: number;
  };
}

export interface SessionInfo {
  id: string;
  userId?: string;
  createdAt: string;
  lastActivity: string;
  metadata?: Record<string, unknown>;
}

export interface RedactionRequest {
  text: string;
  patterns?: string[];
  replacementStrategy?: 'mask' | 'synthetic' | 'remove';
  preserveFormat?: boolean;
}

export interface RedactionResponse {
  original: string;
  redacted: string;
  redactedCount: number;
  redactions: Array<{
    pattern: string;
    text: string;
    start: number;
    end: number;
    replacement: string;
  }>;
}

export interface DatasetEnhancementRequest {
  sourceId: string;
  enhancementType: 'llm_field_analysis' | 'pattern_based' | 'statistical';
  options?: {
    fieldsToAdd?: string[];
    preserveOriginal?: boolean;
    sampleSize?: number;
  };
}

export interface DatasetEnhancementResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  sourceId: string;
  enhancementType: string;
  startedAt: string;
  completedAt?: string;
  result?: {
    enhancedRecords: number;
    fieldsAdded: string[];
    outputDataSourceId?: string;
  };
  error?: string;
}

export interface MLServiceStatus {
  available: boolean;
  model?: string;
  capabilities?: string[];
  error?: string;
}

export class UtilityAPI {
  // Health checks
  async healthCheck(): Promise<HealthCheckResponse> {
    return apiClient.get<HealthCheckResponse>('/health');
  }

  async databaseHealth(): Promise<{
    connected: boolean;
    type: string;
    tables?: string[];
    error?: string;
  }> {
    return apiClient.get('/health/db');
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>('/dashboard');
  }

  async getDashboardUpdates(since?: string): Promise<{
    updates: Array<{
      type: string;
      message: string;
      timestamp: string;
      data?: unknown;
    }>;
  }> {
    return apiClient.get('/dashboard/updates', {
      params: since ? { since } : {}
    });
  }

  // Sessions
  async getSession(id?: string): Promise<SessionInfo> {
    const endpoint = id ? `/sessions/${id}` : '/sessions';
    return apiClient.get<SessionInfo>(endpoint);
  }

  async createSession(metadata?: Record<string, unknown>): Promise<SessionInfo> {
    return apiClient.post<SessionInfo>('/sessions', { metadata });
  }

  async updateSession(id: string, metadata: Record<string, unknown>): Promise<SessionInfo> {
    return apiClient.patch<SessionInfo>(`/sessions/${id}`, { metadata });
  }

  // Redaction
  async redactText(data: RedactionRequest): Promise<RedactionResponse> {
    return apiClient.post<RedactionResponse>('/redact', data);
  }

  // Dataset Enhancement
  async analyzeDataset(sourceId: string): Promise<{
    fields: Array<{
      name: string;
      type: string;
      uniqueValues: number;
      nullPercentage: number;
      suggestedEnhancements: string[];
    }>;
    enhancementOpportunities: Array<{
      type: string;
      description: string;
      estimatedNewFields: number;
    }>;
  }> {
    return apiClient.post('/dataset-enhancement/analyze', { sourceId });
  }

  async enhanceDataset(data: DatasetEnhancementRequest): Promise<DatasetEnhancementResponse> {
    return apiClient.post<DatasetEnhancementResponse>('/dataset-enhancement/enhance', data);
  }

  // Migrations
  async runMigrations(): Promise<{
    success: boolean;
    migrationsRun: string[];
    error?: string;
  }> {
    return apiClient.post('/migrations/run');
  }

  // ML/LLM Status
  async getMLStatus(): Promise<{
    available: boolean;
    model?: string;
    capabilities?: string[];
    error?: string;
  }> {
    return apiClient.get('/ml/status');
  }

  async getLLMStatus(): Promise<{
    available: boolean;
    provider?: string;
    model?: string;
    capabilities?: string[];
    error?: string;
  }> {
    return apiClient.get('/llm/status');
  }

  // File operations
  async getProcessedFiles(limit = 100): Promise<Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    processedAt?: string;
    status: string;
    metadata?: Record<string, unknown>;
  }>> {
    return apiClient.get('/processed-files', { params: { limit } });
  }

  // Profiling
  async getProfilingStats(sourceId?: string): Promise<{
    sources: Array<{
      id: string;
      name: string;
      lastProfiledAt?: string;
      fieldCount: number;
      recordCount: number;
    }>;
    aggregateStats?: {
      totalSources: number;
      totalFields: number;
      totalRecords: number;
      averageCompleteness: number;
    };
  }> {
    return apiClient.get('/profiling/stats', { params: sourceId ? { sourceId } : {} });
  }

  // Debug endpoints (development only)
  async checkPatternsTable(): Promise<unknown> {
    return apiClient.get('/debug/check-patterns-table');
  }

  async getDatabaseState(): Promise<unknown> {
    return apiClient.get('/debug/database-state');
  }

  async getTypeORMMetadata(): Promise<unknown> {
    return apiClient.get('/debug/typeorm-metadata');
  }

  // SSE Subscriptions
  subscribeToDashboardUpdates(
    onUpdate: (update: DashboardStats) => void,
    onError?: (error: Error) => void
  ): EventSource {
    const eventSource = new EventSource('/api/dashboard/updates');

    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        onUpdate(update);
      } catch (error) {
        console.error('Failed to parse dashboard update:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Dashboard SSE error:', error);
      if (onError) {
        onError(new Error('Lost connection to dashboard updates'));
      }
    };

    return eventSource;
  }

  subscribeToMLStatus(
    onUpdate: (status: MLServiceStatus) => void,
    onError?: (error: Error) => void
  ): EventSource {
    const eventSource = new EventSource('/api/ml/status/updates');

    eventSource.onmessage = (event) => {
      try {
        const status = JSON.parse(event.data);
        onUpdate(status);
      } catch (error) {
        console.error('Failed to parse ML status:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('ML status SSE error:', error);
      if (onError) {
        onError(new Error('Lost connection to ML status updates'));
      }
    };

    return eventSource;
  }
}

export const utilityAPI = new UtilityAPI();