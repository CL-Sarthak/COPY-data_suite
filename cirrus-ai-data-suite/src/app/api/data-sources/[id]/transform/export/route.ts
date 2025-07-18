import { NextRequest, NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';
import { DataTransformationService } from '@/services/dataTransformationService';

// POST /api/data-sources/[id]/transform/export - Export transformed data as JSON file
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('=== Data Transformation Export API: Export request ===', {
      sourceId: id,
      timestamp: new Date().toISOString()
    });

    const dataSource = await DataSourceService.getDataSourceById(id);
    
    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    console.log('Data source found for export:', {
      id: dataSource.id,
      name: dataSource.name,
      type: dataSource.type
    });

    // Transform to unified JSON format (get all records, no limit)
    const catalog = await DataTransformationService.transformDataSource(dataSource, { maxRecords: 0 });
    
    // Generate JSON export
    const jsonExport = DataTransformationService.exportCatalogAsJSON(catalog);
    
    console.log('=== Data Transformation Export API: Export complete ===', {
      catalogId: catalog.catalogId,
      recordCount: catalog.totalRecords,
      exportSize: jsonExport.length
    });
    
    // Return as downloadable file
    return new NextResponse(jsonExport, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${dataSource.name}-catalog-${Date.now()}.json"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('=== Data Transformation Export API: Export Error ===', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to export data source',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}