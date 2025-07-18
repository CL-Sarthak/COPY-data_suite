/**
 * Data Pipeline Builder Types
 * Defines the structure for visual workflow automation
 */

export interface PipelineNode {
  id: string;
  type: string | NodeType;  // Allow both for React Flow compatibility
  position: { x: number; y: number };
  data: NodeData;
  selected?: boolean;
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: 'default' | 'smoothstep' | 'straight';
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  triggers: PipelineTrigger[];
  schedule?: PipelineSchedule;
  status: PipelineStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
  version: number;
}

export type NodeType = 
  | 'source'
  | 'transform' 
  | 'analyze'
  | 'privacy'
  | 'output'
  | 'control';

export type PipelineStatus = 
  | 'draft'
  | 'active'
  | 'paused'
  | 'error'
  | 'completed';

export interface NodeData {
  label: string;
  description?: string;
  nodeType?: NodeType;  // Made optional to avoid breaking changes
  category: string;
  icon: string;
  color: string;
  config: Record<string, unknown>;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  metadata?: Record<string, unknown>;
}

export interface NodeInput {
  id: string;
  name: string;
  type: DataType;
  required: boolean;
  description?: string;
}

export interface NodeOutput {
  id: string;
  name: string;
  type: DataType;
  description?: string;
}

export type DataType = 
  | 'file'
  | 'json'
  | 'csv'
  | 'database'
  | 'api'
  | 'text'
  | 'binary'
  | 'report'
  | 'any';

export interface PipelineTrigger {
  id: string;
  type: TriggerType;
  config: Record<string, unknown>;
  enabled: boolean;
}

export type TriggerType = 
  | 'manual'
  | 'schedule'
  | 'file_watch'
  | 'webhook'
  | 'database_change';

export interface PipelineSchedule {
  enabled: boolean;
  cron: string;
  timezone: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PipelineExecution {
  id: string;
  pipelineId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  triggeredBy: TriggerType;
  logs: ExecutionLog[];
  metrics: ExecutionMetrics;
  error?: string;
}

export type ExecutionStatus = 
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExecutionLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  nodeId?: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ExecutionMetrics {
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  duration: number; // milliseconds
  dataProcessed: number; // bytes
  recordsProcessed: number;
  resourceUsage?: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

// Predefined Node Categories and Templates
export interface NodeTemplate {
  type: NodeType;
  category: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultConfig: Record<string, unknown>;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  configSchema?: Record<string, unknown>; // JSON Schema for config validation
}

// Pipeline Builder UI State
export interface PipelineBuilderState {
  pipeline: Pipeline;
  selectedNodes: string[];
  selectedEdges: string[];
  viewport: { x: number; y: number; zoom: number };
  isRunning: boolean;
  lastExecution?: PipelineExecution;
}