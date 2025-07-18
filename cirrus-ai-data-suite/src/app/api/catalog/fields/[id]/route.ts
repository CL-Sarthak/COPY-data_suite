import { NextRequest, NextResponse } from 'next/server';
import { CatalogMappingService } from '@/services/catalogMappingService';

// PUT /api/catalog/fields/[id] - Update a catalog field
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    // Don't allow updating standard fields' core properties
    const existingField = await CatalogMappingService.getCatalogFieldById(id);
    if (!existingField) {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      );
    }
    
    if (existingField.isStandard) {
      // For standard fields, allow updating dataType, description, tags, and validationRules
      // but protect core identity fields like name, displayName, category, isStandard
      const allowedUpdates = {
        dataType: body.dataType,
        description: body.description,
        tags: body.tags,
        validationRules: body.validationRules
      };
      
      const updated = await CatalogMappingService.updateCatalogField(id, allowedUpdates);
      return NextResponse.json(updated);
    } else {
      // For custom fields, allow all updates
      const updated = await CatalogMappingService.updateCatalogField(id, body);
      return NextResponse.json(updated);
    }
  } catch (error) {
    console.error('Error updating catalog field:', error);
    return NextResponse.json(
      { error: 'Failed to update catalog field' },
      { status: 500 }
    );
  }
}

// DELETE /api/catalog/fields/[id] - Delete a catalog field
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Check if field exists
    const existingField = await CatalogMappingService.getCatalogFieldById(id);
    if (!existingField) {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      );
    }
    
    // Check for existing field mappings before deletion
    const existingMappings = await CatalogMappingService.getFieldMappingsByCatalogField(id);
    if (existingMappings && existingMappings.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete field', 
          details: `This field is currently mapped by ${existingMappings.length} data source(s). Please remove those mappings first.`,
          mappingCount: existingMappings.length 
        },
        { status: 400 }
      );
    }
    
    await CatalogMappingService.deleteCatalogField(id);
    
    return NextResponse.json({ message: 'Field deleted successfully' });
  } catch (error) {
    console.error('Error deleting catalog field:', error);
    return NextResponse.json(
      { error: 'Failed to delete catalog field' },
      { status: 500 }
    );
  }
}