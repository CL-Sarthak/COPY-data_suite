import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { ProcessedFile } from '@/entities/ProcessedFile';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      fileName, 
      originalContent, 
      redactedContent, 
      redactionCount, 
      fileType, 
      fileSize, 
      sessionId 
    } = body;
    
    if (!fileName || !originalContent || !redactedContent || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const fileRepository = db.getRepository(ProcessedFile);
    
    const processedFile = fileRepository.create({
      fileName,
      originalContent,
      redactedContent,
      redactionCount: redactionCount || 0,
      fileType,
      fileSize,
      sessionId
    });
    
    const savedFile = await fileRepository.save(processedFile);
    
    return NextResponse.json(savedFile, { status: 201 });
  } catch (error) {
    console.error('Error saving processed file:', error);
    return NextResponse.json(
      { error: 'Failed to save processed file' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    
    const db = await getDatabase();
    const fileRepository = db.getRepository(ProcessedFile);
    
    const whereClause = sessionId ? { sessionId } : {};
    
    const files = await fileRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' }
    });
    
    return NextResponse.json(files);
  } catch (error) {
    console.error('Error fetching processed files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch processed files' }, 
      { status: 500 }
    );
  }
}