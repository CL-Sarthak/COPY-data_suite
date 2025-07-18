/**
 * Catalog Mapping Service
 * Manages field mappings between data sources and the global catalog
 */

import { getDatabase } from '@/database/connection';
import { CatalogFieldEntity } from '@/entities/CatalogFieldEntity';
import { CatalogCategoryEntity } from '@/entities/CatalogCategoryEntity';
import { FieldMappingEntity } from '@/entities/FieldMappingEntity';
import { GlobalCatalogService, CatalogField, SourceFieldMapping } from './globalCatalogService';

export interface MappingSuggestion {
  sourceFieldName: string;
  suggestedMappings: Array<{
    field: CatalogField;
    confidence: number;
    reason: string;
  }>;
}

export interface MappedRecord {
  catalogData: Record<string, unknown>;
  sourceData: Record<string, unknown>;
  mappingInfo: {
    mappedFields: number;
    totalFields: number;
    unmappedFields: string[];
    validationErrors: Array<{ field: string; errors: string[] }>;
  };
}

export class CatalogMappingService {
  /**
   * Initialize the catalog with standard fields and categories if not already present
   */
  static async initializeStandardCatalog(): Promise<void> {
    try {
      const db = await getDatabase();
      
      // Initialize standard categories first
      await this.initializeStandardCategories();
      
      // Then initialize standard fields
      const fieldRepository = db.getRepository(CatalogFieldEntity);

      // Check if standard fields already exist
      const existingFields = await fieldRepository.count({ where: { isStandard: true } });
      if (existingFields > 0) {
        console.log('Standard catalog fields already initialized');
        return;
      }

      // Insert standard fields
      const standardFields = GlobalCatalogService.getStandardFields();
      for (const field of standardFields) {
        const entity = new CatalogFieldEntity();
        entity.name = field.name;
        entity.displayName = field.displayName;
        entity.description = field.description;
        entity.dataType = field.dataType;
        entity.category = field.category;
        entity.isRequired = field.isRequired;
        entity.isStandard = field.isStandard;
        entity.validationRules = field.validationRules ? JSON.stringify(field.validationRules) : undefined;
        entity.tags = JSON.stringify(field.tags);

        await fieldRepository.save(entity);
      }

      console.log(`Initialized ${standardFields.length} standard catalog fields`);
    } catch (error) {
      console.error('Error initializing standard catalog:', error);
      throw error;
    }
  }

  /**
   * Initialize standard categories in the database
   */
  static async initializeStandardCategories(): Promise<void> {
    try {
      const db = await getDatabase();
      const categoryRepository = db.getRepository(CatalogCategoryEntity);

      // Check if standard categories already exist
      const existingCategories = await categoryRepository.count({ where: { isStandard: true } });
      if (existingCategories > 0) {
        console.log('Standard catalog categories already initialized');
        return;
      }

      // Insert standard categories
      const standardCategories = GlobalCatalogService.getStandardCategories();
      for (const category of standardCategories) {
        const entity = new CatalogCategoryEntity();
        entity.name = category.name;
        entity.displayName = category.displayName;
        entity.description = category.description;
        entity.color = category.color;
        entity.icon = category.icon;
        entity.sortOrder = category.sortOrder;
        entity.isStandard = true;
        entity.isActive = true;

        await categoryRepository.save(entity);
      }

      console.log(`Initialized ${standardCategories.length} standard catalog categories`);
    } catch (error) {
      console.error('Error initializing standard categories:', error);
      throw error;
    }
  }

  /**
   * Get all catalog fields
   */
  static async getAllCatalogFields(): Promise<CatalogField[]> {
    try {
      const db = await getDatabase();
      const repository = db.getRepository(CatalogFieldEntity);
      const entities = await repository.find({ order: { category: 'ASC', displayName: 'ASC' } });

      return entities.map(entity => ({
        id: entity.id,
        name: entity.name,
        displayName: entity.displayName,
        description: entity.description,
        dataType: entity.dataType as CatalogField['dataType'],
        category: entity.category,
        isRequired: entity.isRequired,
        isStandard: entity.isStandard,
        validationRules: entity.validationRules ? JSON.parse(entity.validationRules) : undefined,
        tags: JSON.parse(entity.tags),
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString()
      }));
    } catch (error) {
      console.error('Error getting catalog fields:', error);
      throw error;
    }
  }

