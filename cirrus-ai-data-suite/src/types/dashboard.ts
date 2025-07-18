export interface DashboardMetrics {
  dataSources: number;
  definedPatterns: number;
  assembledDatasets: number;
  syntheticRecordsGenerated: number;
  complianceScore: number;
  recentActivity: ActivityItem[];
  environmentStatus: EnvironmentStatus[];
  pipelineStages: PipelineStage[];
}

export interface PipelineStage {
  name: string;
  status: 'completed' | 'in-progress' | 'pending';
  count: number;
  description: string;
  link?: string;
}

export interface ActivityItem {
  id: string;
  type: 'discovery' | 'redaction' | 'synthetic' | 'deployment';
  description: string;
  timestamp: Date;
  status: 'completed' | 'in-progress' | 'failed';
}

export interface EnvironmentStatus {
  name: string;
  type: 'production' | 'uat' | 'test';
  lastSync: Date;
  status: 'active' | 'syncing' | 'error';
  recordCount: number;
}