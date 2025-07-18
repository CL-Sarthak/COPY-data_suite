import { DataSourceService } from '@/services/dataSourceService';
import { DataTransformationService } from '@/services/dataTransformationService';
import { PatternService } from '@/services/patternService';
import { SessionService } from '@/services/sessionService';
import { FieldMappingService } from '@/services/fieldMappingService';
import { CatalogFieldService } from '@/services/catalogFieldService';
import { CatalogCategoryService } from '@/services/catalogCategoryService';
import { getDatabase } from '@/database/connection';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { PatternEntity } from '@/entities/PatternEntity';
import { SensitivePattern } from '@/types';

describe('Data Export Integration', () => {
  let connection: any;
  let testDataSourceId: string;
  let testSessionId: string;
  
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    connection = await getDatabase();
    await connection.runMigrations();
  });
  
  afterAll(async () => {
    if (connection && connection.isInitialized) {
      await connection.destroy();
    }
  });
  
  beforeEach(async () => {
    // Clear data between tests
    await connection.getRepository(DataSourceEntity).delete({});
    await connection.getRepository(PatternEntity).delete({});
    
    // Create test session
    const session = await SessionService.createSession({
      name: 'Export Test Session',
      type: 'data-export'
    });
    testSessionId = session.id;
    
    // Create test data source with PII
    const csvContent = `id,name,email,ssn,phone,salary
1,John Doe,john@example.com,123-45-6789,(555) 123-4567,75000
2,Jane Smith,jane@example.com,987-65-4321,(555) 987-6543,85000
3,Bob Johnson,bob@example.com,456-78-9012,(555) 456-7890,65000`;
    
    const dataSource = await DataSourceService.createDataSource({
      name: 'employees.csv',
      type: 'csv',
      content: csvContent,
      size: csvContent.length,
      contentTruncated: false
    });
    testDataSourceId = dataSource.id;
  });
  
  describe('Complete Export Flow', () => {
    it('should export transformed data with redaction', async () => {
      // Step 1: Create redaction patterns
      const patterns: SensitivePattern[] = [
        {
          id: 'ssn-pattern',
          label: 'SSN',
          type: 'PII',
          color: 'bg-red-100 text-red-900',
          examples: ['123-45-6789'],
          regex: '\\d{3}-\\d{2}-\\d{4}'
        },
        {
          id: 'email-pattern',
          label: 'Email',
          type: 'PII',
          color: 'bg-blue-100 text-blue-900',
          examples: ['john@example.com'],
          regex: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'
        }
      ];
      
      await Promise.all(
        patterns.map(pattern =>
          PatternService.createPattern({
            ...pattern,
            sessionId: testSessionId
          })
        )
      );
      
      // Step 2: Transform with redaction
      const transformOptions = {
        applyRedaction: true,
        redactionPatterns: patterns,
        redactionMethod: 'mask' as const
      };
      
      const transformedData = await DataTransformationService.transformDataSource(
        testDataSourceId,
        transformOptions
      );
      
      // Verify redaction was applied
      expect(transformedData.records[0].data.ssn).toBe('XXX-XX-XXXX');
      expect(transformedData.records[0].data.email).toMatch(/\*+@/);
      expect(transformedData.records[0].data.name).toBe('John Doe'); // Not redacted
      
      // Step 3: Export to CSV
      const exportResult = await DataTransformationService.exportTransformedData(
        testDataSourceId,
        transformedData,
        'csv'
      );
      
      expect(exportResult.format).toBe('csv');
      expect(exportResult.content).toBeDefined();
      
      // Verify CSV content
      const lines = exportResult.content.split('\n');
      expect(lines[0]).toBe('id,name,email,ssn,phone,salary'); // Headers
      expect(lines[1]).toContain('XXX-XX-XXXX'); // Redacted SSN
      expect(lines[1]).toMatch(/\*+@/); // Redacted email
    });
    
    it('should export with field mapping applied', async () => {
      // Create catalog structure
      const category = await CatalogCategoryService.createCategory({
        name: 'Employee Data',
        description: 'Employee information'
      });
      
      const catalogFields = await Promise.all([
        CatalogFieldService.createField({
          name: 'Employee Name',
          standardName: 'employee_name',
          dataType: 'string',
          categoryId: category.id
        }),
        CatalogFieldService.createField({
          name: 'Contact Email',
          standardName: 'contact_email',
          dataType: 'string',
          isPii: true,
          categoryId: category.id
        })
      ]);
      
      // Create field mappings
      await FieldMappingService.createMapping({
        sourceId: testDataSourceId,
        sourceField: 'name',
        catalogFieldId: catalogFields[0].id,
        transformRules: []
      });
      
      await FieldMappingService.createMapping({
        sourceId: testDataSourceId,
        sourceField: 'email',
        catalogFieldId: catalogFields[1].id,
        transformRules: []
      });
      
      // Transform with field mapping
      const transformedData = await DataTransformationService.applyMappings(
        testDataSourceId,
        { applyFieldMapping: true }
      );
      
      // Export to JSON
      const exportResult = await DataTransformationService.exportTransformedData(
        testDataSourceId,
        transformedData,
        'json'
      );
      
      const jsonData = JSON.parse(exportResult.content);
      expect(jsonData[0]).toHaveProperty('employee_name');
      expect(jsonData[0]).toHaveProperty('contact_email');
      expect(jsonData[0].employee_name).toBe('John Doe');
    });
    
    it('should handle large dataset export with streaming', async () => {
      // Create large dataset
      const records = [];
      for (let i = 0; i < 10000; i++) {
        records.push(`${i},User${i},user${i}@example.com,${String(i).padStart(3, '0')}-45-6789,(555) ${String(i).padStart(3, '0')}-4567,${50000 + i * 1000}`);
      }
      
      const largeContent = 'id,name,email,ssn,phone,salary\n' + records.join('\n');
      
      const largeDataSource = await DataSourceService.createDataSource({
        name: 'large-dataset.csv',
        type: 'csv',
        content: largeContent,
        size: largeContent.length,
        contentTruncated: false
      });
      
      // Transform with pagination
      const pageSize = 1000;
      let allRecords = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const pageData = await DataTransformationService.transformDataSource(
          largeDataSource.id,
          { page, pageSize }
        );
        
        allRecords = allRecords.concat(pageData.records);
        hasMore = pageData.records.length === pageSize;
        page++;
      }
      
      expect(allRecords).toHaveLength(10000);
      
      // Export in chunks
      const chunkSize = 2000;
      const exportChunks = [];
      
      for (let i = 0; i < allRecords.length; i += chunkSize) {
        const chunk = {
          records: allRecords.slice(i, i + chunkSize),
          fields: ['id', 'name', 'email', 'ssn', 'phone', 'salary']
        };
        
        const chunkExport = await DataTransformationService.exportTransformedData(
          largeDataSource.id,
          chunk,
          'csv'
        );
        
        exportChunks.push(chunkExport.content);
      }
      
      expect(exportChunks).toHaveLength(5); // 10000 / 2000
    });
    
    it('should export with multiple transformation options', async () => {
      // Create patterns for different redaction methods
      const patterns: SensitivePattern[] = [
        {
          id: 'ssn-hash',
          label: 'SSN',
          type: 'PII',
          color: 'bg-red-100 text-red-900',
          examples: ['123-45-6789'],
          regex: '\\d{3}-\\d{2}-\\d{4}'
        },
        {
          id: 'email-partial',
          label: 'Email',
          type: 'PII', 
          color: 'bg-blue-100 text-blue-900',
          examples: ['john@example.com'],
          regex: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'
        },
        {
          id: 'phone-remove',
          label: 'Phone',
          type: 'PII',
          color: 'bg-green-100 text-green-900',
          examples: ['(555) 123-4567'],
          regex: '\\(\\d{3}\\)\\s*\\d{3}-\\d{4}'
        }
      ];
      
      // Transform with different redaction methods
      const transformedHash = await DataTransformationService.transformDataSource(
        testDataSourceId,
        {
          applyRedaction: true,
          redactionPatterns: [patterns[0]],
          redactionMethod: 'hash'
        }
      );
      
      const transformedPartial = await DataTransformationService.transformDataSource(
        testDataSourceId,
        {
          applyRedaction: true,
          redactionPatterns: [patterns[1]],
          redactionMethod: 'partial'
        }
      );
      
      const transformedRemove = await DataTransformationService.transformDataSource(
        testDataSourceId,
        {
          applyRedaction: true,
          redactionPatterns: [patterns[2]],
          redactionMethod: 'remove'
        }
      );
      
      // Verify different redaction methods
      expect(transformedHash.records[0].data.ssn).toMatch(/^[a-f0-9]{8}$/); // Hash
      expect(transformedPartial.records[0].data.email).toMatch(/j\*+@e\*+\.com/); // Partial
      expect(transformedRemove.records[0].data.phone).toBe('[REDACTED]'); // Remove
      
      // Export combined transformations
      const combinedData = {
        records: transformedHash.records.map((record, index) => ({
          ...record,
          data: {
            ...record.data,
            email: transformedPartial.records[index].data.email,
            phone: transformedRemove.records[index].data.phone
          }
        })),
        fields: transformedHash.fields
      };
      
      const exportResult = await DataTransformationService.exportTransformedData(
        testDataSourceId,
        combinedData,
        'json'
      );
      
      const jsonData = JSON.parse(exportResult.content);
      expect(jsonData[0].ssn).toMatch(/^[a-f0-9]{8}$/);
      expect(jsonData[0].email).toMatch(/j\*+@e\*+\.com/);
      expect(jsonData[0].phone).toBe('[REDACTED]');
    });
  });
  
  describe('Export Formats', () => {
    it('should export to different formats correctly', async () => {
      const transformedData = await DataTransformationService.transformDataSource(
        testDataSourceId
      );
      
      // Export to CSV
      const csvExport = await DataTransformationService.exportTransformedData(
        testDataSourceId,
        transformedData,
        'csv'
      );
      
      expect(csvExport.format).toBe('csv');
      expect(csvExport.mimeType).toBe('text/csv');
      expect(csvExport.content).toContain('id,name,email');
      
      // Export to JSON
      const jsonExport = await DataTransformationService.exportTransformedData(
        testDataSourceId,
        transformedData,
        'json'
      );
      
      expect(jsonExport.format).toBe('json');
      expect(jsonExport.mimeType).toBe('application/json');
      const jsonData = JSON.parse(jsonExport.content);
      expect(Array.isArray(jsonData)).toBe(true);
      expect(jsonData).toHaveLength(3);
      
      // Export to Excel (mock)
      const excelExport = await DataTransformationService.exportTransformedData(
        testDataSourceId,
        transformedData,
        'xlsx'
      );
      
      expect(excelExport.format).toBe('xlsx');
      expect(excelExport.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
    
    it('should preserve data types in exports', async () => {
      // Create data with various types
      const jsonContent = JSON.stringify([
        {
          id: 1,
          name: 'Test User',
          active: true,
          score: 95.5,
          tags: ['admin', 'user'],
          metadata: { created: '2024-01-01', updated: '2024-01-15' }
        }
      ]);
      
      const jsonDataSource = await DataSourceService.createDataSource({
        name: 'typed-data.json',
        type: 'json',
        content: jsonContent,
        size: jsonContent.length,
        contentTruncated: false
      });
      
      const transformed = await DataTransformationService.transformDataSource(
        jsonDataSource.id
      );
      
      // Export and verify types preserved
      const exportResult = await DataTransformationService.exportTransformedData(
        jsonDataSource.id,
        transformed,
        'json'
      );
      
      const exported = JSON.parse(exportResult.content);
      expect(typeof exported[0].id).toBe('number');
      expect(typeof exported[0].active).toBe('boolean');
      expect(typeof exported[0].score).toBe('number');
      expect(Array.isArray(exported[0].tags)).toBe(true);
      expect(typeof exported[0].metadata).toBe('object');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle export failures gracefully', async () => {
      // Try to export non-existent data source
      await expect(
        DataTransformationService.exportTransformedData(
          'non-existent-id',
          { records: [], fields: [] },
          'csv'
        )
      ).rejects.toThrow();
    });
    
    it('should validate export format', async () => {
      const transformed = await DataTransformationService.transformDataSource(
        testDataSourceId
      );
      
      await expect(
        DataTransformationService.exportTransformedData(
          testDataSourceId,
          transformed,
          'invalid-format' as any
        )
      ).rejects.toThrow(/unsupported format/i);
    });
  });
});