  /**
   * Get catalog fields by category
   */
  static async getCatalogFieldsByCategory(category: string): Promise<CatalogField[]> {
    try {
      const db = await getDatabase();
      const repository = db.getRepository(CatalogFieldEntity);
      const entities = await repository.find({ 
        where: { category },
        order: { displayName: 'ASC' }
      });

      return entities.map(entity => ({
        id: entity.id,
        name: entity.name,
        displayName: entity.displayName,
        description: entity.description,
        dataType: entity.dataType as CatalogField['dataType'],
        category: entity.category,
        isRequired: entity.isRequired,
        isStandard: entity.isStandard,
        validationRules: entity.validationRules ? JSON.parse(entity.validationRules) : undefined,
        tags: JSON.parse(entity.tags),
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString()
      }));
    } catch (error) {
      console.error('Error getting catalog fields by category:', error);
      throw error;
    }
  }

  /**
   * Create a new custom catalog field
   */
  static async createCatalogField(field: Omit<CatalogField, 'id' | 'createdAt' | 'updatedAt' | 'isStandard'>): Promise<CatalogField> {
    try {
      const db = await getDatabase();
      const repository = db.getRepository(CatalogFieldEntity);

      const entity = new CatalogFieldEntity();
      entity.name = field.name;
      entity.displayName = field.displayName;
      entity.description = field.description;
      entity.dataType = field.dataType;
      entity.category = field.category;
      entity.isRequired = field.isRequired;
      entity.isStandard = false; // Custom fields are never standard
      entity.validationRules = field.validationRules ? JSON.stringify(field.validationRules) : undefined;
      entity.tags = JSON.stringify(field.tags);

      const saved = await repository.save(entity);

      return {
        id: saved.id,
        name: saved.name,
        displayName: saved.displayName,
        description: saved.description,
        dataType: saved.dataType as CatalogField['dataType'],
        category: saved.category,
        isRequired: saved.isRequired,
        isStandard: saved.isStandard,
        validationRules: saved.validationRules ? JSON.parse(saved.validationRules) : undefined,
        tags: JSON.parse(saved.tags),
        createdAt: saved.createdAt.toISOString(),
        updatedAt: saved.updatedAt.toISOString()
      };
    } catch (error) {
      console.error('Error creating catalog field:', error);
      throw error;
    }
  }

  /**
   * Get field mappings for a data source
   */
  static async getFieldMappings(sourceId: string): Promise<SourceFieldMapping[]> {
    try {
      const db = await getDatabase();
      const repository = db.getRepository(FieldMappingEntity);
      const entities = await repository.find({ 
        where: { sourceId, isActive: true },
        order: { sourceFieldName: 'ASC' }
      });

      return entities.map(entity => ({
        id: entity.id,
        sourceId: entity.sourceId,
        sourceFieldName: entity.sourceFieldName,
        catalogFieldId: entity.catalogFieldId,
        transformationRule: entity.transformationRule ? JSON.parse(entity.transformationRule) : undefined,
        confidence: entity.confidence,
        isManual: entity.isManual,
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString()
      }));
    } catch (error) {
      console.error('Error getting field mappings:', error);
      throw error;
    }
  }

  /**
   * Create or update a field mapping
   */
  static async createFieldMapping(mapping: Omit<SourceFieldMapping, 'id' | 'createdAt' | 'updatedAt'>): Promise<SourceFieldMapping> {
    try {
      const db = await getDatabase();
      const repository = db.getRepository(FieldMappingEntity);

      // Check if mapping already exists
      const existing = await repository.findOne({
        where: { 
          sourceId: mapping.sourceId,
          sourceFieldName: mapping.sourceFieldName
        }
      });

      let entity: FieldMappingEntity;
      if (existing) {
        // Update existing mapping
        existing.catalogFieldId = mapping.catalogFieldId;
        existing.transformationRule = mapping.transformationRule ? JSON.stringify(mapping.transformationRule) : undefined;
        existing.confidence = mapping.confidence;
        existing.isManual = mapping.isManual;
        entity = await repository.save(existing);
      } else {
        // Create new mapping
        entity = new FieldMappingEntity();
        entity.sourceId = mapping.sourceId;
        entity.sourceFieldName = mapping.sourceFieldName;
        entity.catalogFieldId = mapping.catalogFieldId;
        entity.transformationRule = mapping.transformationRule ? JSON.stringify(mapping.transformationRule) : undefined;
        entity.confidence = mapping.confidence;
        entity.isManual = mapping.isManual;
        entity = await repository.save(entity);
      }

      return {
        id: entity.id,
        sourceId: entity.sourceId,
        sourceFieldName: entity.sourceFieldName,
        catalogFieldId: entity.catalogFieldId,
        transformationRule: entity.transformationRule ? JSON.parse(entity.transformationRule) : undefined,
        confidence: entity.confidence,
        isManual: entity.isManual,
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString()
      };
    } catch (error) {
      console.error('Error creating field mapping:', error);
      throw error;
    }
  }

