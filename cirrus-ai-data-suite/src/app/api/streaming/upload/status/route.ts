import { NextRequest, NextResponse } from 'next/server';
import { StreamingUploadService } from '@/services/streaming/streamingUploadService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Upload ID required' },
        { status: 400 }
      );
    }

    const uploadService = StreamingUploadService.getInstance();
    const progress = await uploadService.getUploadProgress(uploadId);

    if (!progress) {
      return NextResponse.json(
        { error: 'Upload session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error getting upload status:', error);
    return NextResponse.json(
      { error: 'Failed to get upload status' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uploadId, action } = body;

    if (!uploadId || !action) {
      return NextResponse.json(
        { error: 'Upload ID and action required' },
        { status: 400 }
      );
    }

    const uploadService = StreamingUploadService.getInstance();

    if (action === 'pause') {
      const success = await uploadService.pauseUpload(uploadId);
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to pause upload' },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true, status: 'paused' });
    } else if (action === 'resume') {
      const session = await uploadService.resumeUpload(uploadId);
      if (!session) {
        return NextResponse.json(
          { error: 'Failed to resume upload' },
          { status: 400 }
        );
      }
      
      const missingChunks = await uploadService.getMissingChunks(uploadId);
      return NextResponse.json({
        success: true,
        status: 'active',
        missingChunks,
        session: {
          uploadId: session.uploadId,
          chunkSize: session.chunkSize,
          totalChunks: session.totalChunks
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "pause" or "resume"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating upload status:', error);
    return NextResponse.json(
      { error: 'Failed to update upload status' },
      { status: 500 }
    );
  }
}