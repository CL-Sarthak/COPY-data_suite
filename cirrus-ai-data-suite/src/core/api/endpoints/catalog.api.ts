import { apiClient } from '../client';
import { ApiResponse } from '@/core/types/api.types';

export interface CatalogField {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  dataType: string;
  category?: string;
  isRequired: boolean;
  isStandard: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CatalogCategory {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  icon?: string;
  color?: string;
  fieldCount?: number;
}

export interface FieldMapping {
  id: string;
  sourceId: string;
  sourceFieldName: string;
  catalogFieldId: string;
  confidence: number;
  isManual: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MappingSuggestion {
  sourceFieldName: string;
  suggestedMappings: Array<{
    field: CatalogField;
    confidence: number;
    reason: string;
  }>;
}

export interface CreateFieldRequest {
  name: string;
  displayName: string;
  description?: string;
  dataType: string;
  category?: string;
  isRequired?: boolean;
  isStandard?: boolean;
  tags?: string[];
}

export interface CreateCategoryRequest {
  name: string;
  displayName?: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface CreateMappingRequest {
  sourceId: string;
  sourceFieldName: string;
  catalogFieldId: string;
  confidence?: number;
  isManual?: boolean;
}

export class CatalogAPI {
  // Initialize catalog
  async initializeCatalog(): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>('/catalog/initialize');
  }

  // Categories
  async getCategories(): Promise<CatalogCategory[]> {
    return apiClient.get<CatalogCategory[]>('/catalog/categories');
  }

  async getCategory(id: string): Promise<CatalogCategory> {
    return apiClient.get<CatalogCategory>(`/catalog/categories/${id}`);
  }

  async createCategory(data: CreateCategoryRequest): Promise<CatalogCategory> {
    return apiClient.post<CatalogCategory>('/catalog/categories', data);
  }

  async updateCategory(id: string, data: Partial<CreateCategoryRequest>): Promise<CatalogCategory> {
    return apiClient.put<CatalogCategory>(`/catalog/categories/${id}`, data);
  }

  async deleteCategory(id: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/catalog/categories/${id}`);
  }

  // Fields
  async getFields(category?: string): Promise<CatalogField[]> {
    return apiClient.get<CatalogField[]>('/catalog/fields', {
      params: category ? { category } : {}
    });
  }

  async getField(id: string): Promise<CatalogField> {
    return apiClient.get<CatalogField>(`/catalog/fields/${id}`);
  }

  async createField(data: CreateFieldRequest): Promise<CatalogField> {
    return apiClient.post<CatalogField>('/catalog/fields', data);
  }

  async updateField(id: string, data: Partial<CreateFieldRequest>): Promise<CatalogField> {
    return apiClient.put<CatalogField>(`/catalog/fields/${id}`, data);
  }

  async deleteField(id: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/catalog/fields/${id}`);
  }

  // Mappings
  async getMappings(sourceId?: string): Promise<FieldMapping[]> {
    return apiClient.get<FieldMapping[]>('/catalog/mappings', {
      params: sourceId ? { sourceId } : {}
    });
  }

  async getMapping(id: string): Promise<FieldMapping> {
    return apiClient.get<FieldMapping>(`/catalog/mappings/${id}`);
  }

  async createMapping(data: CreateMappingRequest): Promise<FieldMapping> {
    return apiClient.post<FieldMapping>('/catalog/mappings', data);
  }

  async updateMapping(id: string, data: Partial<CreateMappingRequest>): Promise<FieldMapping> {
    return apiClient.put<FieldMapping>(`/catalog/mappings/${id}`, data);
  }

  async deleteMapping(id: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`/catalog/mappings/${id}`);
  }

  // Suggestions
  async getMappingSuggestions(sourceId: string): Promise<{
    suggestions: MappingSuggestion[];
    sourceFields: string[];
    strategy: string;
  }> {
    return apiClient.get('/catalog/suggestions', {
      params: { sourceId }
    });
  }

  // Batch operations
  async batchCreateMappings(mappings: CreateMappingRequest[]): Promise<{
    created: number;
    failed: number;
    results: Array<{ success: boolean; data?: FieldMapping; error?: string }>;
  }> {
    return apiClient.post('/catalog/mappings/batch', { mappings });
  }

  async batchDeleteMappings(ids: string[]): Promise<{
    deleted: number;
    failed: number;
  }> {
    return apiClient.post('/catalog/mappings/batch-delete', { ids });
  }

  // Import/Export
  async exportCatalog(format: 'json' | 'csv' = 'json'): Promise<void> {
    const filename = `catalog-export-${Date.now()}.${format}`;
    return apiClient.download(`/catalog/export?format=${format}`, filename);
  }

  async importCatalog(file: File): Promise<{
    imported: {
      fields: number;
      categories: number;
      mappings: number;
    };
    failed: number;
    errors: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload('/catalog/import', formData);
  }
}

export const catalogAPI = new CatalogAPI();