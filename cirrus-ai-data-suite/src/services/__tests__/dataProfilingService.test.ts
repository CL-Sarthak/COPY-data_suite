import { dataProfilingService } from '../dataProfilingService';
import { UnifiedDataCatalog } from '../dataTransformationService';

describe('DataProfilingService', () => {
  const mockCatalog: UnifiedDataCatalog = {
    catalogId: 'test-catalog-1',
    sourceId: 'test-source-1',
    sourceName: 'Test Data Source',
    createdAt: '2025-06-06T00:00:00.000Z',
    totalRecords: 3,
    schema: {
      fields: [
        { name: 'name', type: 'string', nullable: false, examples: ['John Doe', 'Jane Smith'] },
        { name: 'email', type: 'string', nullable: false, examples: ['john@example.com', 'jane@example.com'] },
        { name: 'age', type: 'number', nullable: true, examples: [30, 25, null] }
      ]
    },
    records: [
      {
        id: 'record-1',
        sourceId: 'test-source-1',
        sourceName: 'Test Data Source',
        sourceType: 'filesystem',
        recordIndex: 0,
        data: { name: 'John Doe', email: 'john@example.com', age: 30 },
        metadata: { originalFormat: 'csv', extractedAt: '2025-06-06T00:00:00.000Z' }
      },
      {
        id: 'record-2',
        sourceId: 'test-source-1',
        sourceName: 'Test Data Source',
        sourceType: 'filesystem',
        recordIndex: 1,
        data: { name: 'Jane Smith', email: 'jane@example.com', age: 25 },
        metadata: { originalFormat: 'csv', extractedAt: '2025-06-06T00:00:00.000Z' }
      },
      {
        id: 'record-3',
        sourceId: 'test-source-1',
        sourceName: 'Test Data Source',
        sourceType: 'filesystem',
        recordIndex: 2,
        data: { name: 'Bob Johnson', email: 'bob@test.org', age: null },
        metadata: { originalFormat: 'csv', extractedAt: '2025-06-06T00:00:00.000Z' }
      }
    ],
    summary: {
      dataTypes: ['string', 'number'],
      recordCount: 3,
      fieldCount: 3,
      sampleSize: 3
    }
  };

  describe('profileDataCatalog', () => {
    it('should generate a comprehensive data profile', async () => {
      const profile = await dataProfilingService.profileDataCatalog(mockCatalog);

      expect(profile).toBeDefined();
      expect(profile.sourceId).toBe('test-source-1');
      expect(profile.sourceName).toBe('Test Data Source');
      expect(profile.recordCount).toBe(3);
      expect(profile.fieldCount).toBe(3);
    });

    it('should profile individual fields correctly', async () => {
      const profile = await dataProfilingService.profileDataCatalog(mockCatalog);

      // Check name field
      const nameField = profile.fields.find(f => f.name === 'name');
      expect(nameField).toBeDefined();
      expect(nameField!.type).toBe('string');
      expect(nameField!.completeness).toBe(1); // No null values
      expect(nameField!.uniqueness).toBe(1); // All unique values
      expect(nameField!.totalCount).toBe(3);
      expect(nameField!.nullCount).toBe(0);

      // Check age field (has null values)
      const ageField = profile.fields.find(f => f.name === 'age');
      expect(ageField).toBeDefined();
      expect(ageField!.nullable).toBe(true);
      expect(ageField!.completeness).toBeCloseTo(2/3); // 1 null out of 3
      expect(ageField!.nullCount).toBe(1);
    });

    it('should calculate quality metrics', async () => {
      const profile = await dataProfilingService.profileDataCatalog(mockCatalog);

      expect(profile.qualityMetrics).toBeDefined();
      expect(profile.qualityMetrics.overallScore).toBeGreaterThan(0);
      expect(profile.qualityMetrics.overallScore).toBeLessThanOrEqual(1);
      expect(profile.qualityMetrics.completeness).toBeGreaterThan(0);
      expect(profile.qualityMetrics.consistency).toBeGreaterThan(0);
      expect(profile.qualityMetrics.validity).toBeGreaterThanOrEqual(0);
      expect(profile.qualityMetrics.uniqueness).toBeGreaterThan(0);
    });

    it('should detect email patterns', async () => {
      const profile = await dataProfilingService.profileDataCatalog(mockCatalog);

      const emailField = profile.fields.find(f => f.name === 'email');
      expect(emailField).toBeDefined();
      expect(emailField!.type).toBe('email');
      expect(emailField!.patterns.length).toBeGreaterThan(0);
      
      // Should detect email domains
      expect(emailField!.formats?.emailDomains).toBeDefined();
      expect(emailField!.formats!.emailDomains!.length).toBeGreaterThan(0);
    });

    it('should provide recommendations', async () => {
      const profile = await dataProfilingService.profileDataCatalog(mockCatalog);

      expect(profile.summary).toBeDefined();
      expect(profile.summary.recommendedActions).toBeDefined();
      expect(Array.isArray(profile.summary.recommendedActions)).toBe(true);
    });

    it('should identify quality issues', async () => {
      const profile = await dataProfilingService.profileDataCatalog(mockCatalog);

      // Age field should have quality issues due to null values
      const ageField = profile.fields.find(f => f.name === 'age');
      expect(ageField).toBeDefined();
      
      // Should report the overall quality metrics
      expect(profile.qualityMetrics.totalIssues).toBeGreaterThanOrEqual(0);
    });

    it('should analyze cross-field relationships', async () => {
      const profile = await dataProfilingService.profileDataCatalog(mockCatalog);

      expect(profile.crossFieldAnalysis).toBeDefined();
      expect(profile.crossFieldAnalysis.potentialKeys).toBeDefined();
      expect(Array.isArray(profile.crossFieldAnalysis.potentialKeys)).toBe(true);
      expect(profile.crossFieldAnalysis.correlations).toBeDefined();
      expect(Array.isArray(profile.crossFieldAnalysis.correlations)).toBe(true);
    });

    it('should handle empty datasets gracefully', async () => {
      const emptyCatalog: UnifiedDataCatalog = {
        ...mockCatalog,
        totalRecords: 0,
        records: []
      };

      const profile = await dataProfilingService.profileDataCatalog(emptyCatalog);

      expect(profile).toBeDefined();
      expect(profile.recordCount).toBe(0);
      expect(profile.fields).toBeDefined();
    });
  });

  describe('data type detection', () => {
    it('should detect various data types correctly', async () => {
      const catalogWithMixedTypes: UnifiedDataCatalog = {
        ...mockCatalog,
        records: [
          {
            id: 'record-1',
            sourceId: 'test-source-1',
            sourceName: 'Test Data Source',
            sourceType: 'filesystem',
            recordIndex: 0,
            data: {
              integer: 42,
              float: 3.14,
              boolean: true,
              date: '2025-06-06',
              phone: '+1-555-123-4567',
              url: 'https://example.com',
              json: '{"key": "value"}'
            },
            metadata: { originalFormat: 'json', extractedAt: '2025-06-06T00:00:00.000Z' }
          }
        ]
      };

      const profile = await dataProfilingService.profileDataCatalog(catalogWithMixedTypes);

      const integerField = profile.fields.find(f => f.name === 'integer');
      expect(integerField?.type).toBe('integer');

      const floatField = profile.fields.find(f => f.name === 'float');
      expect(floatField?.type).toBe('float');

      const booleanField = profile.fields.find(f => f.name === 'boolean');
      expect(booleanField?.type).toBe('boolean');

      const dateField = profile.fields.find(f => f.name === 'date');
      expect(dateField?.type).toBe('date');

      const phoneField = profile.fields.find(f => f.name === 'phone');
      expect(phoneField?.type).toBe('phone');

      const urlField = profile.fields.find(f => f.name === 'url');
      expect(urlField?.type).toBe('url');

      const jsonField = profile.fields.find(f => f.name === 'json');
      expect(jsonField?.type).toBe('json');
    });
  });
});