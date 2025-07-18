/**
 * Pipeline Service
 * Handles pipeline persistence, loading, and management
 */

import { Pipeline, PipelineExecution, PipelineStatus } from '@/types/pipeline';

const STORAGE_KEY = 'cirrus_pipelines';
const EXECUTION_STORAGE_KEY = 'cirrus_pipeline_executions';

export class PipelineService {
  
  /**
   * Ensure date fields are proper Date objects
   */
  private static ensureDates(pipeline: Record<string, unknown>): Pipeline {
    return {
      ...pipeline,
      createdAt: pipeline.createdAt instanceof Date 
        ? pipeline.createdAt 
        : new Date(pipeline.createdAt as string),
      updatedAt: pipeline.updatedAt instanceof Date 
        ? pipeline.updatedAt 
        : new Date(pipeline.updatedAt as string)
    } as Pipeline;
  }

  /**
   * Save pipeline to local storage (immediate persistence)
   */
  static savePipelineToLocal(pipeline: Pipeline): void {
    try {
      const existingPipelines = this.getAllPipelinesFromLocal();
      const updatedPipelines = existingPipelines.filter(p => p.id !== pipeline.id);
      updatedPipelines.push({
        ...pipeline,
        updatedAt: new Date()
      });
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPipelines));
    } catch (error) {
      console.error('Failed to save pipeline to local storage:', error);
    }
  }

  /**
   * Get all pipelines from local storage
   */
  static getAllPipelinesFromLocal(): Pipeline[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const pipelines = JSON.parse(stored);
      return pipelines.map((p: Record<string, unknown>) => this.ensureDates(p));
    } catch (error) {
      console.error('Failed to load pipelines from local storage:', error);
      return [];
    }
  }

  /**
   * Get pipeline by ID from local storage
   */
  static getPipelineFromLocal(id: string): Pipeline | null {
    const pipelines = this.getAllPipelinesFromLocal();
    return pipelines.find(p => p.id === id) || null;
  }

  /**
   * Delete pipeline from local storage
   */
  static deletePipelineFromLocal(id: string): void {
    try {
      const pipelines = this.getAllPipelinesFromLocal();
      const filtered = pipelines.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete pipeline from local storage:', error);
    }
  }

  /**
   * Auto-save pipeline (debounced)
   */
  private static autoSaveTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  static autoSavePipeline(pipeline: Pipeline, delay: number = 2000): void {
    // Clear existing timeout for this pipeline
    const existingTimeout = this.autoSaveTimeouts.get(pipeline.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.savePipelineToLocal(pipeline);
      this.autoSaveTimeouts.delete(pipeline.id);
    }, delay);

    this.autoSaveTimeouts.set(pipeline.id, timeout);
  }

  /**
   * Save pipeline to backend API
   */
  static async savePipelineToAPI(pipeline: Pipeline): Promise<Pipeline> {
    try {
      const response = await fetch('/api/pipelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pipeline),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error('API error response:', errorData);
        throw new Error(`Failed to save pipeline: ${errorData.details || errorData.error || response.statusText}`);
      }

      const savedPipeline = await response.json();
      
      // Also save to local storage as backup
      this.savePipelineToLocal(savedPipeline);
      
      return savedPipeline;
    } catch (error) {
      console.error('Failed to save pipeline to API:', error);
      // Fallback to local storage
      this.savePipelineToLocal(pipeline);
      throw error;
    }
  }

  /**
   * Load all pipelines from API
   */
  static async getAllPipelinesFromAPI(): Promise<Pipeline[]> {
    try {
      const response = await fetch('/api/pipelines');
      
      if (!response.ok) {
        throw new Error(`Failed to load pipelines: ${response.statusText}`);
      }

      const pipelines = await response.json();
      
      // Cache in local storage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pipelines));
      
      return pipelines.map((p: Record<string, unknown>) => this.ensureDates(p));
    } catch (error) {
      console.error('Failed to load pipelines from API, using local storage:', error);
      // Fallback to local storage
      return this.getAllPipelinesFromLocal();
    }
  }

  /**
   * Get pipeline by ID from API
   */
  static async getPipelineFromAPI(id: string): Promise<Pipeline | null> {
    try {
      const response = await fetch(`/api/pipelines/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to load pipeline: ${response.statusText}`);
      }

      const pipeline = await response.json();
      return this.ensureDates(pipeline);
    } catch (error) {
      console.error('Failed to load pipeline from API, using local storage:', error);
      // Fallback to local storage
      return this.getPipelineFromLocal(id);
    }
  }

  /**
   * Delete pipeline from API
   */
  static async deletePipelineFromAPI(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/pipelines/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete pipeline: ${response.statusText}`);
      }

      // Also remove from local storage
      this.deletePipelineFromLocal(id);
    } catch (error) {
      console.error('Failed to delete pipeline from API:', error);
      // Still remove from local storage
      this.deletePipelineFromLocal(id);
      throw error;
    }
  }

  /**
   * Update pipeline status
   */
  static async updatePipelineStatus(id: string, status: PipelineStatus): Promise<void> {
    try {
      const response = await fetch(`/api/pipelines/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update pipeline status: ${response.statusText}`);
      }

      // Update local storage
      const pipelines = this.getAllPipelinesFromLocal();
      const updated = pipelines.map(p => 
        p.id === id ? { ...p, status, updatedAt: new Date() } : p
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update pipeline status:', error);
      throw error;
    }
  }

  /**
   * Execute pipeline
   */
  static async executePipeline(pipeline: Pipeline): Promise<PipelineExecution> {
    try {
      const response = await fetch(`/api/pipelines/${pipeline.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pipeline),
      });

      if (!response.ok) {
        throw new Error(`Failed to execute pipeline: ${response.statusText}`);
      }

      const execution = await response.json();
      
      // Save execution to local storage
      this.saveExecutionToLocal(execution);
      
      return {
        ...execution,
        startedAt: execution.startedAt instanceof Date 
          ? execution.startedAt 
          : new Date(execution.startedAt),
        completedAt: execution.completedAt 
          ? (execution.completedAt instanceof Date 
              ? execution.completedAt 
              : new Date(execution.completedAt))
          : undefined
      } as PipelineExecution;
    } catch (error) {
      console.error('Failed to execute pipeline:', error);
      
      // Create mock execution for demo purposes
      const mockExecution: PipelineExecution = {
        id: `exec_${Date.now()}`,
        pipelineId: pipeline.id,
        status: 'running',
        startedAt: new Date(),
        triggeredBy: 'manual',
        logs: [{
          timestamp: new Date(),
          level: 'info',
          message: 'Pipeline execution started',
          details: {}
        }],
        metrics: {
          totalNodes: pipeline.nodes.length,
          completedNodes: 0,
          failedNodes: 0,
          duration: 0,
          dataProcessed: 0,
          recordsProcessed: 0
        }
      };
      
      this.saveExecutionToLocal(mockExecution);
      return mockExecution;
    }
  }

  /**
   * Save execution to local storage
   */
  private static saveExecutionToLocal(execution: PipelineExecution): void {
    try {
      const existing = this.getAllExecutionsFromLocal();
      const updated = existing.filter(e => e.id !== execution.id);
      updated.push(execution);
      
      // Keep only last 50 executions
      if (updated.length > 50) {
        updated.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
        updated.splice(50);
      }
      
      localStorage.setItem(EXECUTION_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save execution to local storage:', error);
    }
  }

  /**
   * Get all executions from local storage
   */
  private static getAllExecutionsFromLocal(): PipelineExecution[] {
    try {
      const stored = localStorage.getItem(EXECUTION_STORAGE_KEY);
      if (!stored) return [];
      
      const executions = JSON.parse(stored);
      return executions.map((e: Record<string, unknown>) => ({
        ...e,
        startedAt: e.startedAt instanceof Date 
          ? e.startedAt 
          : new Date(e.startedAt as string),
        completedAt: e.completedAt 
          ? (e.completedAt instanceof Date 
              ? e.completedAt 
              : new Date(e.completedAt as string))
          : undefined
      })) as PipelineExecution[];
    } catch (error) {
      console.error('Failed to load executions from local storage:', error);
      return [];
    }
  }

  /**
   * Get executions for a specific pipeline
   */
  static getExecutionsForPipeline(pipelineId: string): PipelineExecution[] {
    return this.getAllExecutionsFromLocal()
      .filter(e => e.pipelineId === pipelineId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Validate pipeline structure
   */
  static validatePipeline(pipeline: Pipeline): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for nodes
    if (pipeline.nodes.length === 0) {
      errors.push('Pipeline must contain at least one node');
    }

    // Check for source nodes
    const sourceNodes = pipeline.nodes.filter(node => node.type === 'source');
    if (sourceNodes.length === 0) {
      errors.push('Pipeline must contain at least one source node');
    }

    // Check for output nodes
    const outputNodes = pipeline.nodes.filter(node => node.type === 'output');
    if (outputNodes.length === 0) {
      warnings.push('Pipeline has no output nodes - processed data will not be saved');
    }

    // Check for disconnected nodes
    const connectedNodeIds = new Set<string>();
    pipeline.edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
    
    const disconnectedNodes = pipeline.nodes.filter(node => 
      !connectedNodeIds.has(node.id) && pipeline.nodes.length > 1
    );
    
    if (disconnectedNodes.length > 0) {
      warnings.push(`${disconnectedNodes.length} node(s) are not connected to the pipeline`);
    }

    // Check for cycles (simplified)
    const hasValidFlow = this.validatePipelineFlow(pipeline);
    if (!hasValidFlow) {
      errors.push('Pipeline contains circular dependencies or invalid connections');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Simple pipeline flow validation
   */
  private static validatePipelineFlow(pipeline: Pipeline): boolean {
    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    pipeline.nodes.forEach(node => {
      adjacency.set(node.id, []);
    });

    pipeline.edges.forEach(edge => {
      const targets = adjacency.get(edge.source) || [];
      targets.push(edge.target);
      adjacency.set(edge.source, targets);
    });

    // Check for cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) return true;
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of adjacency.keys()) {
      if (!visited.has(nodeId)) {
        if (hasCycle(nodeId)) return false;
      }
    }

    return true;
  }

  /**
   * Export pipeline to JSON
   */
  static exportPipeline(pipeline: Pipeline): string {
    return JSON.stringify(pipeline, null, 2);
  }

  /**
   * Import pipeline from JSON
   */
  static importPipeline(jsonString: string): Pipeline {
    const pipeline = JSON.parse(jsonString);
    return {
      ...pipeline,
      id: `imported_${Date.now()}`,
      createdAt: new Date(pipeline.createdAt || new Date()),
      updatedAt: new Date(),
      version: 1
    };
  }
}