  /**
   * Generate mapping suggestions for a data source
   */
  static async generateMappingSuggestions(sourceId: string, sourceFields: string[]): Promise<MappingSuggestion[]> {
    try {
      const suggestions: MappingSuggestion[] = [];

      // Get existing mappings to avoid duplicates
      const existingMappings = await this.getFieldMappings(sourceId);
      const mappedFields = new Set(existingMappings.map(m => m.sourceFieldName));

      for (const sourceFieldName of sourceFields) {
        if (mappedFields.has(sourceFieldName)) {
          continue; // Skip already mapped fields
        }

        const suggestedMappings = GlobalCatalogService.suggestFieldMappings(sourceFieldName);
        
        if (suggestedMappings.length > 0) {
          suggestions.push({
            sourceFieldName,
            suggestedMappings
          });
        }
      }

      return suggestions;
    } catch (error) {
      console.error('Error generating mapping suggestions:', error);
      throw error;
    }
  }

  /**
   * Auto-map fields based on suggestions with high confidence
   */
  static async autoMapFields(sourceId: string, sourceFields: string[], minConfidence = 0.8): Promise<SourceFieldMapping[]> {
    try {
      const suggestions = await this.generateMappingSuggestions(sourceId, sourceFields);
      const createdMappings: SourceFieldMapping[] = [];

      for (const suggestion of suggestions) {
        const topSuggestion = suggestion.suggestedMappings[0];
        if (topSuggestion && topSuggestion.confidence >= minConfidence) {
          const mapping = await this.createFieldMapping({
            sourceId,
            sourceFieldName: suggestion.sourceFieldName,
            catalogFieldId: topSuggestion.field.id,
            confidence: topSuggestion.confidence,
            isManual: false
          });
          createdMappings.push(mapping);
        }
      }

      return createdMappings;
    } catch (error) {
      console.error('Error auto-mapping fields:', error);
      throw error;
    }
  }

  /**
   * Transform source data to catalog format using field mappings
   */
  static async transformDataToCatalog(sourceId: string, sourceData: Record<string, unknown>[]): Promise<MappedRecord[]> {
    try {
      const mappings = await this.getFieldMappings(sourceId);
      const catalogFields = await this.getAllCatalogFields();
      
      const catalogFieldMap = new Map(catalogFields.map(f => [f.id, f]));
      const fieldMappingMap = new Map(mappings.map(m => [m.sourceFieldName, m]));

      const results: MappedRecord[] = [];

      for (const sourceRecord of sourceData) {
        const catalogData: Record<string, unknown> = {};
        const unmappedFields: string[] = [];
        const validationErrors: Array<{ field: string; errors: string[] }> = [];
        let mappedFieldCount = 0;

        // Process mapped fields
        for (const [sourceFieldName, value] of Object.entries(sourceRecord)) {
          const mapping = fieldMappingMap.get(sourceFieldName);
          
          if (mapping) {
            const catalogField = catalogFieldMap.get(mapping.catalogFieldId);
            if (catalogField) {
              // Apply transformation if specified
              let transformedValue = value;
              if (mapping.transformationRule) {
                transformedValue = this.applyTransformation(value, mapping.transformationRule);
              }

              // Validate value
              const validation = GlobalCatalogService.validateFieldValue(transformedValue, catalogField);
              if (validation.isValid) {
                catalogData[catalogField.name] = transformedValue;
                mappedFieldCount++;
              } else {
                validationErrors.push({
                  field: catalogField.name,
                  errors: validation.errors
                });
              }
            }
          } else {
            unmappedFields.push(sourceFieldName);
          }
        }

        results.push({
          catalogData,
          sourceData: sourceRecord,
          mappingInfo: {
            mappedFields: mappedFieldCount,
            totalFields: Object.keys(sourceRecord).length,
            unmappedFields,
            validationErrors
          }
        });
      }

      return results;
    } catch (error) {
      console.error('Error transforming data to catalog:', error);
      throw error;
    }
  }

  /**
   * Apply transformation rule to a value
   */
  private static applyTransformation(value: unknown, rule: SourceFieldMapping['transformationRule']): unknown {
    if (!rule) return value;

    switch (rule.type) {
      case 'direct':
        return value;
      
      case 'format':
        if (typeof value === 'string' && rule.expression) {
          // Simple string formatting (could be expanded)
          return value.replace(new RegExp(rule.expression), rule.parameters?.replacement as string || '');
        }
        return value;
      
      case 'calculation':
        if (typeof value === 'number' && rule.expression) {
          // Simple calculations (could be expanded)
          try {
            return eval(rule.expression.replace('$value', String(value)));
          } catch {
            return value;
          }
        }
        return value;
      
      case 'lookup':
        if (rule.parameters?.lookupTable) {
          const lookupTable = rule.parameters.lookupTable as Record<string, unknown>;
          return lookupTable[String(value)] || value;
        }
        return value;
      
      case 'conditional':
        if (rule.parameters?.conditions) {
          const conditions = rule.parameters.conditions as Array<{ condition: string; value: unknown }>;
          for (const condition of conditions) {
            try {
              if (eval(condition.condition.replace('$value', JSON.stringify(value)))) {
                return condition.value;
              }
            } catch {
              continue;
            }
          }
        }
        return value;
      
      default:
        return value;
    }
  }

