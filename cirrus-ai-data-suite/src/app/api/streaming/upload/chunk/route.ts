import { NextRequest, NextResponse } from 'next/server';
import { StreamingUploadService } from '@/services/streaming/streamingUploadService';
import { getDatabase } from '@/database/connection';

export async function POST(request: NextRequest) {
  try {
    // Check content length to provide better error message (only in production)
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
    
    if (isProduction || isVercel) {
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 4 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Chunk size exceeds 4MB limit for production environment.' },
          { status: 413 }
        );
      }
    }
    
    const formData = await request.formData();
    
    const uploadId = formData.get('uploadId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const checksum = formData.get('checksum') as string;
    const chunkFile = formData.get('chunk') as File;
    
    console.log('Chunk upload request:', { 
      uploadId, 
      chunkIndex, 
      checksum, 
      hasChunkFile: !!chunkFile,
      chunkFileSize: chunkFile?.size,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        DATABASE_URL_EXISTS: !!process.env.DATABASE_URL
      }
    });

    if (!uploadId || isNaN(chunkIndex) || !checksum || !chunkFile) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await chunkFile.arrayBuffer();
    const chunkData = Buffer.from(arrayBuffer);

    const uploadService = StreamingUploadService.getInstance();
    console.log('Calling uploadChunk with uploadId:', uploadId, 'chunkDataSize:', chunkData.length);
    
    // First check if session exists
    const session = await uploadService.getSession(uploadId);
    if (!session) {
      console.error(`Session not found for uploadId: ${uploadId} - this might be a serverless persistence issue`);
      // List all sessions for debugging
      try {
        const db = await getDatabase();
        const sessionRepo = db.getRepository('UploadSessionEntity');
        const allSessions = await sessionRepo.find({ take: 5 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.log('Recent upload sessions in database:', allSessions.map((s: any) => ({ 
          uploadId: s.uploadId, 
          fileName: s.fileName,
          status: s.status,
          createdAt: s.startTime
        })));
      } catch (dbError) {
        console.error('Failed to query database for sessions:', dbError);
      }
    }
    
    const result = await uploadService.uploadChunk(
      uploadId,
      chunkIndex,
      chunkData,
      checksum
    );
    
    console.log('Upload chunk result:', result);
    
    if (result.success) {
      console.log(`Chunk ${chunkIndex} uploaded successfully for session ${uploadId}`);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    // Get current progress
    const progress = await uploadService.getUploadProgress(uploadId);

    return NextResponse.json({
      success: true,
      message: result.message,
      progress
    });
  } catch (error) {
    console.error('Error uploading chunk:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      // Check for body size limit errors
      if (error.message.includes('Body exceeded') || error.message.includes('Request entity too large')) {
        const isProduction = process.env.NODE_ENV === 'production';
        const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
        
        return NextResponse.json(
          { 
            error: isProduction || isVercel 
              ? 'Upload chunk too large. Maximum size is 4MB per chunk in production.' 
              : 'Upload chunk too large. Try reducing chunk size.',
            environment: isProduction ? 'production' : 'development',
            isVercel: !!isVercel
          },
          { status: 413 }
        );
      }
      
      // Check for JSON parsing errors
      if (error.message.includes('JSON') || error.message.includes('Unexpected token')) {
        return NextResponse.json(
          { error: 'Invalid request format' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload chunk' },
      { status: 500 }
    );
  }
}

// Configure route segment to handle larger payloads
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large chunks

// Route segment config for Next.js 13+
export const dynamic = 'force-dynamic';

// Disable body parsing to handle large uploads manually
// This allows us to handle larger payloads than the default 1MB limit
export const revalidate = 0;