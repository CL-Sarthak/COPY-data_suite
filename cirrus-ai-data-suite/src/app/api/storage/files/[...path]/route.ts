/**
 * Storage File Serving Endpoint
 * Serves files from configured storage provider (local, S3, Vercel Blob, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/services/storage/storageService';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const key = path.join('/');
    
    console.log('Storage API request:', {
      pathSegments: path,
      joinedKey: key,
      url: request.url,
      decodedSegments: path.map(segment => decodeURIComponent(segment))
    });

    // Get storage instance
    const storage = StorageService.getInstance();
    
    console.log('Storage provider:', storage.getProviderName());

    // Get the file
    const fileBuffer = await storage.getFile(key);
    
    // Determine content type
    const contentType = StorageService.getContentType(key);

    // Return the file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}