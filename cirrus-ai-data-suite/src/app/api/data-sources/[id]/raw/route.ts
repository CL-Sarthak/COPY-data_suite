import { NextRequest, NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';

// GET /api/data-sources/[id]/raw - Get raw file content without transformation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    
    // Get the data source with full file content from external storage
    const dataSource = await DataSourceService.getDataSourceById(id, true);
    
    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    const config = dataSource.configuration as { files?: Array<{ name: string; content?: string; type?: string }> };
    
    if (!config.files || config.files.length === 0) {
      return NextResponse.json(
        { error: 'No files in data source' },
        { status: 404 }
      );
    }

    // If fileName is specified, return just that file
    if (fileName) {
      const file = config.files.find(f => f.name === fileName);
      if (!file) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }

      // For JSON files, parse and return the content directly
      if (file.type === 'application/json' && file.content) {
        try {
          const jsonContent = JSON.parse(file.content);
          return NextResponse.json({
            fileName: file.name,
            type: file.type,
            data: jsonContent,
            recordCount: Array.isArray(jsonContent) ? jsonContent.length : 1
          });
        } catch {
          return NextResponse.json(
            { error: 'Invalid JSON content' },
            { status: 400 }
          );
        }
      }

      return NextResponse.json({
        fileName: file.name,
        type: file.type,
        content: file.content
      });
    }

    // Return all files with their raw content
    const filesData = config.files.map(file => {
      if (file.type === 'application/json' && file.content) {
        try {
          const jsonContent = JSON.parse(file.content);
          return {
            fileName: file.name,
            type: file.type,
            data: jsonContent,
            recordCount: Array.isArray(jsonContent) ? jsonContent.length : 1
          };
        } catch {
          return {
            fileName: file.name,
            type: file.type,
            content: file.content,
            error: 'Invalid JSON'
          };
        }
      }
      
      return {
        fileName: file.name,
        type: file.type,
        content: file.content
      };
    });

    return NextResponse.json({
      dataSourceId: id,
      dataSourceName: dataSource.name,
      files: filesData
    });
  } catch (error) {
    console.error('Error getting raw data:', error);
    return NextResponse.json(
      { error: 'Failed to get raw data' },
      { status: 500 }
    );
  }
}