import { CatalogMappingService } from '../catalogMappingService';
import { getDatabase } from '@/database/connection';
import { CatalogFieldEntity } from '@/entities/CatalogFieldEntity';
import { CatalogCategoryEntity } from '@/entities/CatalogCategoryEntity';
import { FieldMappingEntity } from '@/entities/FieldMappingEntity';
import { GlobalCatalogService } from '../globalCatalogService';

// Mock the database connection
jest.mock('@/database/connection');
jest.mock('../globalCatalogService');
jest.mock('@/utils/entity-validator', () => ({
  validateEntity: jest.fn(() => true),
  validateAllEntities: jest.fn(() => {}),
}));

const mockDatabase = {
  getRepository: jest.fn()
};

const mockFieldRepository = {
  count: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn()
};

const mockCategoryRepository = {
  count: jest.fn(),
  find: jest.fn(),
  save: jest.fn()
};

const mockMappingRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  delete: jest.fn()
};

describe('CatalogMappingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDatabase as jest.Mock).mockResolvedValue(mockDatabase);
    mockDatabase.getRepository.mockImplementation((entity) => {
      if (entity === CatalogFieldEntity) return mockFieldRepository;
      if (entity === CatalogCategoryEntity) return mockCategoryRepository;
      if (entity === FieldMappingEntity) return mockMappingRepository;
      return {};
    });
  });

  describe('initializeStandardCatalog', () => {
    it('should skip initialization if standard fields already exist', async () => {
      mockFieldRepository.count.mockResolvedValue(5);
      mockCategoryRepository.count.mockResolvedValue(3);
      
      await CatalogMappingService.initializeStandardCatalog();
      
      expect(mockFieldRepository.count).toHaveBeenCalledWith({ where: { isStandard: true } });
      expect(mockFieldRepository.save).not.toHaveBeenCalled();
    });

    it('should initialize standard fields when none exist', async () => {
      mockFieldRepository.count.mockResolvedValue(0);
      mockCategoryRepository.count.mockResolvedValue(0);
      
      const mockStandardFields = [
        {
          name: 'first_name',
          displayName: 'First Name',
          description: 'Person\'s first name',
          dataType: 'string',
          category: 'identity',
          isRequired: false,
          isStandard: true,
          tags: ['personal', 'identity'],
          validationRules: { minLength: 1, maxLength: 50 }
        }
      ];
      
      const mockStandardCategories = [
        {
          name: 'identity',
          displayName: 'Identity & Personal',
          description: 'Personal identity fields',
          color: '#3b82f6',
          icon: 'UserIcon',
          sortOrder: 1
        }
      ];

      (GlobalCatalogService.getStandardFields as jest.Mock).mockReturnValue(mockStandardFields);
      (GlobalCatalogService.getStandardCategories as jest.Mock).mockReturnValue(mockStandardCategories);

      await CatalogMappingService.initializeStandardCatalog();

      expect(mockFieldRepository.save).toHaveBeenCalledTimes(1);
      expect(mockCategoryRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllCatalogFields', () => {
    it('should return formatted catalog fields', async () => {
      const mockEntities = [
        {
          id: '1',
          name: 'first_name',
          displayName: 'First Name',
          description: 'Person\'s first name',
          dataType: 'string',
          category: 'identity',
          isRequired: false,
          isStandard: true,
          validationRules: '{"minLength": 1}',
          tags: '["personal"]',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      mockFieldRepository.find.mockResolvedValue(mockEntities);

      const result = await CatalogMappingService.getAllCatalogFields();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '1',
        name: 'first_name',
        displayName: 'First Name',
        description: 'Person\'s first name',
        dataType: 'string',
        category: 'identity',
        isRequired: false,
        isStandard: true,
        validationRules: { minLength: 1 },
        tags: ['personal'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      });
    });

    it('should handle fields without validation rules', async () => {
      const mockEntities = [
        {
          id: '1',
          name: 'simple_field',
          displayName: 'Simple Field',
          description: 'A simple field',
          dataType: 'string',
          category: 'custom',
          isRequired: false,
          isStandard: false,
          validationRules: null,
          tags: '[]',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      mockFieldRepository.find.mockResolvedValue(mockEntities);

      const result = await CatalogMappingService.getAllCatalogFields();

      expect(result[0].validationRules).toBeUndefined();
      expect(result[0].tags).toEqual([]);
    });
  });

  describe('createCatalogField', () => {
    it('should create a new custom catalog field', async () => {
      const newField = {
        name: 'custom_field',
        displayName: 'Custom Field',
        description: 'A custom field',
        dataType: 'string' as const,
        category: 'custom',
        isRequired: false,
        tags: ['custom'],
        validationRules: { minLength: 1 }
      };

      const savedEntity = {
        id: '1',
        ...newField,
        isStandard: false,
        validationRules: '{"minLength": 1}',
        tags: '["custom"]',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      };

      mockFieldRepository.save.mockResolvedValue(savedEntity);

      const result = await CatalogMappingService.createCatalogField(newField);

      expect(mockFieldRepository.save).toHaveBeenCalled();
      expect(result.isStandard).toBe(false);
      expect(result.id).toBe('1');
    });
  });

  describe('getFieldMappings', () => {
    it('should return field mappings for a data source', async () => {
      const mockMappings = [
        {
          id: '1',
          sourceId: 'source-1',
          sourceFieldName: 'name',
          catalogFieldId: 'field-1',
          transformationRule: '{"type": "direct"}',
          confidence: 0.95,
          isManual: false,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      mockMappingRepository.find.mockResolvedValue(mockMappings);

      const result = await CatalogMappingService.getFieldMappings('source-1');

      expect(result).toHaveLength(1);
      expect(result[0].transformationRule).toEqual({ type: 'direct' });
      expect(mockMappingRepository.find).toHaveBeenCalledWith({
        where: { sourceId: 'source-1', isActive: true },
        order: { sourceFieldName: 'ASC' }
      });
    });
  });

  describe('createFieldMapping', () => {
    it('should create a new field mapping', async () => {
      const mapping = {
        sourceId: 'source-1',
        sourceFieldName: 'name',
        catalogFieldId: 'field-1',
        confidence: 0.95,
        isManual: true
      };

      mockMappingRepository.findOne.mockResolvedValue(null);
      mockMappingRepository.save.mockResolvedValue({
        id: '1',
        ...mapping,
        transformationRule: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      });

      const result = await CatalogMappingService.createFieldMapping(mapping);

      expect(result.id).toBe('1');
      expect(result.isManual).toBe(true);
    });

    it('should update existing field mapping', async () => {
      const mapping = {
        sourceId: 'source-1',
        sourceFieldName: 'name',
        catalogFieldId: 'field-2',
        confidence: 0.98,
        isManual: true
      };

      const existingMapping = {
        id: '1',
        sourceId: 'source-1',
        sourceFieldName: 'name',
        catalogFieldId: 'field-1',
        confidence: 0.85,
        isManual: false
      };

      mockMappingRepository.findOne.mockResolvedValue(existingMapping);
      mockMappingRepository.save.mockResolvedValue({
        ...existingMapping,
        ...mapping,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      });

      const result = await CatalogMappingService.createFieldMapping(mapping);

      expect(result.catalogFieldId).toBe('field-2');
      expect(result.confidence).toBe(0.98);
    });
  });

  describe('generateMappingSuggestions', () => {
    it('should generate mapping suggestions for source fields', async () => {
      const sourceFields = ['first_name', 'last_name', 'email_address'];
      
      mockMappingRepository.find.mockResolvedValue([]);
      
      const mockSuggestions = [
        {
          field: { id: 'field-1', name: 'first_name' },
          confidence: 0.95,
          reason: 'Exact name match'
        },
        {
          field: { id: 'field-2', name: 'last_name' },
          confidence: 0.95,
          reason: 'Exact name match'
        }
      ];

      (GlobalCatalogService.suggestFieldMappings as jest.Mock)
        .mockReturnValueOnce(mockSuggestions.slice(0, 1))
        .mockReturnValueOnce(mockSuggestions.slice(1, 2))
        .mockReturnValueOnce([]);

      const result = await CatalogMappingService.generateMappingSuggestions('source-1', sourceFields);

      expect(result).toHaveLength(2);
      expect(result[0].sourceFieldName).toBe('first_name');
      expect(result[0].suggestedMappings).toHaveLength(1);
      expect(result[1].sourceFieldName).toBe('last_name');
    });

    it('should skip already mapped fields', async () => {
      const sourceFields = ['first_name', 'email'];
      
      const existingMappings = [
        {
          id: '1',
          sourceId: 'source-1',
          sourceFieldName: 'first_name',
          catalogFieldId: 'field-1',
          confidence: 0.95,
          isManual: true,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z')
        }
      ];

      mockMappingRepository.find.mockResolvedValue(existingMappings);

      (GlobalCatalogService.suggestFieldMappings as jest.Mock).mockReturnValue([]);

      await CatalogMappingService.generateMappingSuggestions('source-1', sourceFields);

      expect(GlobalCatalogService.suggestFieldMappings).toHaveBeenCalledTimes(1);
      expect(GlobalCatalogService.suggestFieldMappings).toHaveBeenCalledWith('email');
    });
  });

  describe('autoMapFields', () => {
    it('should auto-map fields with high confidence', async () => {
      const sourceFields = ['first_name', 'email'];
      
      mockMappingRepository.find.mockResolvedValue([]);
      
      const highConfidenceSuggestion = [
        {
          field: { id: 'field-1', name: 'first_name' },
          confidence: 0.95,
          reason: 'Exact name match'
        }
      ];
      
      const lowConfidenceSuggestion = [
        {
          field: { id: 'field-2', name: 'email' },
          confidence: 0.7,
          reason: 'Partial match'
        }
      ];

      (GlobalCatalogService.suggestFieldMappings as jest.Mock)
        .mockReturnValueOnce(highConfidenceSuggestion)
        .mockReturnValueOnce(lowConfidenceSuggestion);

      mockMappingRepository.save.mockResolvedValue({
        id: '1',
        sourceId: 'source-1',
        sourceFieldName: 'first_name',
        catalogFieldId: 'field-1',
        confidence: 0.95,
        isManual: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      });

      const result = await CatalogMappingService.autoMapFields('source-1', sourceFields, 0.8);

      expect(result).toHaveLength(1);
      expect(result[0].sourceFieldName).toBe('first_name');
      expect(result[0].confidence).toBe(0.95);
    });
  });

  describe('deleteCatalogField', () => {
    it('should delete a catalog field and associated mappings', async () => {
      mockMappingRepository.delete.mockResolvedValue({ affected: 2 });
      mockFieldRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await CatalogMappingService.deleteCatalogField('field-1');

      expect(mockMappingRepository.delete).toHaveBeenCalledWith({ catalogFieldId: 'field-1' });
      expect(mockFieldRepository.delete).toHaveBeenCalledWith({ id: 'field-1' });
      expect(result).toBe(true);
    });

    it('should return false if field does not exist', async () => {
      mockMappingRepository.delete.mockResolvedValue({ affected: 0 });
      mockFieldRepository.delete.mockResolvedValue({ affected: 0 });

      const result = await CatalogMappingService.deleteCatalogField('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getFieldMappingsByCatalogField', () => {
    it('should return mappings for a specific catalog field', async () => {
      const mockMappings = [
        {
          id: '1',
          sourceId: 'source-1',
          sourceFieldName: 'name',
          catalogFieldId: 'field-1',
          transformationRule: null,
          confidence: 0.95,
          isManual: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      mockMappingRepository.find.mockResolvedValue(mockMappings);

      const result = await CatalogMappingService.getFieldMappingsByCatalogField('field-1');

      expect(result).toHaveLength(1);
      expect(mockMappingRepository.find).toHaveBeenCalledWith({
        where: { catalogFieldId: 'field-1' }
      });
    });
  });

  describe('transformDataToCatalog', () => {
    it('should transform source data using field mappings', async () => {
      const sourceData = [
        { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
        { first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' }
      ];

      const mockMappings = [
        {
          id: '1',
          sourceId: 'source-1',
          sourceFieldName: 'first_name',
          catalogFieldId: 'field-1',
          transformationRule: undefined,
          confidence: 0.95,
          isManual: true,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-01T00:00:00.000Z')
        }
      ];

      const mockCatalogFields = [
        {
          id: 'field-1',
          name: 'firstName',
          displayName: 'First Name',
          description: 'Person\'s first name',
          dataType: 'string' as const,
          category: 'identity',
          isRequired: false,
          isStandard: true,
          tags: ['personal'],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockMappingRepository.find.mockResolvedValue(mockMappings);
      mockFieldRepository.find.mockResolvedValue(mockCatalogFields.map(f => ({
        ...f,
        tags: JSON.stringify(f.tags),
        createdAt: new Date(f.createdAt),
        updatedAt: new Date(f.updatedAt)
      })));

      (GlobalCatalogService.validateFieldValue as jest.Mock).mockReturnValue({
        isValid: true,
        errors: []
      });

      const result = await CatalogMappingService.transformDataToCatalog('source-1', sourceData);

      expect(result).toHaveLength(2);
      expect(result[0].catalogData).toEqual({ firstName: 'John' });
      expect(result[0].mappingInfo.mappedFields).toBe(1);
      expect(result[0].mappingInfo.totalFields).toBe(3);
      expect(result[0].mappingInfo.unmappedFields).toEqual(['last_name', 'email']);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockFieldRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(CatalogMappingService.getAllCatalogFields()).rejects.toThrow('Database error');
    });

    it('should handle JSON parsing errors in field data', async () => {
      const mockEntities = [
        {
          id: '1',
          name: 'test_field',
          displayName: 'Test Field',
          description: 'Test',
          dataType: 'string',
          category: 'test',
          isRequired: false,
          isStandard: false,
          validationRules: 'invalid json',
          tags: '["valid"]',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      mockFieldRepository.find.mockResolvedValue(mockEntities);

      await expect(CatalogMappingService.getAllCatalogFields()).rejects.toThrow();
    });
  });
});