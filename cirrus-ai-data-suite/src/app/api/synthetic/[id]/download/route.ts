import { NextRequest, NextResponse } from 'next/server';
import { SyntheticDataService } from '@/services/syntheticDataService';
import { readFile } from 'fs/promises';

// GET /api/synthetic/[id]/download - Download generated synthetic data file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataset = await SyntheticDataService.getDataset(id);
    
    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    if (dataset.status !== 'completed' || !dataset.filePath) {
      return NextResponse.json(
        { error: 'Dataset not ready for download' },
        { status: 400 }
      );
    }

    let fileContent: string;
    
    // Check if this is a virtual path (production environment)
    if (dataset.filePath.startsWith('synthetic://')) {
      // In production, content is stored in the database
      if (!dataset.generatedContent) {
        return NextResponse.json(
          { error: 'Generated content not found in database' },
          { status: 500 }
        );
      }
      fileContent = dataset.generatedContent;
    } else {
      // In development, read from filesystem
      try {
        fileContent = await readFile(dataset.filePath, 'utf8');
      } catch (fileError) {
        console.error('Error reading generated file:', fileError);
        return NextResponse.json(
          { error: 'Generated file not found or corrupted' },
          { status: 500 }
        );
      }
    }
    
    // Determine content type based on output format
    let contentType = 'application/octet-stream';
    let extension = 'txt';
    
    switch (dataset.outputFormat) {
      case 'json':
        contentType = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        contentType = 'text/csv';
        extension = 'csv';
        break;
      case 'sql':
        contentType = 'text/sql';
        extension = 'sql';
        break;
    }

    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${dataset.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${extension}`;

    // Return file as download
    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(fileContent, 'utf8').toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading synthetic data:', error);
    return NextResponse.json(
      { error: 'Failed to download synthetic data' },
      { status: 500 }
    );
  }
}