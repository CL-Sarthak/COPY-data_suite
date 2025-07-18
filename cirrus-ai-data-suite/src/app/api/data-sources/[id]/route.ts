import { NextRequest, NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';
import { DataSourceEntity } from '@/entities/DataSourceEntity';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('dataType'); // 'original', 'transformed', 'both'
    const includeData = searchParams.get('includeData') === 'true';
    const includeFileContent = searchParams.get('includeFileContent') === 'true';
    
    const dataSource = await DataSourceService.getDataSourceById(id, includeFileContent);
    if (!dataSource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    // Handle data type requests
    if (dataType && includeData) {
      const response: Record<string, unknown> = { ...dataSource };
      
      // Parse configuration to get original data
      let originalData: unknown[] = [];
      try {
        const config = typeof dataSource.configuration === 'string' 
          ? JSON.parse(dataSource.configuration) 
          : dataSource.configuration;
        originalData = config?.transformedData || [];
      } catch {
        originalData = [];
      }

      // Parse transformed data from the entity
      let transformedData: unknown[] = [];
      try {
        const dataSourceEntity = dataSource as DataSourceEntity;
        if (dataSourceEntity.transformedData) {
          transformedData = typeof dataSourceEntity.transformedData === 'string' 
            ? JSON.parse(dataSourceEntity.transformedData) 
            : (dataSourceEntity.transformedData || []);
        }
      } catch {
        transformedData = [];
      }
      
      switch (dataType) {
        case 'original':
          response.data = originalData;
          break;
        case 'transformed':
          response.data = transformedData;
          break;
        case 'both':
          response.originalData = originalData;
          response.transformedData = transformedData;
          response.data = transformedData.length > 0 ? transformedData : originalData;
          break;
        default:
          // Return metadata only
          break;
      }
      
      return NextResponse.json(response);
    }
    
    return NextResponse.json(dataSource);
  } catch (error) {
    console.error('Error fetching data source:', error);
    return NextResponse.json({ error: 'Failed to fetch data source' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const dataSource = await DataSourceService.updateDataSource(id, body);
    if (!dataSource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }
    return NextResponse.json(dataSource);
  } catch (error) {
    console.error('Error updating data source:', error);
    return NextResponse.json({ error: 'Failed to update data source' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await DataSourceService.deleteDataSource(id);
    if (!success) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting data source:', error);
    return NextResponse.json({ error: 'Failed to delete data source' }, { status: 500 });
  }
}