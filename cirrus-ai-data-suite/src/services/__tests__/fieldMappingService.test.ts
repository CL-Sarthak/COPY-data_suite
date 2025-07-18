import { FieldMappingService } from '../fieldMappingService';
import { NewFieldFormData } from '@/types/fieldMapping';

// Mock fetch
global.fetch = jest.fn();

describe('FieldMappingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFieldName', () => {
    it('should accept valid field names', () => {
      expect(FieldMappingService.validateFieldName('valid_field')).toBeNull();
      expect(FieldMappingService.validateFieldName('field123')).toBeNull();
      expect(FieldMappingService.validateFieldName('customer_email_address')).toBeNull();
    });

    it('should reject invalid field names', () => {
      expect(FieldMappingService.validateFieldName(''))
        .toBe('Field name is required');
      expect(FieldMappingService.validateFieldName('UpperCase'))
        .toBe('Field name must start with lowercase letter and contain only lowercase letters, numbers, and underscores');
      expect(FieldMappingService.validateFieldName('123field'))
        .toBe('Field name must start with lowercase letter and contain only lowercase letters, numbers, and underscores');
      expect(FieldMappingService.validateFieldName('field-name'))
        .toBe('Field name must start with lowercase letter and contain only lowercase letters, numbers, and underscores');
      expect(FieldMappingService.validateFieldName('field name'))
        .toBe('Field name must start with lowercase letter and contain only lowercase letters, numbers, and underscores');
    });
  });

  describe('formatConfidence', () => {
    it('should format confidence values correctly', () => {
      expect(FieldMappingService.formatConfidence(0.95)).toBe('95%');
      expect(FieldMappingService.formatConfidence(0.5)).toBe('50%');
      expect(FieldMappingService.formatConfidence(1)).toBe('100%');
      expect(FieldMappingService.formatConfidence(0)).toBe('0%');
    });
  });

  describe('getConfidenceColor', () => {
    it('should return correct color classes based on confidence', () => {
      expect(FieldMappingService.getConfidenceColor(0.9))
        .toBe('text-green-600 bg-green-100');
      expect(FieldMappingService.getConfidenceColor(0.7))
        .toBe('text-yellow-600 bg-yellow-100');
      expect(FieldMappingService.getConfidenceColor(0.6))
        .toBe('text-red-600 bg-red-100');
      expect(FieldMappingService.getConfidenceColor(0.4))
        .toBe('text-red-600 bg-red-100');
      expect(FieldMappingService.getConfidenceColor(0.2))
        .toBe('text-red-600 bg-red-100');
    });
  });

  describe('loadCatalogData', () => {
    it('should load catalog fields and categories', async () => {
      const mockResponse = {
        fields: [
          { id: '1', name: 'email', displayName: 'Email' },
          { id: '2', name: 'phone', displayName: 'Phone' }
        ],
        categories: [
          { id: '1', name: 'contact', displayName: 'Contact' },
          { id: '2', name: 'personal', displayName: 'Personal' }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await FieldMappingService.loadCatalogData();
      
      expect(fetch).toHaveBeenCalledWith('/api/catalog/fields');
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on failed response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });

      await expect(FieldMappingService.loadCatalogData())
        .rejects.toThrow('Failed to load catalog fields');
    });
  });

  describe('loadMappings', () => {
    it('should load mappings for a source', async () => {
      const mockMappings = [
        { id: '1', sourceFieldName: 'email', catalogFieldId: 'field1' },
        { id: '2', sourceFieldName: 'phone', catalogFieldId: 'field2' }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mappings: mockMappings })
      });

      const result = await FieldMappingService.loadMappings('source123');
      
      expect(fetch).toHaveBeenCalledWith('/api/catalog/mappings?sourceId=source123');
      expect(result).toEqual(mockMappings);
    });
  });

  describe('generateSuggestions', () => {
    it('should generate mapping suggestions', async () => {
      const mockSuggestions = [
        {
          sourceFieldName: 'customer_email',
          suggestedMappings: [
            {
              field: { id: '1', name: 'email', displayName: 'Email' },
              confidence: 0.9,
              reason: 'Field name similarity'
            }
          ]
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ suggestions: mockSuggestions })
      });

      const result = await FieldMappingService.generateSuggestions('source123', ['customer_email']);
      
      expect(fetch).toHaveBeenCalledWith('/api/catalog/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'source123',
          sourceFields: ['customer_email']
        })
      });
      expect(result).toEqual(mockSuggestions);
    });
  });

  describe('updateMapping', () => {
    it('should create new mapping', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await FieldMappingService.updateMapping('source123', 'email', 'field1');
      
      expect(fetch).toHaveBeenCalledWith('/api/catalog/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'source123',
          sourceFieldName: 'email',
          catalogFieldId: 'field1',
          isManual: true,
          confidence: 1
        })
      });
    });

    it('should remove mapping when catalogFieldId is null', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await FieldMappingService.updateMapping('source123', 'email', null);
      
      expect(fetch).toHaveBeenCalledWith('/api/catalog/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'source123',
          sourceFieldName: 'email',
          catalogFieldId: null,
          isManual: true,
          confidence: 1
        })
      });
    });
  });

  describe('createField', () => {
    it('should create new catalog field', async () => {
      const newFieldData: NewFieldFormData = {
        name: 'new_field',
        displayName: 'New Field',
        description: 'A new field',
        dataType: 'string',
        category: 'custom',
        tags: 'tag1,tag2',
        isRequired: false
      };

      const mockResponse = {
        id: '123',
        ...newFieldData,
        tags: ['tag1', 'tag2']
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await FieldMappingService.createField(newFieldData);
      
      expect(fetch).toHaveBeenCalledWith('/api/catalog/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newFieldData,
          tags: ['tag1', 'tag2']
        })
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty tags', async () => {
      const newFieldData: NewFieldFormData = {
        name: 'new_field',
        displayName: 'New Field',
        description: '',
        dataType: 'string',
        category: 'custom',
        tags: '',
        isRequired: false
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' })
      });

      await FieldMappingService.createField(newFieldData);
      
      const call = (fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.tags).toEqual([]);
    });
  });

  describe('applyMappings', () => {
    it('should apply field mappings and transform data', async () => {
      const mockResult = {
        success: true,
        message: 'Transformation completed',
        transformedRecords: 100,
        fieldsMapped: 5,
        errors: [],
        warnings: []
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult
      });

      const result = await FieldMappingService.applyMappings('source123');
      
      expect(fetch).toHaveBeenCalledWith('/api/data-sources/source123/transform/apply-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forceRetransform: false,
          validateOnly: false,
          includeValidationDetails: true
        })
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('exportMappedData', () => {
    it('should export data as JSON', async () => {
      const mockData = { field1: 'value1' };
      const blob = new Blob([JSON.stringify(mockData)], { type: 'application/json' });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: async () => blob
      });

      const result = await FieldMappingService.exportMappedData('source123', 'json');
      
      expect(fetch).toHaveBeenCalledWith('/api/data-sources/source123/export?format=json');
      expect(result).toBeInstanceOf(Blob);
    });

    it('should export data as CSV', async () => {
      const mockCsv = 'field1,field2\nvalue1,value2';
      const blob = new Blob([mockCsv], { type: 'text/csv' });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: async () => blob
      });

      const result = await FieldMappingService.exportMappedData('source123', 'csv');
      
      expect(fetch).toHaveBeenCalledWith('/api/data-sources/source123/export?format=csv');
      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('applyAllSuggestions', () => {
    it('should apply all high confidence suggestions', async () => {
      const suggestions = [
        {
          sourceFieldName: 'email',
          suggestedMappings: [
            {
              field: { id: '1', name: 'email' },
              confidence: 0.9,
              reason: 'High confidence'
            }
          ]
        },
        {
          sourceFieldName: 'phone',
          suggestedMappings: [
            {
              field: { id: '2', name: 'phone' },
              confidence: 0.5,
              reason: 'Low confidence'
            }
          ]
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await FieldMappingService.applyAllSuggestions('source123', suggestions);
      
      expect(fetch).toHaveBeenCalledWith('/api/catalog/mappings/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'source123',
          mappings: [
            {
              sourceFieldName: 'email',
              catalogFieldId: '1',
              confidence: 0.9
            }
          ]
        })
      });
    });

    it('should not apply low confidence suggestions', async () => {
      const suggestions = [
        {
          sourceFieldName: 'phone',
          suggestedMappings: [
            {
              field: { id: '2', name: 'phone' },
              confidence: 0.5,
              reason: 'Low confidence'
            }
          ]
        }
      ];

      // Since confidence is below 0.7 threshold, no API call should be made
      await FieldMappingService.applyAllSuggestions('source123', suggestions);
      
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});