import { Category, CategoryFormData, CatalogField } from '@/types/catalog';

export class CatalogCategoryService {
  /**
   * Fetch all categories
   */
  static async fetchCategories(): Promise<Category[]> {
    const response = await fetch('/api/catalog/categories');
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    const data = await response.json();
    // Handle both response formats - object with categories property or direct array
    return data.categories || data;
  }

  /**
   * Initialize standard catalog categories
   */
  static async initializeStandardCatalog(): Promise<void> {
    const response = await fetch('/api/catalog/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to initialize catalog');
    }
  }

  /**
   * Create a new category
   */
  static async createCategory(formData: CategoryFormData): Promise<Category> {
    const response = await fetch('/api/catalog/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create category');
    }

    return response.json();
  }

  /**
   * Update an existing category
   */
  static async updateCategory(id: string, formData: CategoryFormData): Promise<Category> {
    const response = await fetch(`/api/catalog/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update category');
    }

    return response.json();
  }

  /**
   * Delete a category
   */
  static async deleteCategory(id: string): Promise<void> {
    const response = await fetch(`/api/catalog/categories/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete category');
    }
  }

  /**
   * Update category counts based on fields
   */
  static updateCategoryCounts(categories: Category[], fields: CatalogField[]): Category[] {
    const counts: Record<string, number> = {};
    
    // Count fields per category
    fields.forEach(field => {
      counts[field.category] = (counts[field.category] || 0) + 1;
    });

    // Update category counts
    return categories.map(cat => ({
      ...cat,
      count: counts[cat.name] || 0
    }));
  }

  /**
   * Get color classes for category display
   */
  static getColorClasses(hexColor: string, isStandard: boolean): string {
    const colorMap: Record<string, string> = {
      '#3b82f6': 'bg-blue-100 text-blue-800',    // identity
      '#10b981': 'bg-green-100 text-green-800',  // contact, financial
      '#8b5cf6': 'bg-purple-100 text-purple-800', // location
      '#f59e0b': 'bg-yellow-100 text-yellow-800', // temporal
      '#6366f1': 'bg-indigo-100 text-indigo-800', // business
      '#6b7280': 'bg-gray-100 text-gray-800',     // system
      '#f97316': 'bg-orange-100 text-orange-800', // custom
      '#94a3b8': 'bg-slate-100 text-slate-800',   // uncategorized
      '#ec4899': 'bg-pink-100 text-pink-800'      // fallback
    };
    
    return colorMap[hexColor] || (isStandard ? 'bg-gray-100 text-gray-800' : 'bg-slate-100 text-slate-800');
  }

  /**
   * Validate category form data
   */
  static validateCategoryData(formData: CategoryFormData): string[] {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push('Category name is required');
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.name)) {
      errors.push('Category name must start with lowercase letter and contain only lowercase letters, numbers, and underscores');
    }

    if (!formData.displayName.trim()) {
      errors.push('Display name is required');
    }

    if (!formData.color) {
      errors.push('Color is required');
    }

    if (formData.sortOrder === undefined || formData.sortOrder < 0) {
      errors.push('Sort order must be a positive number');
    }

    return errors;
  }
}