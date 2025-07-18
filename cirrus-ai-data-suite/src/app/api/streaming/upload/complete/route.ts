import { NextRequest, NextResponse } from 'next/server';
import { StreamingUploadService } from '@/services/streaming/streamingUploadService';
import { getDatabase } from '@/database/connection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uploadId } = body;

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Missing uploadId' },
        { status: 400 }
      );
    }

    const uploadService = StreamingUploadService.getInstance();
    // Get session from service (it will check database if not cached)
    let session = await uploadService.getSession(uploadId);
    
    // If session exists but status is not completed, force a fresh DB read
    if (session && session.status !== 'completed' && session.uploadedChunks.size === session.totalChunks) {
      console.log(`Session ${uploadId} has all chunks but status not completed, forcing DB refresh`);
      // Clear cache and reload from DB
      const db = await getDatabase();
      const sessionRepo = db.getRepository('UploadSessionEntity');
      const sessionEntity = await sessionRepo.findOne({ where: { uploadId } });
      
      if (sessionEntity) {
        session = {
          uploadId: sessionEntity.uploadId,
          fileName: sessionEntity.fileName,
          fileSize: Number(sessionEntity.fileSize),
          mimeType: sessionEntity.mimeType,
          chunkSize: sessionEntity.chunkSize,
          totalChunks: sessionEntity.totalChunks,
          uploadedChunks: new Set(sessionEntity.uploadedChunks || []),
          startTime: sessionEntity.startTime,
          lastActivity: sessionEntity.lastActivity,
          status: sessionEntity.status,
          storageKey: sessionEntity.storageKey,
          metadata: sessionEntity.metadata
        };
      }
    }

    if (!session) {
      console.error(`Upload session not found for uploadId: ${uploadId}`);
      return NextResponse.json(
        { error: 'Upload session not found' },
        { status: 404 }
      );
    }

    console.log('Upload complete check:', {
      uploadId,
      status: session.status,
      uploadedChunks: Array.from(session.uploadedChunks),
      uploadedChunksSize: session.uploadedChunks.size,
      totalChunks: session.totalChunks,
      isComplete: session.uploadedChunks.size === session.totalChunks,
      statusCheck: session.status === 'completed',
      storageKey: session.storageKey
    });

    if (session.status !== 'completed') {
      console.log(`Upload session ${uploadId} status:`, session.status);
      console.log(`Uploaded chunks: ${session.uploadedChunks.size}/${session.totalChunks}`);
      
      // If all chunks are uploaded but status isn't completed, there might be an issue
      if (session.uploadedChunks.size === session.totalChunks) {
        console.error('All chunks uploaded but status not completed - possible status update failure');
      }
      
      return NextResponse.json(
        { 
          error: 'Upload not completed',
          details: {
            status: session.status,
            uploadedChunks: session.uploadedChunks.size,
            totalChunks: session.totalChunks,
            allChunksUploaded: session.uploadedChunks.size === session.totalChunks
          }
        },
        { status: 400 }
      );
    }

    // Return the session details including storage key
    // The actual file is stored at uploads/{uploadId}/{fileName}
    const actualStorageKey = session.storageKey || `uploads/${uploadId}/${session.fileName}`;
    
    return NextResponse.json({
      uploadId: session.uploadId,
      fileName: session.fileName,
      fileSize: session.fileSize,
      mimeType: session.mimeType,
      storageKey: actualStorageKey,
      metadata: session.metadata
    });
  } catch (error) {
    console.error('Error completing upload:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to complete upload',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}