  /**
   * Delete a field mapping
   */
  static async deleteFieldMapping(mappingId: string): Promise<boolean> {
    try {
      const db = await getDatabase();
      const repository = db.getRepository(FieldMappingEntity);
      const result = await repository.delete(mappingId);
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      console.error('Error deleting field mapping:', error);
      throw error;
    }
  }

  /**
   * Get a catalog field by ID
   */
  static async getCatalogFieldById(fieldId: string): Promise<CatalogFieldEntity | null> {
    try {
      const db = await getDatabase();
      const repository = db.getRepository(CatalogFieldEntity);
      return await repository.findOne({ where: { id: fieldId } });
    } catch (error) {
      console.error('Error getting catalog field by ID:', error);
      throw error;
    }
  }

  /**
   * Update a catalog field
   */
  static async updateCatalogField(fieldId: string, updates: Partial<CatalogField>): Promise<CatalogField | null> {
    try {
      const db = await getDatabase();
      const repository = db.getRepository(CatalogFieldEntity);
      
      const field = await repository.findOne({ where: { id: fieldId } });
      if (!field) {
        return null;
      }

      // Transform updates to entity format and apply them
      if (updates.name !== undefined) field.name = updates.name;
      if (updates.displayName !== undefined) field.displayName = updates.displayName;
      if (updates.description !== undefined) field.description = updates.description;
      if (updates.dataType !== undefined) field.dataType = updates.dataType;
      if (updates.category !== undefined) field.category = updates.category;
      if (updates.isRequired !== undefined) field.isRequired = updates.isRequired;
      if (updates.isStandard !== undefined) field.isStandard = updates.isStandard;
      if (updates.validationRules !== undefined) {
        field.validationRules = updates.validationRules ? JSON.stringify(updates.validationRules) : undefined;
      }
      if (updates.tags !== undefined) {
        field.tags = JSON.stringify(updates.tags);
      }
      
      const savedEntity = await repository.save(field);
      
      // Transform back to CatalogField format
      return {
        id: savedEntity.id,
        name: savedEntity.name,
        displayName: savedEntity.displayName,
        description: savedEntity.description,
        dataType: savedEntity.dataType as CatalogField['dataType'],
        category: savedEntity.category,
        isRequired: savedEntity.isRequired,
        isStandard: savedEntity.isStandard,
        validationRules: savedEntity.validationRules ? JSON.parse(savedEntity.validationRules) : undefined,
        tags: JSON.parse(savedEntity.tags),
        createdAt: savedEntity.createdAt.toISOString(),
        updatedAt: savedEntity.updatedAt.toISOString()
      };
    } catch (error) {
      console.error('Error updating catalog field:', error);
      throw error;
    }
  }

  /**
   * Get field mappings by catalog field ID
   */
  static async getFieldMappingsByCatalogField(catalogFieldId: string): Promise<SourceFieldMapping[]> {
    try {
      const db = await getDatabase();
      const repository = db.getRepository(FieldMappingEntity);
      
      const entities = await repository.find({ 
        where: { catalogFieldId }
      });

      return entities.map(entity => ({
        id: entity.id,
        sourceId: entity.sourceId,
        sourceFieldName: entity.sourceFieldName,
        catalogFieldId: entity.catalogFieldId,
        transformationRule: entity.transformationRule ? JSON.parse(entity.transformationRule) : undefined,
        confidence: entity.confidence,
        isManual: entity.isManual,
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString()
      }));
    } catch (error) {
      console.error('Error getting field mappings by catalog field:', error);
      throw error;
    }
  }

  /**
   * Delete a catalog field (both standard and custom fields can be deleted)
   */
  static async deleteCatalogField(fieldId: string): Promise<boolean> {
    try {
      const db = await getDatabase();
      const repository = db.getRepository(CatalogFieldEntity);
      
      // First delete any field mappings that reference this field
      const mappingRepository = db.getRepository(FieldMappingEntity);
      await mappingRepository.delete({ catalogFieldId: fieldId });
      
      // Then delete the field itself (removed isStandard restriction)
      const result = await repository.delete({ id: fieldId });
      return result.affected ? result.affected > 0 : false;
    } catch (error) {
      console.error('Error deleting catalog field:', error);
      throw error;
    }
  }
}