import { NextRequest, NextResponse } from 'next/server';
import { CatalogMappingService } from '@/services/catalogMappingService';
import { GlobalCatalogService } from '@/services/globalCatalogService';

// GET /api/catalog/fields - Get all catalog fields
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let fields;
    if (category) {
      fields = await CatalogMappingService.getCatalogFieldsByCategory(category);
    } else {
      fields = await CatalogMappingService.getAllCatalogFields();
    }

    const categories = GlobalCatalogService.getStandardCategories();

    return NextResponse.json({
      fields,
      categories,
      summary: {
        totalFields: fields.length,
        standardFields: fields.filter((f: { isStandard: boolean }) => f.isStandard).length,
        customFields: fields.filter((f: { isStandard: boolean }) => !f.isStandard).length,
        categoryCounts: categories.map(cat => ({
          category: cat.name,
          count: fields.filter((f: { category: string }) => f.category === cat.name).length
        }))
      }
    });
  } catch (error) {
    console.error('Error getting catalog fields:', error);
    return NextResponse.json(
      { error: 'Failed to get catalog fields' },
      { status: 500 }
    );
  }
}

// POST /api/catalog/fields - Create a new custom catalog field
export async function POST(request: NextRequest) {
  try {
    const fieldData = await request.json();
    
    // Validate required fields
    if (!fieldData.name || !fieldData.displayName || !fieldData.dataType || !fieldData.category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, displayName, dataType, category' },
        { status: 400 }
      );
    }

    const newField = await CatalogMappingService.createCatalogField({
      name: fieldData.name,
      displayName: fieldData.displayName,
      description: fieldData.description || '',
      dataType: fieldData.dataType,
      category: fieldData.category,
      isRequired: fieldData.isRequired || false,
      validationRules: fieldData.validationRules,
      tags: fieldData.tags || []
    });

    return NextResponse.json(newField, { status: 201 });
  } catch (error) {
    console.error('Error creating catalog field:', error);
    return NextResponse.json(
      { error: 'Failed to create catalog field' },
      { status: 500 }
    );
  }
}