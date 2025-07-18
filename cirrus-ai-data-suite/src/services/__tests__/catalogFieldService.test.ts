import { CatalogFieldService } from '../catalogFieldService';
import { CatalogField, FieldFormData } from '@/types/catalog';

// Mock fetch
global.fetch = jest.fn();

describe('CatalogFieldService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchFields', () => {
    it('should fetch fields successfully with fields property', async () => {
      const mockData = {
        fields: [
          { id: '1', name: 'field1' },
          { id: '2', name: 'field2' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await CatalogFieldService.fetchFields();

      expect(global.fetch).toHaveBeenCalledWith('/api/catalog/fields');
      expect(result).toEqual(mockData.fields);
    });

    it('should fetch fields successfully with direct array', async () => {
      const mockData = [
        { id: '1', name: 'field1' },
        { id: '2', name: 'field2' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await CatalogFieldService.fetchFields();

      expect(result).toEqual(mockData);
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(CatalogFieldService.fetchFields()).rejects.toThrow('Failed to fetch catalog fields');
    });
  });

  describe('createField', () => {
    it('should create field successfully', async () => {
      const formData: FieldFormData = {
        name: 'test_field',
        displayName: 'Test Field',
        description: 'Test description',
        dataType: 'string',
        category: 'custom',
        isRequired: false,
        tags: 'tag1, tag2',
        validationRules: {},
      };

      const mockResponse = { id: '1', ...formData, tags: ['tag1', 'tag2'] };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await CatalogFieldService.createField(formData);

      expect(global.fetch).toHaveBeenCalledWith('/api/catalog/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: ['tag1', 'tag2'],
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty tags', async () => {
      const formData: FieldFormData = {
        name: 'test_field',
        displayName: 'Test Field',
        description: '',
        dataType: 'string',
        category: 'custom',
        isRequired: false,
        tags: '',
        validationRules: {},
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1' }),
      });

      await CatalogFieldService.createField(formData);

      const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(callBody.tags).toEqual([]);
    });

    it('should handle server errors', async () => {
      const formData: FieldFormData = {
        name: 'test_field',
        displayName: 'Test Field',
        description: '',
        dataType: 'string',
        category: 'custom',
        isRequired: false,
        tags: '',
        validationRules: {},
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Duplicate field name' }),
      });

      await expect(CatalogFieldService.createField(formData)).rejects.toThrow('Duplicate field name');
    });
  });

  describe('updateField', () => {
    it('should update field successfully', async () => {
      const formData: FieldFormData = {
        name: 'updated_field',
        displayName: 'Updated Field',
        description: 'Updated description',
        dataType: 'number',
        category: 'standard',
        isRequired: true,
        tags: 'updated, new',
        validationRules: { minValue: 0 },
      };

      const mockResponse = { id: '1', ...formData, tags: ['updated', 'new'] };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await CatalogFieldService.updateField('1', formData);

      expect(global.fetch).toHaveBeenCalledWith('/api/catalog/fields/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: ['updated', 'new'],
        }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteField', () => {
    it('should delete field successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await CatalogFieldService.deleteField('1');

      expect(global.fetch).toHaveBeenCalledWith('/api/catalog/fields/1', {
        method: 'DELETE',
      });
    });

    it('should throw error on delete failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Cannot delete standard field' }),
      });

      await expect(CatalogFieldService.deleteField('1')).rejects.toThrow('Cannot delete standard field');
    });
  });

  describe('validateFieldData', () => {
    it('should return no errors for valid data', () => {
      const formData: FieldFormData = {
        name: 'valid_field',
        displayName: 'Valid Field',
        description: 'Valid description',
        dataType: 'string',
        category: 'custom',
        isRequired: false,
        tags: '',
        validationRules: {},
      };

      const errors = CatalogFieldService.validateFieldData(formData);
      expect(errors).toEqual([]);
    });

    it('should validate required fields', () => {
      const formData: FieldFormData = {
        name: '',
        displayName: '',
        description: '',
        dataType: '',
        category: '',
        isRequired: false,
        tags: '',
        validationRules: {},
      };

      const errors = CatalogFieldService.validateFieldData(formData);
      expect(errors).toContain('Field name is required');
      expect(errors).toContain('Display name is required');
      expect(errors).toContain('Data type is required');
      expect(errors).toContain('Category is required');
    });

    it('should validate field name format', () => {
      const formData: FieldFormData = {
        name: 'Invalid Name!',
        displayName: 'Valid',
        description: '',
        dataType: 'string',
        category: 'custom',
        isRequired: false,
        tags: '',
        validationRules: {},
      };

      const errors = CatalogFieldService.validateFieldData(formData);
      expect(errors).toContain('Field name must start with lowercase letter and contain only lowercase letters, numbers, and underscores');
    });

    it('should validate enum data type', () => {
      const formData: FieldFormData = {
        name: 'enum_field',
        displayName: 'Enum Field',
        description: '',
        dataType: 'enum',
        category: 'custom',
        isRequired: false,
        tags: '',
        validationRules: {
          enumValues: [],
        },
      };

      const errors = CatalogFieldService.validateFieldData(formData);
      expect(errors).toContain('Enum values are required for enum data type');
    });

    it('should validate field name starting with number', () => {
      const formData: FieldFormData = {
        name: '123_field',
        displayName: 'Number Start Field',
        description: '',
        dataType: 'string',
        category: 'custom',
        isRequired: false,
        tags: '',
        validationRules: {},
      };

      const errors = CatalogFieldService.validateFieldData(formData);
      expect(errors).toContain('Field name must start with lowercase letter and contain only lowercase letters, numbers, and underscores');
    });
  });

  describe('filterFields', () => {
    const mockFields: CatalogField[] = [
      {
        id: '1',
        name: 'custom_field',
        displayName: 'Custom Field',
        description: 'A custom field',
        dataType: 'string',
        category: 'custom_category',
        isRequired: false,
        isStandard: false,
        tags: ['test'],
        sortOrder: 1,
        validationRules: {},
      },
      {
        id: '2',
        name: 'standard_field',
        displayName: 'Standard Field',
        description: 'A standard field',
        dataType: 'number',
        category: 'standard_category',
        isRequired: true,
        isStandard: true,
        tags: ['standard'],
        sortOrder: 2,
        validationRules: {},
      },
    ];

    it('should return all fields when category is "all"', () => {
      const filtered = CatalogFieldService.filterFields(mockFields, 'all', '');
      expect(filtered).toEqual(mockFields);
    });

    it('should filter standard fields', () => {
      const filtered = CatalogFieldService.filterFields(mockFields, 'standard', '');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].isStandard).toBe(true);
    });

    it('should filter custom fields', () => {
      const filtered = CatalogFieldService.filterFields(mockFields, 'custom', '');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].isStandard).toBe(false);
    });

    it('should filter by category', () => {
      const filtered = CatalogFieldService.filterFields(mockFields, 'custom_category', '');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe('custom_category');
    });

    it('should filter by search term in name', () => {
      const filtered = CatalogFieldService.filterFields(mockFields, 'all', 'custom');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toContain('custom');
    });

    it('should filter by search term in display name', () => {
      const filtered = CatalogFieldService.filterFields(mockFields, 'all', 'Standard');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].displayName).toContain('Standard');
    });

    it('should filter by search term in description', () => {
      const filtered = CatalogFieldService.filterFields(mockFields, 'all', 'standard field');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].description).toContain('standard field');
    });

    it('should combine category and search filters', () => {
      const filtered = CatalogFieldService.filterFields(mockFields, 'standard', 'field');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].isStandard).toBe(true);
    });
  });
});