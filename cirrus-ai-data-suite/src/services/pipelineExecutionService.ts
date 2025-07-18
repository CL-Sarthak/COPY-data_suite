import { PipelineExecution } from '@/types/pipeline';

// Store active executions in memory (in production, use Redis or similar)
const activeExecutions = new Map<string, PipelineExecution>();

export function registerExecution(pipelineId: string, execution: PipelineExecution) {
  activeExecutions.set(pipelineId, execution);
}

export function getActiveExecution(pipelineId: string): PipelineExecution | undefined {
  return activeExecutions.get(pipelineId);
}

export function removeExecution(pipelineId: string): void {
  activeExecutions.delete(pipelineId);
}

export function getAllActiveExecutions(): Map<string, PipelineExecution> {
  return activeExecutions;
}