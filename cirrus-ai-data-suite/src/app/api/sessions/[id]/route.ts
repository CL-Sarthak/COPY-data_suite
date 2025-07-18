import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { AnnotationSession } from '@/entities/AnnotationSession';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = await getDatabase();
    const sessionRepository = db.getRepository(AnnotationSession);
    
    const session = await sessionRepository.findOne({
      where: { id }
    });
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' }, 
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { name, description, patterns, trainingFiles } = body;
    
    const db = await getDatabase();
    const sessionRepository = db.getRepository(AnnotationSession);
    
    const session = await sessionRepository.findOne({
      where: { id }
    });
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' }, 
        { status: 404 }
      );
    }
    
    // Update fields
    if (name) session.name = name;
    if (description !== undefined) session.description = description;
    if (patterns) session.patterns = patterns;
    if (trainingFiles !== undefined) session.trainingFiles = trainingFiles;
    
    const updatedSession = await sessionRepository.save(session);
    
    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = await getDatabase();
    const sessionRepository = db.getRepository(AnnotationSession);
    
    const result = await sessionRepository.delete(id);
    
    if (result.affected === 0) {
      return NextResponse.json(
        { error: 'Session not found' }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' }, 
      { status: 500 }
    );
  }
}