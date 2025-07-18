import { NextRequest, NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';
import { DataTransformationService } from '@/services/dataTransformationService';

// POST /api/data-sources/[id]/transform/save - Save transformed data as a new data source
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name: newSourceName, includeMetadata = true } = body;

    console.log('=== Data Transformation Save API: Save request ===', {
      originalSourceId: id,
      newSourceName,
      timestamp: new Date().toISOString()
    });

    // Get the original data source
    const originalSource = await DataSourceService.getDataSourceById(id);
    
    if (!originalSource) {
      return NextResponse.json(
        { error: 'Original data source not found' },
        { status: 404 }
      );
    }

    console.log('Original data source found:', {
      id: originalSource.id,
      name: originalSource.name,
      type: originalSource.type
    });

    // Transform the original data to unified JSON format (get all records, no limit)
    const catalog = await DataTransformationService.transformDataSource(originalSource, { maxRecords: 0 });
    
    // Create configuration for the new JSON data source
    const jsonConfiguration = {
      files: [{
        name: `${newSourceName}.json`,
        size: JSON.stringify(catalog.records).length,
        type: 'application/json',
        content: JSON.stringify(catalog.records, null, 2),
        lastModified: Date.now(),
        transformedFrom: {
          sourceId: originalSource.id,
          sourceName: originalSource.name,
          sourceType: originalSource.type,
          transformedAt: new Date().toISOString(),
          catalogId: catalog.catalogId
        }
      }],
      totalSize: JSON.stringify(catalog.records).length,
      recordCount: catalog.totalRecords
    };

    // Create metadata including the transformation info
    const newMetadata = {
      isTransformed: true,
      originalSource: {
        id: originalSource.id,
        name: originalSource.name,
        type: originalSource.type
      },
      transformation: {
        method: 'unified_json_catalog',
        transformedAt: new Date().toISOString(),
        schema: catalog.schema,
        summary: catalog.summary
      },
      ...(includeMetadata && { originalMetadata: originalSource.metadata })
    };

    // Create the new data source
    const newDataSource = await DataSourceService.createDataSource({
      name: newSourceName,
      type: 'json_transformed', // New type to distinguish transformed sources
      connectionStatus: 'connected',
      configuration: jsonConfiguration,
      metadata: newMetadata,
      recordCount: catalog.totalRecords,
      tags: ['transformed', 'json', originalSource.type]
    });

    console.log('=== Data Transformation Save API: New data source created ===', {
      newSourceId: newDataSource.id,
      name: newDataSource.name,
      recordCount: newDataSource.recordCount,
      originalSourceId: id
    });

    return NextResponse.json({
      success: true,
      newDataSource: {
        id: newDataSource.id,
        name: newDataSource.name,
        type: newDataSource.type,
        recordCount: newDataSource.recordCount,
        createdAt: new Date().toISOString()
      },
      transformation: {
        catalogId: catalog.catalogId,
        totalRecords: catalog.totalRecords,
        fieldCount: catalog.schema.fields.length,
        originalSourceId: id
      }
    });

  } catch (error) {
    console.error('=== Data Transformation Save API: Save Error ===', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to save transformed data source',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}