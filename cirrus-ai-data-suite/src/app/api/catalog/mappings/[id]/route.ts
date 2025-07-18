import { NextRequest, NextResponse } from 'next/server';
import { CatalogMappingService } from '@/services/catalogMappingService';

// DELETE /api/catalog/mappings/[id] - Delete a field mapping
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Mapping ID is required' },
        { status: 400 }
      );
    }

    const deleted = await CatalogMappingService.deleteFieldMapping(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Mapping not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Mapping deleted successfully',
      id
    });
  } catch (error) {
    console.error('Error deleting field mapping:', error);
    return NextResponse.json(
      { error: 'Failed to delete mapping' },
      { status: 500 }
    );
  }
}