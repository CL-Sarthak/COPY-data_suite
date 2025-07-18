import { NextRequest, NextResponse } from 'next/server';
import { StreamingUploadService } from '@/services/streaming/streamingUploadService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileSize, mimeType, metadata } = body;

    if (!fileName || !fileSize || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileSize, mimeType' },
        { status: 400 }
      );
    }

    const uploadService = StreamingUploadService.getInstance();
    const session = await uploadService.initializeUpload(
      fileName,
      fileSize,
      mimeType,
      metadata
    );

    console.log('Initialized upload session:', {
      uploadId: session.uploadId,
      fileName: session.fileName,
      totalChunks: session.totalChunks,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
        DATABASE_TYPE: process.env.DATABASE_URL ? 'external' : 'in-memory'
      }
    });
    
    // Verify session was saved
    const verifySession = await uploadService.getSession(session.uploadId);
    console.log('Session verification:', {
      found: !!verifySession,
      uploadId: session.uploadId
    });

    return NextResponse.json({
      uploadId: session.uploadId,
      chunkSize: session.chunkSize,
      totalChunks: session.totalChunks,
      status: session.status
    });
  } catch (error) {
    console.error('Error initializing upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize upload' },
      { status: 500 }
    );
  }
}