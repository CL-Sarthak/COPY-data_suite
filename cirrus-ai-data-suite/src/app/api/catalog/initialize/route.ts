import { NextResponse } from 'next/server';
import { CatalogMappingService } from '@/services/catalogMappingService';

// POST /api/catalog/initialize - Initialize the catalog with standard fields
export async function POST() {
  try {
    await CatalogMappingService.initializeStandardCatalog();
    
    const fields = await CatalogMappingService.getAllCatalogFields();
    
    return NextResponse.json({
      message: 'Catalog initialized successfully',
      fieldsCount: fields.length,
      standardFieldsCount: fields.filter(f => f.isStandard).length
    });
  } catch (error) {
    console.error('Error initializing catalog:', error);
    return NextResponse.json(
      { error: 'Failed to initialize catalog' },
      { status: 500 }
    );
  }
}