import { NextRequest } from 'next/server';
import { getDatabase } from '@/database/connection';
import { PipelineEntity } from '@/entities/PipelineEntity';
import { createSSEResponse } from '@/services/sseService';
import { ExecutionLog } from '@/types/pipeline';
import { getActiveExecution, removeExecution } from '@/services/pipelineExecutionService';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const pipelineId = params.id;

  return createSSEResponse(async (send) => {
    // Send initial pipeline status
    try {
      const database = await getDatabase();
      const pipelineRepository = database.getRepository(PipelineEntity);
      const pipeline = await pipelineRepository.findOne({ where: { id: pipelineId } });
      
      if (!pipeline) {
        send({
          type: 'error',
          message: `Pipeline ${pipelineId} not found`,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Send current pipeline status
      send({
        type: 'pipeline_status',
        data: {
          id: pipeline.id,
          name: pipeline.name,
          status: pipeline.status,
          updatedAt: pipeline.updatedAt
        },
        timestamp: new Date().toISOString()
      });

      // Get active execution if any
      const execution = getActiveExecution(pipelineId);
      if (execution) {
        send({
          type: 'execution_update',
          data: execution,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to get pipeline status:', error);
      send({
        type: 'error',
        message: 'Failed to load pipeline status',
        timestamp: new Date().toISOString()
      });
    }

    // Simulate pipeline execution updates
    let nodeIndex = 0;
    const totalNodes = 5; // Mock number of nodes
    
    const interval = setInterval(async () => {
      try {
        // Check if there's an active execution
        const execution = getActiveExecution(pipelineId);
        if (!execution || execution.status !== 'running') {
          return; // No active execution
        }

        // Simulate node processing
        if (nodeIndex < totalNodes) {
          nodeIndex++;
          
          // Update execution progress
          execution.metrics.completedNodes = nodeIndex;
          execution.metrics.duration = Date.now() - execution.startedAt.getTime();
          execution.metrics.dataProcessed = nodeIndex * 1024 * 1024; // Mock data size
          execution.metrics.recordsProcessed = nodeIndex * 1000; // Mock record count
          
          // Add log entry
          const logEntry: ExecutionLog = {
            timestamp: new Date(),
            level: 'info',
            message: `Processing node ${nodeIndex} of ${totalNodes}`,
            details: { 
              nodeId: `node_${nodeIndex}`,
              progress: (nodeIndex / totalNodes) * 100
            }
          };
          execution.logs.push(logEntry);

          // Send progress update
          send({
            type: 'execution_progress',
            data: {
              executionId: execution.id,
              progress: (nodeIndex / totalNodes) * 100,
              metrics: execution.metrics,
              currentNode: nodeIndex,
              totalNodes,
              log: logEntry
            },
            timestamp: new Date().toISOString()
          });

          // Check if completed
          if (nodeIndex === totalNodes) {
            execution.status = 'completed';
            execution.completedAt = new Date();
            
            // Update pipeline status in database
            const database = await getDatabase();
            const pipelineRepository = database.getRepository(PipelineEntity);
            await pipelineRepository.update(
              { id: pipelineId },
              { status: 'completed', updatedAt: new Date() }
            );

            send({
              type: 'execution_completed',
              data: execution,
              timestamp: new Date().toISOString()
            });

            // Remove from active executions
            removeExecution(pipelineId);
          }
        }
      } catch (error) {
        console.error('Error during pipeline execution update:', error);
        send({
          type: 'execution_error',
          data: {
            executionId: getActiveExecution(pipelineId)?.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          timestamp: new Date().toISOString()
        });
      }
    }, 2000); // Update every 2 seconds

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      send({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      });
    }, 15000);

    // Cleanup on connection close
    if (typeof request.signal !== 'undefined') {
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        clearInterval(heartbeat);
      });
    }

    // Keep connection open
    return new Promise(() => {});
  });
}