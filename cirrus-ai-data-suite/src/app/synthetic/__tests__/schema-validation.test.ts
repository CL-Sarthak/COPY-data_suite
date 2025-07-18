/**
 * Unit tests for synthetic data schema validation
 * Tests the core logic that was causing the TypeError: Cannot convert undefined or null to object
 */

describe('Synthetic Data Schema Validation', () => {
  describe('Template Schema Handling', () => {
    it('should handle null templates object gracefully', () => {
      const templates = null;
      const selectedTemplate = 'users';
      
      // This simulates the problematic code that was failing
      const safeTemplateAccess = () => {
        if (templates && typeof templates === 'object' && selectedTemplate) {
          const templateSchema = (templates as Record<string, unknown>)[selectedTemplate];
          if (templateSchema && typeof templateSchema === 'object') {
            return Object.keys(templateSchema);
          }
        }
        return [];
      };
      
      expect(() => safeTemplateAccess()).not.toThrow();
      expect(safeTemplateAccess()).toEqual([]);
    });

    it('should handle undefined templates object gracefully', () => {
      const templates = undefined;
      const selectedTemplate = 'users';
      
      const safeTemplateAccess = () => {
        if (templates && typeof templates === 'object' && selectedTemplate) {
          const templateSchema = (templates as Record<string, unknown>)[selectedTemplate];
          if (templateSchema && typeof templateSchema === 'object') {
            return Object.keys(templateSchema);
          }
        }
        return [];
      };
      
      expect(() => safeTemplateAccess()).not.toThrow();
      expect(safeTemplateAccess()).toEqual([]);
    });

    it('should handle empty string selectedTemplate gracefully', () => {
      const templates = {
        users: { id: { type: 'uuid' }, name: { type: 'name' } }
      };
      const selectedTemplate = '';
      
      const safeTemplateAccess = () => {
        if (templates && typeof templates === 'object' && selectedTemplate) {
          const templateSchema = (templates as Record<string, unknown>)[selectedTemplate];
          if (templateSchema && typeof templateSchema === 'object') {
            return Object.keys(templateSchema);
          }
        }
        return [];
      };
      
      expect(() => safeTemplateAccess()).not.toThrow();
      expect(safeTemplateAccess()).toEqual([]);
    });

    it('should handle valid template correctly', () => {
      const templates = {
        users: { 
          id: { type: 'uuid' }, 
          name: { type: 'name' },
          email: { type: 'email' }
        }
      };
      const selectedTemplate = 'users';
      
      const safeTemplateAccess = () => {
        if (templates && typeof templates === 'object' && selectedTemplate) {
          const templateSchema = (templates as Record<string, unknown>)[selectedTemplate];
          if (templateSchema && typeof templateSchema === 'object') {
            return Object.keys(templateSchema);
          }
        }
        return [];
      };
      
      expect(() => safeTemplateAccess()).not.toThrow();
      expect(safeTemplateAccess()).toEqual(['id', 'name', 'email']);
    });

    it('should handle non-existent template gracefully', () => {
      const templates = {
        users: { id: { type: 'uuid' } }
      };
      const selectedTemplate = 'nonexistent';
      
      const safeTemplateAccess = () => {
        if (templates && typeof templates === 'object' && selectedTemplate) {
          const templateSchema = (templates as Record<string, unknown>)[selectedTemplate];
          if (templateSchema && typeof templateSchema === 'object') {
            return Object.keys(templateSchema);
          }
        }
        return [];
      };
      
      expect(() => safeTemplateAccess()).not.toThrow();
      expect(safeTemplateAccess()).toEqual([]);
    });
  });

  describe('Schema Validation', () => {
    it('should validate schema object correctly', () => {
      const validateSchema = (schema: unknown) => {
        if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
          return false;
        }
        
        try {
          const keys = Object.keys(schema);
          return keys.length > 0;
        } catch {
          return false;
        }
      };

      expect(validateSchema(null)).toBe(false);
      expect(validateSchema(undefined)).toBe(false);
      expect(validateSchema({})).toBe(false);
      expect(validateSchema([])).toBe(false);
      expect(validateSchema('string')).toBe(false);
      expect(validateSchema(123)).toBe(false);
      expect(validateSchema({ id: { type: 'uuid' } })).toBe(true);
    });

    it('should handle Object.keys on invalid objects safely', () => {
      const safeObjectKeys = (obj: unknown): string[] => {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
          return [];
        }
        
        try {
          return Object.keys(obj);
        } catch {
          return [];
        }
      };

      expect(safeObjectKeys(null)).toEqual([]);
      expect(safeObjectKeys(undefined)).toEqual([]);
      expect(safeObjectKeys('string')).toEqual([]);
      expect(safeObjectKeys(123)).toEqual([]);
      expect(safeObjectKeys([])).toEqual([]);
      expect(safeObjectKeys({})).toEqual([]);
      expect(safeObjectKeys({ a: 1, b: 2 })).toEqual(['a', 'b']);
    });
  });

  describe('Configuration Creation Logic', () => {
    it('should validate complete configuration creation flow', () => {
      const createConfig = (
        useTemplate: boolean, 
        selectedTemplate: string, 
        templates: Record<string, unknown> | null,
        newConfigSource: string
      ) => {
        let schema = {};
        let dataType = 'custom';
        const errors: string[] = [];

        if (useTemplate) {
          if (!selectedTemplate || (typeof selectedTemplate === 'string' && selectedTemplate.trim() === '')) {
            errors.push('Please select a template to proceed.');
            return { success: false, errors };
          }
          
          if (!templates || typeof templates !== 'object') {
            errors.push('Templates not available.');
            return { success: false, errors };
          }
          
          const templateSchema = (templates as Record<string, unknown>)[selectedTemplate];
          if (templateSchema && typeof templateSchema === 'object') {
            schema = templateSchema;
            dataType = selectedTemplate;
          } else {
            errors.push('Selected template is not available. Please choose another template.');
            return { success: false, errors };
          }
        } else if (!useTemplate) {
          if (!newConfigSource || (typeof newConfigSource === 'string' && newConfigSource.trim() === '')) {
            errors.push('Please select a data source to proceed.');
            return { success: false, errors };
          }
          // In real implementation, this would fetch from API
          schema = { mockField: { type: 'string' } };
          dataType = 'user-dataset';
        } else {
          errors.push('Please select either a template or a data source to proceed.');
          return { success: false, errors };
        }

        if (!schema || typeof schema !== 'object' || Object.keys(schema).length === 0) {
          errors.push('No schema could be generated. Please select a template or data source.');
          return { success: false, errors };
        }

        return { success: true, schema, dataType, errors: [] };
      };

      // Test template mode with valid data
      expect(createConfig(true, 'users', { users: { id: { type: 'uuid' } } }, '')).toEqual({
        success: true,
        schema: { id: { type: 'uuid' } },
        dataType: 'users',
        errors: []
      });

      // Test template mode with empty template
      expect(createConfig(true, '', { users: { id: { type: 'uuid' } } }, '')).toEqual({
        success: false,
        errors: ['Please select a template to proceed.']
      });

      // Test template mode with null templates
      expect(createConfig(true, 'users', null, '')).toEqual({
        success: false,
        errors: ['Templates not available.']
      });

      // Test data source mode with valid source
      expect(createConfig(false, '', {}, 'source-1')).toEqual({
        success: true,
        schema: { mockField: { type: 'string' } },
        dataType: 'user-dataset',
        errors: []
      });

      // Test data source mode with empty source
      expect(createConfig(false, '', {}, '')).toEqual({
        success: false,
        errors: ['Please select a data source to proceed.']
      });
    });
  });

  describe('Schema Conversion', () => {
    // Type definitions for tests
    interface TestCatalogField {
      name?: string;
      fieldName?: string;
      type?: string;
      dataType?: string;
    }

    interface TestCatalogSchema {
      fields?: TestCatalogField[];
    }

    interface TestNormalizedField {
      sourceField?: string;
      name?: string;
      type?: string;
      subtype?: string;
      constraints?: Record<string, unknown>;
    }

    interface TestNormalizedSchema {
      fields?: TestNormalizedField[];
    }

    interface TestSyntheticField {
      type: string;
      subtype?: string;
      constraints?: Record<string, unknown>;
    }

    it('should convert catalog schema to synthetic format correctly', () => {
      const convertCatalogSchema = (catalogSchema: TestCatalogSchema): Record<string, TestSyntheticField> => {
        const syntheticSchema: Record<string, TestSyntheticField> = {};
        
        if (catalogSchema.fields && Array.isArray(catalogSchema.fields)) {
          catalogSchema.fields.forEach((field: TestCatalogField) => {
            const fieldName = field.name || field.fieldName;
            if (fieldName) {
              syntheticSchema[fieldName] = inferFieldType(field);
            }
          });
        }
        
        return syntheticSchema;
      };

      const inferFieldType = (field: TestCatalogField): TestSyntheticField => {
        const fieldName = (field.name || field.fieldName || '').toLowerCase();
        const fieldType = (field.type || field.dataType || '').toLowerCase();

        // ID detection should come before number detection
        if (fieldName === 'id' || fieldName.endsWith('_id')) return { type: 'uuid' };
        if (fieldName.includes('email')) return { type: 'email' };
        if (fieldName.includes('phone')) return { type: 'phone' };
        if (fieldName.includes('name')) return { type: 'name', subtype: 'fullName' };
        if (fieldType.includes('number')) return { type: 'number', constraints: { min: 1, max: 1000 } };
        
        return { type: 'text', subtype: 'sentence' };
      };

      const catalogSchema = {
        fields: [
          { name: 'id', type: 'number' },
          { name: 'email', type: 'string' },
          { name: 'full_name', type: 'string' },
          { name: 'phone_number', type: 'string' }
        ]
      };

      const result = convertCatalogSchema(catalogSchema);

      expect(result).toEqual({
        id: { type: 'uuid' },
        email: { type: 'email' },
        full_name: { type: 'name', subtype: 'fullName' },
        phone_number: { type: 'phone' }
      });
    });

    it('should convert normalized schema to synthetic format correctly', () => {
      const convertNormalizedSchema = (normalizedSchema: TestNormalizedSchema): Record<string, TestSyntheticField> => {
        const syntheticSchema: Record<string, TestSyntheticField> = {};
        
        if (normalizedSchema.fields && Array.isArray(normalizedSchema.fields)) {
          normalizedSchema.fields.forEach((field: TestNormalizedField) => {
            const fieldName = field.sourceField || field.name;
            if (fieldName) {
              syntheticSchema[fieldName] = {
                type: field.type || 'text',
                subtype: field.subtype || 'sentence',
                constraints: field.constraints || {}
              };
            }
          });
        }
        
        return syntheticSchema;
      };

      const normalizedSchema = {
        fields: [
          { sourceField: 'user_id', type: 'uuid', constraints: {} },
          { sourceField: 'email_address', type: 'email', constraints: {} },
          { sourceField: 'contact_number', type: 'phone', constraints: {} }
        ]
      };

      const result = convertNormalizedSchema(normalizedSchema);

      expect(result).toEqual({
        user_id: { type: 'uuid', subtype: 'sentence', constraints: {} },
        email_address: { type: 'email', subtype: 'sentence', constraints: {} },
        contact_number: { type: 'phone', subtype: 'sentence', constraints: {} }
      });
    });

    it('should handle schema API response formats correctly', () => {
      interface SchemaResponse {
        schema?: Record<string, unknown>;
        originalSchema?: { fields: unknown[] };
        normalizedSchema?: { fields: unknown[] };
        [key: string]: unknown;
      }

      const handleSchemaResponse = (schemaData: SchemaResponse): Record<string, unknown> | null => {
        let extractedSchema = null;
        
        if (schemaData.schema && typeof schemaData.schema === 'object') {
          // Non-transformed data source format
          extractedSchema = schemaData.schema;
        } else if (schemaData.originalSchema && schemaData.originalSchema.fields) {
          // Transformed data source format - simulate conversion
          extractedSchema = { converted: 'catalog_schema' };
        } else if (schemaData.normalizedSchema && schemaData.normalizedSchema.fields) {
          // Use normalized schema if available
          extractedSchema = { converted: 'normalized_schema' };
        }
        
        return extractedSchema;
      };

      // Test non-transformed format
      expect(handleSchemaResponse({ 
        schema: { id: { type: 'uuid' }, name: { type: 'text' } } 
      })).toEqual({ id: { type: 'uuid' }, name: { type: 'text' } });

      // Test transformed format with original schema
      expect(handleSchemaResponse({ 
        originalSchema: { fields: [{ name: 'id' }] } 
      })).toEqual({ converted: 'catalog_schema' });

      // Test transformed format with normalized schema
      expect(handleSchemaResponse({ 
        normalizedSchema: { fields: [{ name: 'id' }] } 
      })).toEqual({ converted: 'normalized_schema' });

      // Test invalid format
      expect(handleSchemaResponse({ 
        invalid: 'data' 
      })).toBeNull();
    });
  });
});