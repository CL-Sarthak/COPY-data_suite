import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { PipelineEntity } from '@/entities/PipelineEntity';
import { Pipeline } from '@/types/pipeline';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const database = await getDatabase();
    const pipelineRepository = database.getRepository(PipelineEntity);
    
    const entity = await pipelineRepository.findOne({
      where: { id: params.id }
    });

    if (!entity) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      );
    }

    const pipeline: Pipeline = {
      id: entity.id,
      name: entity.name,
      description: entity.description || '',
      nodes: entity.nodes ? JSON.parse(entity.nodes) : [],
      edges: entity.edges ? JSON.parse(entity.edges) : [],
      triggers: entity.triggers ? JSON.parse(entity.triggers) : [],
      schedule: entity.schedule ? JSON.parse(entity.schedule) : undefined,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      createdBy: entity.createdBy,
      tags: entity.tags ? JSON.parse(entity.tags) : [],
      version: entity.version
    };

    return NextResponse.json(pipeline);
  } catch (error) {
    console.error('Failed to fetch pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const database = await getDatabase();
    const pipelineRepository = database.getRepository(PipelineEntity);
    
    const result = await pipelineRepository.delete({ id: params.id });

    if (result.affected === 0) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to delete pipeline' },
      { status: 500 }
    );
  }
}