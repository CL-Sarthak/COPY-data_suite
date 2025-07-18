import { CatalogField, FieldFormData } from '@/types/catalog';
import { CatalogMappingService } from './catalogMappingService';

export class CatalogFieldService {
  /**
   * Fetch all catalog fields (client-side)
   */
  static async fetchFields(): Promise<CatalogField[]> {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      // Server-side: directly call the service
      return await CatalogMappingService.getAllCatalogFields();
    }
    
    // Client-side: use fetch
    const response = await fetch('/api/catalog/fields');
    if (!response.ok) {
      throw new Error('Failed to fetch catalog fields');
    }
    const data = await response.json();
    // Handle both response formats - object with fields property or direct array
    return data.fields || data;
  }

  /**
   * Create a new catalog field
   */
  static async createField(formData: FieldFormData): Promise<CatalogField> {
    const response = await fetch('/api/catalog/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create field');
    }

    return response.json();
  }

  /**
   * Update an existing catalog field
   */
  static async updateField(id: string, formData: FieldFormData): Promise<CatalogField> {
    const response = await fetch(`/api/catalog/fields/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update field');
    }

    return response.json();
  }

  /**
   * Delete a catalog field
   */
  static async deleteField(id: string): Promise<void> {
    const response = await fetch(`/api/catalog/fields/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete field');
    }
  }

  /**
   * Validate field form data
   */
  static validateFieldData(formData: FieldFormData): string[] {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push('Field name is required');
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.name)) {
      errors.push('Field name must start with lowercase letter and contain only lowercase letters, numbers, and underscores');
    }

    if (!formData.displayName.trim()) {
      errors.push('Display name is required');
    }

    if (!formData.dataType) {
      errors.push('Data type is required');
    }

    if (!formData.category) {
      errors.push('Category is required');
    }

    // Validate enum values if data type is enum
    if (formData.dataType === 'enum' && (!formData.validationRules.enumValues || formData.validationRules.enumValues.length === 0)) {
      errors.push('Enum values are required for enum data type');
    }

    return errors;
  }

  /**
   * Filter fields by category and search term
   */
  static filterFields(fields: CatalogField[], category: string, searchTerm: string): CatalogField[] {
    let filtered = fields;

    // Filter by category
    if (category && category !== 'all') {
      if (category === 'standard') {
        filtered = filtered.filter(field => field.isStandard);
      } else if (category === 'custom') {
        filtered = filtered.filter(field => !field.isStandard);
      } else {
        filtered = filtered.filter(field => field.category === category);
      }
    }

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(field =>
        field.name.toLowerCase().includes(lowerSearch) ||
        field.displayName.toLowerCase().includes(lowerSearch) ||
        field.description.toLowerCase().includes(lowerSearch) ||
        field.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
      );
    }

    return filtered;
  }
}