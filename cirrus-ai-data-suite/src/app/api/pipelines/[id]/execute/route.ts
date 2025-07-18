import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { PipelineEntity } from '@/entities/PipelineEntity';
import { Pipeline, PipelineExecution } from '@/types/pipeline';
import { registerExecution } from '@/services/pipelineExecutionService';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  
  try {
    const pipeline: Pipeline = await request.json();
    
    const database = await getDatabase();
    const pipelineRepository = database.getRepository(PipelineEntity);
    
    // Update pipeline status to running
    await pipelineRepository.update(
      { id: params.id },
      { status: 'active', updatedAt: new Date() }
    );

    // Create mock execution for demo purposes
    // In a real implementation, this would trigger actual pipeline execution
    const execution: PipelineExecution = {
      id: `exec_${Date.now()}`,
      pipelineId: pipeline.id,
      status: 'running',
      startedAt: new Date(),
      triggeredBy: 'manual',
      logs: [
        {
          timestamp: new Date(),
          level: 'info',
          message: 'Pipeline execution started',
          details: { nodeCount: pipeline.nodes.length }
        },
        {
          timestamp: new Date(),
          level: 'info',
          message: 'Validating pipeline structure',
          details: {}
        }
      ],
      metrics: {
        totalNodes: pipeline.nodes.length,
        completedNodes: 0,
        failedNodes: 0,
        duration: 0,
        dataProcessed: 0,
        recordsProcessed: 0
      }
    };

    // Register execution for SSE updates
    registerExecution(pipeline.id, execution);

    // Simulate some processing time
    setTimeout(async () => {
      try {
        // Update to completed status after 5 seconds (demo)
        await pipelineRepository.update(
          { id: params.id },
          { status: 'completed', updatedAt: new Date() }
        );
      } catch (error) {
        console.error('Failed to update pipeline status after execution:', error);
      }
    }, 5000);

    return NextResponse.json(execution);
  } catch (error) {
    console.error('Failed to execute pipeline:', error);
    
    // Update pipeline status to error
    try {
      const database = await getDatabase();
      const pipelineRepository = database.getRepository(PipelineEntity);
      await pipelineRepository.update(
        { id: params.id },
        { status: 'error', updatedAt: new Date() }
      );
    } catch (updateError) {
      console.error('Failed to update pipeline status to error:', updateError);
    }

    return NextResponse.json(
      { error: 'Failed to execute pipeline' },
      { status: 500 }
    );
  }
}