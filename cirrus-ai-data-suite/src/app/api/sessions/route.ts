import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { AnnotationSession } from '@/entities/AnnotationSession';

export async function GET() {
  try {
    const db = await getDatabase();
    const sessionRepository = db.getRepository(AnnotationSession);
    
    const sessions = await sessionRepository.find({
      order: { updatedAt: 'DESC' }
    });
    
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, patterns, trainingFiles } = body;
    
    if (!name || !patterns) {
      return NextResponse.json(
        { error: 'Name and patterns are required' }, 
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const sessionRepository = db.getRepository(AnnotationSession);
    
    const session = sessionRepository.create({
      name,
      description,
      patterns,
      trainingFiles
    });
    
    const savedSession = await sessionRepository.save(session);
    
    return NextResponse.json(savedSession, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' }, 
      { status: 500 }
    );
  }
}