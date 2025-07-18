import { NextRequest, NextResponse } from 'next/server';
import { CatalogMappingService } from '@/services/catalogMappingService';

// GET /api/catalog/mappings?sourceId=xxx - Get field mappings for a data source
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get('sourceId');

    if (!sourceId) {
      return NextResponse.json(
        { error: 'sourceId parameter is required' },
        { status: 400 }
      );
    }

    const mappings = await CatalogMappingService.getFieldMappings(sourceId);

    return NextResponse.json({
      sourceId,
      mappings,
      summary: {
        totalMappings: mappings.length,
        manualMappings: mappings.filter(m => m.isManual).length,
        autoMappings: mappings.filter(m => !m.isManual).length,
        averageConfidence: mappings.length > 0 
          ? mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length 
          : 0
      }
    });
  } catch (error) {
    console.error('Error getting field mappings:', error);
    return NextResponse.json(
      { error: 'Failed to get field mappings' },
      { status: 500 }
    );
  }
}

// POST /api/catalog/mappings - Create or update a field mapping
export async function POST(request: NextRequest) {
  try {
    const mappingData = await request.json();
    
    // Validate required fields
    if (!mappingData.sourceId || !mappingData.sourceFieldName) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceId, sourceFieldName' },
        { status: 400 }
      );
    }

    // If catalogFieldId is null, we're removing the mapping
    if (mappingData.catalogFieldId === null) {
      // Find and delete the mapping
      const mappings = await CatalogMappingService.getFieldMappings(mappingData.sourceId);
      const existingMapping = mappings.find(m => m.sourceFieldName === mappingData.sourceFieldName);
      
      if (existingMapping) {
        const deleted = await CatalogMappingService.deleteFieldMapping(existingMapping.id);
        if (deleted) {
          return NextResponse.json({ message: 'Mapping removed successfully' }, { status: 200 });
        }
      }
      
      return NextResponse.json({ message: 'No mapping found to remove' }, { status: 200 });
    }

    // Validate catalogFieldId is present for creating/updating
    if (!mappingData.catalogFieldId) {
      return NextResponse.json(
        { error: 'catalogFieldId is required for creating or updating a mapping' },
        { status: 400 }
      );
    }

    const mapping = await CatalogMappingService.createFieldMapping({
      sourceId: mappingData.sourceId,
      sourceFieldName: mappingData.sourceFieldName,
      catalogFieldId: mappingData.catalogFieldId,
      transformationRule: mappingData.transformationRule,
      confidence: mappingData.confidence || 1.0,
      isManual: mappingData.isManual !== undefined ? mappingData.isManual : true
    });

    return NextResponse.json(mapping, { status: 201 });
  } catch (error) {
    console.error('Error creating field mapping:', error);
    return NextResponse.json(
      { error: 'Failed to create field mapping' },
      { status: 500 }
    );
  }
}