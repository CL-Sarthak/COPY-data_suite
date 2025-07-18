import { 
  CatalogField, 
  CatalogCategory, 
  FieldMapping, 
  MappingSuggestion,
  TransformationResult,
  ConfirmationData,
  NewFieldFormData
} from '@/types/fieldMapping';

export class FieldMappingService {
  /**
   * Load catalog fields and categories
   */
  static async loadCatalogData(): Promise<{ fields: CatalogField[], categories: CatalogCategory[] }> {
    const response = await fetch('/api/catalog/fields');
    if (!response.ok) {
      throw new Error('Failed to load catalog fields');
    }
    
    const data = await response.json();
    return {
      fields: data.fields || [],
      categories: data.categories || []
    };
  }

  /**
   * Load existing mappings for a data source
   */
  static async loadMappings(sourceId: string): Promise<FieldMapping[]> {
    const response = await fetch(`/api/catalog/mappings?sourceId=${sourceId}`);
    if (!response.ok) {
      throw new Error('Failed to load mappings');
    }
    
    const data = await response.json();
    return data.mappings || [];
  }

  /**
   * Load source fields from transformed data
   */
  static async loadSourceFields(sourceId: string): Promise<string[]> {
    try {
      // First, try to get the transformed data with just one record to get field names
      const response = await fetch(`/api/data-sources/${sourceId}/transform?pageSize=1`);
      if (!response.ok) {
        throw new Error('Failed to load source fields');
      }
      
      const catalog = await response.json();
      
      // Extract unique field names from the records
      const fieldNames = new Set<string>();
      
      if (catalog.records && catalog.records.length > 0) {
        // Get field names from the first record
        catalog.records.forEach((record: { data: Record<string, unknown> }) => {
          if (record.data && typeof record.data === 'object') {
            Object.keys(record.data).forEach(key => fieldNames.add(key));
          }
        });
      }
      
      return Array.from(fieldNames).sort();
    } catch (error) {
      console.error('Error loading source fields:', error);
      return [];
    }
  }

  /**
   * Generate mapping suggestions using AI
   */
  static async generateSuggestions(sourceId: string, sourceFields?: string[]): Promise<MappingSuggestion[]> {
    const requestBody: { sourceId: string; sourceFields?: string[] } = { sourceId };
    if (sourceFields && sourceFields.length > 0) {
      requestBody.sourceFields = sourceFields;
    }

    const response = await fetch('/api/catalog/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error('Failed to generate suggestions');
    }

    const data = await response.json();
    return data.suggestions || [];
  }

  /**
   * Apply all mapping suggestions automatically
   */
  static async applyAllSuggestions(
    sourceId: string, 
    suggestions: MappingSuggestion[],
    confidenceThreshold: number = 0.7
  ): Promise<void> {
    const mappingsToApply = suggestions
      .filter(s => s.suggestedMappings.length > 0 && s.suggestedMappings[0].confidence >= confidenceThreshold)
      .map(s => ({
        sourceFieldName: s.sourceFieldName,
        catalogFieldId: s.suggestedMappings[0].field.id,
        confidence: s.suggestedMappings[0].confidence
      }));

    if (mappingsToApply.length === 0) return;

    const response = await fetch('/api/catalog/mappings/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId,
        mappings: mappingsToApply
      })
    });

    if (!response.ok) {
      throw new Error('Failed to apply suggestions');
    }
  }

  /**
   * Create or update a single field mapping
   */
  static async updateMapping(
    sourceId: string,
    sourceFieldName: string,
    catalogFieldId: string | null,
    isManual: boolean = true
  ): Promise<void> {
    const response = await fetch('/api/catalog/mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId,
        sourceFieldName,
        catalogFieldId,
        isManual,
        confidence: isManual ? 1.0 : 0.0
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update mapping');
    }
  }

  /**
   * Create a new catalog field
   */
  static async createField(fieldData: NewFieldFormData): Promise<CatalogField> {
    const response = await fetch('/api/catalog/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...fieldData,
        tags: fieldData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create field');
    }

    return response.json();
  }

  /**
   * Get transformation confirmation data
   */
  static async getTransformationConfirmation(sourceId: string): Promise<ConfirmationData> {
    const response = await fetch(`/api/data-sources/${sourceId}/transform/confirm`);
    if (!response.ok) {
      throw new Error('Failed to get transformation data');
    }
    
    return response.json();
  }

  /**
   * Apply field mappings and transform data
   */
  static async applyMappings(sourceId: string): Promise<TransformationResult> {
    // First try without forcing retransform
    let response = await fetch(`/api/data-sources/${sourceId}/transform/apply-mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        forceRetransform: false,
        validateOnly: false,
        includeValidationDetails: true
      })
    });

    // Check if we got a confirmation request
    if (response.ok) {
      const data = await response.json();
      if (data.requiresConfirmation) {
        // Automatically force retransform
        response = await fetch(`/api/data-sources/${sourceId}/transform/apply-mappings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            forceRetransform: true,
            validateOnly: false,
            includeValidationDetails: true
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to apply mappings');
        }
        
        return response.json();
      }
      
      return data;
    }

    const error = await response.json();
    throw new Error(error.error || 'Failed to apply mappings');
  }

  /**
   * Export mapped data
   */
  static async exportMappedData(sourceId: string, format: 'json' | 'csv'): Promise<Blob> {
    const response = await fetch(`/api/data-sources/${sourceId}/export?format=${format}`);
    
    if (!response.ok) {
      throw new Error('Failed to export data');
    }

    return response.blob();
  }

  /**
   * Validate field name format
   */
  static validateFieldName(name: string): string | null {
    if (!name) return 'Field name is required';
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      return 'Field name must start with lowercase letter and contain only lowercase letters, numbers, and underscores';
    }
    return null;
  }

  /**
   * Get color classes for confidence level
   */
  static getConfidenceColor(confidence: number): string {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  }

  /**
   * Format confidence percentage
   */
  static formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }
}