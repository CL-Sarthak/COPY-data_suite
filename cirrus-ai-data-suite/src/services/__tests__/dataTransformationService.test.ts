import { DataTransformationService } from '../dataTransformationService';

describe('DataTransformationService', () => {
  describe('convertToUnifiedFormat', () => {
    it('should convert field-mapped data to unified format', async () => {
      const fieldMappedData = [
        {
          catalogData: { firstName: 'John', email: 'john@example.com' },
          sourceData: { first_name: 'John', email: 'john@example.com', age: 30 },
          mappingInfo: {
            mappedFields: 2,
            totalFields: 3,
            unmappedFields: ['age'],
            validationErrors: []
          }
        },
        {
          catalogData: { firstName: 'Jane', email: 'jane@example.com' },
          sourceData: { first_name: 'Jane', email: 'jane@example.com', age: 25 },
          mappingInfo: {
            mappedFields: 2,
            totalFields: 3,
            unmappedFields: ['age'],
            validationErrors: []
          }
        }
      ];

      const result = await DataTransformationService.convertToUnifiedFormat(fieldMappedData);

      expect(result.totalRecords).toBe(2);
      expect(result.records).toHaveLength(2);
      expect(result.records[0].data).toEqual({ firstName: 'John', email: 'john@example.com' });
      expect(result.records[1].data).toEqual({ firstName: 'Jane', email: 'jane@example.com' });
      expect(result.metadata?.source).toBe('catalog_mapping');
      expect(result.metadata?.mappedFields).toBe(2);
      expect(result.metadata?.totalSourceFields).toBe(3);
      expect(result.metadata?.unmappedFields).toEqual(['age']);
    });

    it('should handle empty field-mapped data', async () => {
      const result = await DataTransformationService.convertToUnifiedFormat([]);

      expect(result.totalRecords).toBe(0);
      expect(result.records).toHaveLength(0);
      expect(result.metadata?.source).toBe('catalog_mapping');
      expect(result.metadata?.mappedFields).toBe(0);
    });

    it('should aggregate validation errors from multiple records', async () => {
      const fieldMappedData = [
        {
          catalogData: { firstName: 'John' },
          sourceData: { first_name: 'John', invalid_email: 'not-email' },
          mappingInfo: {
            mappedFields: 1,
            totalFields: 2,
            unmappedFields: [],
            validationErrors: [
              { field: 'email', errors: ['Invalid email format'] }
            ]
          }
        },
        {
          catalogData: { firstName: 'Jane' },
          sourceData: { first_name: 'Jane', invalid_phone: '123' },
          mappingInfo: {
            mappedFields: 1,
            totalFields: 2,
            unmappedFields: [],
            validationErrors: [
              { field: 'phone', errors: ['Invalid phone format'] }
            ]
          }
        }
      ];

      const result = await DataTransformationService.convertToUnifiedFormat(fieldMappedData);

      expect(result.metadata?.validationErrors).toHaveLength(2);
      expect(result.metadata?.validationErrors?.[0].field).toBe('email');
      expect(result.metadata?.validationErrors?.[1].field).toBe('phone');
    });

    it('should calculate correct statistics for mixed mapping success', async () => {
      const fieldMappedData = [
        {
          catalogData: { firstName: 'John', email: 'john@example.com' },
          sourceData: { first_name: 'John', email: 'john@example.com', age: 30 },
          mappingInfo: {
            mappedFields: 2,
            totalFields: 3,
            unmappedFields: ['age'],
            validationErrors: []
          }
        },
        {
          catalogData: { firstName: 'Jane' },
          sourceData: { first_name: 'Jane', invalid_email: 'bad-email', age: 25 },
          mappingInfo: {
            mappedFields: 1,
            totalFields: 3,
            unmappedFields: ['age'],
            validationErrors: [
              { field: 'email', errors: ['Invalid email format'] }
            ]
          }
        }
      ];

      const result = await DataTransformationService.convertToUnifiedFormat(fieldMappedData);

      expect(result.metadata?.mappedFields).toBe(2); // Average: (2+1)/2 = 1.5, rounded to 2
      expect(result.metadata?.totalSourceFields).toBe(3);
      expect(result.metadata?.unmappedFields).toEqual(['age']);
      expect(result.metadata?.validationErrors).toHaveLength(1);
    });
  });

  describe('detectDataFormat', () => {
    it('should detect UnifiedDataCatalog format', () => {
      const unifiedData = {
        totalRecords: 100,
        records: [
          { data: { name: 'John', email: 'john@example.com' } }
        ],
        schema: {
          fields: [
            { name: 'name', type: 'string' },
            { name: 'email', type: 'string' }
          ]
        }
      };

      const format = DataTransformationService.detectDataFormat(unifiedData);
      expect(format).toBe('UnifiedDataCatalog');
    });

    it('should detect field-mapped array format', () => {
      const fieldMappedData = [
        {
          catalogData: { name: 'John' },
          sourceData: { first_name: 'John' },
          mappingInfo: {
            mappedFields: 1,
            totalFields: 1,
            unmappedFields: [],
            validationErrors: []
          }
        }
      ];

      const format = DataTransformationService.detectDataFormat(fieldMappedData);
      expect(format).toBe('FieldMappedArray');
    });

    it('should detect raw array format', () => {
      const rawData = [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' }
      ];

      const format = DataTransformationService.detectDataFormat(rawData);
      expect(format).toBe('RawArray');
    });

    it('should return unknown for invalid formats', () => {
      const invalidData = 'not an object or array';

      const format = DataTransformationService.detectDataFormat(invalidData);
      expect(format).toBe('Unknown');
    });

    it('should handle null and undefined data', () => {
      expect(DataTransformationService.detectDataFormat(null)).toBe('Unknown');
      expect(DataTransformationService.detectDataFormat(undefined)).toBe('Unknown');
    });

    it('should handle empty arrays', () => {
      const format = DataTransformationService.detectDataFormat([]);
      expect(format).toBe('RawArray');
    });
  });

  describe('getRecordCount', () => {
    it('should return correct count for UnifiedDataCatalog format', () => {
      const unifiedData = {
        totalRecords: 100,
        records: [
          { data: { name: 'John' } },
          { data: { name: 'Jane' } }
        ]
      };

      const count = DataTransformationService.getRecordCount(unifiedData);
      expect(count).toBe(100);
    });

    it('should return array length for field-mapped data', () => {
      const fieldMappedData = [
        { catalogData: {}, sourceData: {}, mappingInfo: {} },
        { catalogData: {}, sourceData: {}, mappingInfo: {} },
        { catalogData: {}, sourceData: {}, mappingInfo: {} }
      ];

      const count = DataTransformationService.getRecordCount(fieldMappedData);
      expect(count).toBe(3);
    });

    it('should return array length for raw data', () => {
      const rawData = [
        { name: 'John' },
        { name: 'Jane' },
        { name: 'Bob' }
      ];

      const count = DataTransformationService.getRecordCount(rawData);
      expect(count).toBe(3);
    });

    it('should return 0 for unknown formats', () => {
      const count = DataTransformationService.getRecordCount('invalid data');
      expect(count).toBe(0);
    });

    it('should handle empty data gracefully', () => {
      expect(DataTransformationService.getRecordCount([])).toBe(0);
      expect(DataTransformationService.getRecordCount(null)).toBe(0);
      expect(DataTransformationService.getRecordCount(undefined)).toBe(0);
    });
  });

  describe('extractSampleRecords', () => {
    it('should extract sample records from UnifiedDataCatalog format', () => {
      const unifiedData = {
        totalRecords: 100,
        records: [
          { data: { name: 'John' } },
          { data: { name: 'Jane' } },
          { data: { name: 'Bob' } }
        ]
      };

      const samples = DataTransformationService.extractSampleRecords(unifiedData, 2);
      expect(samples).toHaveLength(2);
      expect(samples[0]).toEqual({ name: 'John' });
      expect(samples[1]).toEqual({ name: 'Jane' });
    });

    it('should extract sample records from field-mapped data', () => {
      const fieldMappedData = [
        {
          catalogData: { firstName: 'John' },
          sourceData: { first_name: 'John' },
          mappingInfo: {}
        },
        {
          catalogData: { firstName: 'Jane' },
          sourceData: { first_name: 'Jane' },
          mappingInfo: {}
        }
      ];

      const samples = DataTransformationService.extractSampleRecords(fieldMappedData, 1);
      expect(samples).toHaveLength(1);
      expect(samples[0]).toEqual({ firstName: 'John' });
    });

    it('should extract sample records from raw array', () => {
      const rawData = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
        { name: 'Bob', age: 35 }
      ];

      const samples = DataTransformationService.extractSampleRecords(rawData, 2);
      expect(samples).toHaveLength(2);
      expect(samples[0]).toEqual({ name: 'John', age: 30 });
      expect(samples[1]).toEqual({ name: 'Jane', age: 25 });
    });

    it('should return empty array for unknown formats', () => {
      const samples = DataTransformationService.extractSampleRecords('invalid data', 5);
      expect(samples).toEqual([]);
    });

    it('should handle requests for more samples than available', () => {
      const rawData = [
        { name: 'John' },
        { name: 'Jane' }
      ];

      const samples = DataTransformationService.extractSampleRecords(rawData, 5);
      expect(samples).toHaveLength(2);
    });

    it('should handle zero or negative sample counts', () => {
      const rawData = [{ name: 'John' }];

      expect(DataTransformationService.extractSampleRecords(rawData, 0)).toEqual([]);
      expect(DataTransformationService.extractSampleRecords(rawData, -1)).toEqual([]);
    });
  });

  describe('validateTransformedData', () => {
    it('should validate correct UnifiedDataCatalog format', () => {
      const unifiedData = {
        totalRecords: 2,
        records: [
          { data: { name: 'John' } },
          { data: { name: 'Jane' } }
        ],
        schema: {
          fields: [
            { name: 'name', type: 'string' }
          ]
        }
      };

      const result = DataTransformationService.validateTransformedData(unifiedData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing required properties in UnifiedDataCatalog', () => {
      const invalidData = {
        records: [{ data: { name: 'John' } }]
        // Missing totalRecords
      };

      const result = DataTransformationService.validateTransformedData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing totalRecords property');
    });

    it('should validate field-mapped array format', () => {
      const fieldMappedData = [
        {
          catalogData: { name: 'John' },
          sourceData: { first_name: 'John' },
          mappingInfo: {
            mappedFields: 1,
            totalFields: 1,
            unmappedFields: [],
            validationErrors: []
          }
        }
      ];

      const result = DataTransformationService.validateTransformedData(fieldMappedData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect invalid field-mapped data structure', () => {
      const invalidFieldMappedData = [
        {
          catalogData: { name: 'John' },
          // Missing sourceData and mappingInfo
        }
      ];

      const result = DataTransformationService.validateTransformedData(invalidFieldMappedData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate raw array format as valid', () => {
      const rawData = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ];

      const result = DataTransformationService.validateTransformedData(rawData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject completely invalid data types', () => {
      const result = DataTransformationService.validateTransformedData('invalid string data');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Data must be an object or array');
    });

    it('should handle null and undefined data', () => {
      expect(DataTransformationService.validateTransformedData(null).isValid).toBe(false);
      expect(DataTransformationService.validateTransformedData(undefined).isValid).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle malformed field-mapped data gracefully', async () => {
      const malformedData = [
        {
          catalogData: null as any, // Testing error handling
          sourceData: { name: 'John' },
          mappingInfo: {
            mappedFields: 1,
            totalFields: 1,
            unmappedFields: [],
            validationErrors: []
          }
        }
      ] as any;

      const result = await DataTransformationService.convertToUnifiedFormat(malformedData);
      expect(result.totalRecords).toBe(1);
      expect(result.records[0].data).toEqual({});
    });

    it('should handle missing mapping info properties', async () => {
      const incompleteData = [
        {
          catalogData: { name: 'John' },
          sourceData: { name: 'John' },
          mappingInfo: {
            mappedFields: 1
            // Missing other properties
          } as any
        }
      ] as any;

      const result = await DataTransformationService.convertToUnifiedFormat(incompleteData);
      expect(result.totalRecords).toBe(1);
      expect(result.metadata?.unmappedFields).toEqual([]);
      expect(result.metadata?.validationErrors).toEqual([]);
    });
  });
});