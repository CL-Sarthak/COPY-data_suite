import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { PipelineEntity } from '@/entities/PipelineEntity';
import { PipelineStatus } from '@/types/pipeline';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { status }: { status: PipelineStatus } = await request.json();
    
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

    entity.status = status;
    entity.updatedAt = new Date();
    await pipelineRepository.save(entity);

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Failed to update pipeline status:', error);
    return NextResponse.json(
      { error: 'Failed to update pipeline status' },
      { status: 500 }
    );
  }
}