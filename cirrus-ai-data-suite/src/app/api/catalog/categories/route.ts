import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { CatalogCategoryEntity } from '@/entities/CatalogCategoryEntity';

// GET /api/catalog/categories - Get all catalog categories
export async function GET() {
  try {
    const db = await getDatabase();
    const repository = db.getRepository(CatalogCategoryEntity);
    
    const categories = await repository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', displayName: 'ASC' }
    });

    return NextResponse.json({
      categories,
      summary: {
        totalCategories: categories.length,
        standardCategories: categories.filter(c => c.isStandard).length,
        customCategories: categories.filter(c => !c.isStandard).length
      }
    });
  } catch (error) {
    console.error('Error getting catalog categories:', error);
    return NextResponse.json(
      { error: 'Failed to get catalog categories' },
      { status: 500 }
    );
  }
}

// POST /api/catalog/categories - Create a new custom catalog category
export async function POST(request: NextRequest) {
  try {
    const categoryData = await request.json();
    
    // Validate required fields
    if (!categoryData.name || !categoryData.displayName) {
      return NextResponse.json(
        { error: 'Missing required fields: name, displayName' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const repository = db.getRepository(CatalogCategoryEntity);

    // Check if category name already exists
    const existingCategory = await repository.findOne({
      where: { name: categoryData.name }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category name already exists' },
        { status: 400 }
      );
    }

    // Create new category
    const newCategory = new CatalogCategoryEntity();
    newCategory.name = categoryData.name;
    newCategory.displayName = categoryData.displayName;
    newCategory.description = categoryData.description || '';
    newCategory.color = categoryData.color || '#6b7280';
    newCategory.icon = categoryData.icon || 'TagIcon';
    newCategory.sortOrder = categoryData.sortOrder || 999;
    newCategory.isStandard = false; // Custom categories are never standard
    newCategory.isActive = true;

    const savedCategory = await repository.save(newCategory);

    return NextResponse.json(savedCategory, { status: 201 });
  } catch (error) {
    console.error('Error creating catalog category:', error);
    return NextResponse.json(
      { error: 'Failed to create catalog category' },
      { status: 500 }
    );
  }
}