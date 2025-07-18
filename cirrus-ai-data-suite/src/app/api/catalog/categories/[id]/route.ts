import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { CatalogCategoryEntity } from '@/entities/CatalogCategoryEntity';

// GET /api/catalog/categories/[id] - Get a specific catalog category
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = await getDatabase();
    const repository = db.getRepository(CatalogCategoryEntity);
    
    const category = await repository.findOne({
      where: { id },
      relations: ['fields']
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error getting catalog category:', error);
    return NextResponse.json(
      { error: 'Failed to get catalog category' },
      { status: 500 }
    );
  }
}

// PUT /api/catalog/categories/[id] - Update a catalog category
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const updates = await request.json();
    
    const db = await getDatabase();
    const repository = db.getRepository(CatalogCategoryEntity);
    
    const category = await repository.findOne({ where: { id } });
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Don't allow updating core properties of standard categories
    if (category.isStandard) {
      // For standard categories, only allow updating description and color
      const allowedUpdates = {
        description: updates.description,
        color: updates.color,
        sortOrder: updates.sortOrder
      };
      
      Object.assign(category, allowedUpdates);
    } else {
      // For custom categories, allow all updates except isStandard
      const updatesWithoutStandard = { ...updates };
      delete updatesWithoutStandard.isStandard;
      Object.assign(category, updatesWithoutStandard);
    }

    const updatedCategory = await repository.save(category);
    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Error updating catalog category:', error);
    return NextResponse.json(
      { error: 'Failed to update catalog category' },
      { status: 500 }
    );
  }
}

// DELETE /api/catalog/categories/[id] - Delete a catalog category
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    const db = await getDatabase();
    const repository = db.getRepository(CatalogCategoryEntity);
    
    const category = await repository.findOne({
      where: { id },
      relations: ['fields']
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    if (category.isStandard) {
      return NextResponse.json(
        { error: 'Cannot delete standard categories' },
        { status: 400 }
      );
    }

    if (category.name === 'uncategorized') {
      return NextResponse.json(
        { error: 'Cannot delete the uncategorized category' },
        { status: 400 }
      );
    }

    // If category has fields, move them to 'uncategorized' category
    if (category.fields && category.fields.length > 0) {
      // Find the uncategorized category
      const uncategorizedCategory = await repository.findOne({
        where: { name: 'uncategorized' }
      });
      
      if (!uncategorizedCategory) {
        return NextResponse.json(
          { error: 'Uncategorized category not found. Cannot move fields.' },
          { status: 500 }
        );
      }

      // Move all fields from this category to uncategorized
      const { CatalogFieldEntity } = await import('@/entities/CatalogFieldEntity');
      const fieldRepository = db.getRepository(CatalogFieldEntity);
      
      await fieldRepository
        .createQueryBuilder()
        .update(CatalogFieldEntity)
        .set({ category: 'uncategorized' })
        .where('category = :categoryName', { categoryName: category.name })
        .execute();
    }

    await repository.remove(category);
    
    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting catalog category:', error);
    return NextResponse.json(
      { error: 'Failed to delete catalog category' },
      { status: 500 }
    );
  }
}