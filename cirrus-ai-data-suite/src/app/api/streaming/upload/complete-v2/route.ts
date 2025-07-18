import { NextRequest, NextResponse } from 'next/server';
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

    // Direct database query - no caching, no service layer
    const db = await getDatabase();
    const isPostgres = db.options.type === 'postgres';
    
    // Try up to 3 times with a delay to handle race conditions
    let attempts = 0;
    const maxAttempts = 3;
    const delayMs = 500;
    
    while (attempts < maxAttempts) {
      const result = await db.query(
        isPostgres
          ? `SELECT * FROM upload_sessions WHERE uploadid = $1`
          : `SELECT * FROM upload_sessions WHERE upload_id = ?`,
        [uploadId]
      );
      
      if (result && result.length > 0) {
        const session = result[0];
        
        console.log(`Complete V2 attempt ${attempts + 1}:`, {
          uploadId,
          status: session.status,
          hasStorageKey: !!session.storagekey || !!session.storage_key
        });
        
        // Check if completed
        if (session.status === 'completed') {
          return NextResponse.json({
            uploadId: session.uploadid || session.upload_id,
            fileName: session.filename || session.file_name,
            fileSize: Number(session.filesize || session.file_size),
            mimeType: session.mimetype || session.mime_type,
            storageKey: session.storagekey || session.storage_key || `uploads/${uploadId}/${session.filename || session.file_name}`,
            metadata: session.metadata ? JSON.parse(session.metadata) : {}
          });
        }
        
        // Check if all chunks are uploaded but status not updated yet
        const uploadedChunks = JSON.parse(session.uploadedchunks || session.uploaded_chunks || '[]');
        const totalChunks = session.totalchunks || session.total_chunks;
        
        if (uploadedChunks.length === totalChunks && attempts < maxAttempts - 1) {
          // All chunks uploaded but status not updated - wait and retry
          console.log(`All chunks uploaded (${uploadedChunks.length}/${totalChunks}) but status is ${session.status}, waiting...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          attempts++;
          continue;
        }
        
        // Not completed
        return NextResponse.json(
          { 
            error: 'Upload not completed',
            details: {
              status: session.status,
              uploadedChunks: uploadedChunks.length,
              totalChunks: totalChunks,
              attempts: attempts + 1
            }
          },
          { status: 400 }
        );
      }
      
      // Session not found
      if (attempts < maxAttempts - 1) {
        console.log(`Session ${uploadId} not found, waiting...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempts++;
        continue;
      }
      
      return NextResponse.json(
        { error: 'Upload session not found' },
        { status: 404 }
      );
    }
    
    // Should not reach here
    return NextResponse.json(
      { error: 'Maximum attempts reached' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error in complete-v2:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to complete upload',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}