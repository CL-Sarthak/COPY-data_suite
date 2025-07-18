import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { PipelineEntity } from '@/entities/PipelineEntity';
import { Pipeline } from '@/types/pipeline';

export async function GET() {
  try {
    const database = await getDatabase();
    const pipelineRepository = database.getRepository(PipelineEntity);
    
    const pipelines = await pipelineRepository.find({
      order: { updatedAt: 'DESC' }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedPipelines: Pipeline[] = pipelines.map((entity: any) => ({
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
    }));

    return NextResponse.json(formattedPipelines);
  } catch (error) {
    console.error('Failed to fetch pipelines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipelines' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const pipelineData: Pipeline = await request.json();
    
    console.log('Received pipeline data:', pipelineData);
    
    // Validate required fields
    if (!pipelineData.id || !pipelineData.name) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'Pipeline must have an id and name'
        },
        { status: 400 }
      );
    }
    
    const database = await getDatabase();
    console.log('Database connected, entity metadata count:', database.entityMetadatas.length);
    
    const pipelineRepository = database.getRepository(PipelineEntity);
    console.log('Pipeline repository obtained');

    // Check if pipeline exists (update) or create new
    let entity = await pipelineRepository.findOne({ 
      where: { id: pipelineData.id } 
    });

    if (entity) {
      // Update existing
      entity.name = pipelineData.name;
      entity.description = pipelineData.description || '';
      entity.nodes = JSON.stringify(pipelineData.nodes || []);
      entity.edges = JSON.stringify(pipelineData.edges || []);
      entity.triggers = JSON.stringify(pipelineData.triggers || []);
      entity.schedule = pipelineData.schedule ? JSON.stringify(pipelineData.schedule) : undefined;
      entity.status = pipelineData.status || 'draft';
      entity.updatedAt = new Date();
      entity.tags = JSON.stringify(pipelineData.tags || []);
      entity.version = (entity.version || 0) + 1;
    } else {
      // Create new
      entity = pipelineRepository.create({
        id: pipelineData.id,
        name: pipelineData.name,
        description: pipelineData.description || '',
        nodes: JSON.stringify(pipelineData.nodes || []),
        edges: JSON.stringify(pipelineData.edges || []),
        triggers: JSON.stringify(pipelineData.triggers || []),
        schedule: pipelineData.schedule ? JSON.stringify(pipelineData.schedule) : undefined,
        status: pipelineData.status || 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: pipelineData.createdBy || 'current-user',
        tags: JSON.stringify(pipelineData.tags || []),
        version: 1
      });
    }

    const savedEntity = await pipelineRepository.save(entity);

    const savedPipeline: Pipeline = {
      id: savedEntity.id,
      name: savedEntity.name,
      description: savedEntity.description || '',
      nodes: JSON.parse(savedEntity.nodes || '[]'),
      edges: JSON.parse(savedEntity.edges || '[]'),
      triggers: JSON.parse(savedEntity.triggers || '[]'),
      schedule: savedEntity.schedule ? JSON.parse(savedEntity.schedule) : undefined,
      status: savedEntity.status,
      createdAt: savedEntity.createdAt,
      updatedAt: savedEntity.updatedAt,
      createdBy: savedEntity.createdBy,
      tags: JSON.parse(savedEntity.tags || '[]'),
      version: savedEntity.version
    };

    return NextResponse.json(savedPipeline);
  } catch (error) {
    console.error('Failed to save pipeline:', error);
    console.error('Error details:', error instanceof Error ? error.stack : error);
    
    // Check if it's a database table error
    if (error instanceof Error && error.message.includes('relation "pipeline" does not exist')) {
      console.error('Pipeline table does not exist. Migrations may not have run properly.');
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to save pipeline',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}