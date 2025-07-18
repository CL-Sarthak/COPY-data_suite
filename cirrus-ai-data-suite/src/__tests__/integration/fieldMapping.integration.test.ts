import { FieldMappingService } from '@/services/fieldMappingService';
import { CatalogFieldService } from '@/services/catalogFieldService';
import { CatalogCategoryService } from '@/services/catalogCategoryService';
import { DataSourceService } from '@/services/dataSourceService';
import { DataTransformationService } from '@/services/dataTransformationService';
import { CatalogMappingService } from '@/services/catalogMappingService';
import { GlobalCatalogService } from '@/services/globalCatalogService';
import { createTestDataSource } from './setup';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { CatalogFieldEntity } from '@/entities/CatalogFieldEntity';
import { CatalogCategoryEntity } from '@/entities/CatalogCategoryEntity';
import { FieldMappingEntity } from '@/entities/FieldMappingEntity';
import { DataSource } from 'typeorm';

// Mock the database connection module
jest.mock('@/database/connection', () => ({
  getDatabase: jest.fn(),
  initializeDatabase: jest.fn(),
  getCurrentDataSource: jest.fn(),
}));

describe('Field Mapping Integration', () => {
  let connection: DataSource;
  let testDataSourceId: string;
  let testCategoryId: string;
  
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    connection = await createTestDataSource();
    
    // Mock the getDatabase function to return our test connection
    const dbConnection = await import('@/database/connection');
    (dbConnection.getDatabase as jest.Mock).mockResolvedValue(connection);
  });
  
  afterAll(async () => {
    if (connection && connection.isInitialized) {
      await connection.destroy();
    }
  });
  
  beforeEach(async () => {
    // Clear data between tests
    await connection.getRepository(FieldMappingEntity).delete({});
    await connection.getRepository(DataSourceEntity).delete({});
    await connection.getRepository(CatalogFieldEntity).delete({});
    await connection.getRepository(CatalogCategoryEntity).delete({});
    
    // Create test category
    const category = await CatalogCategoryService.createCategory({
      name: 'Customer Data',
      description: 'Customer information fields'
    });
    testCategoryId = category.id;
    
    // Create test data source
    const csvContent = `customer_name,customer_email,phone_number,account_id,registration_date
John Doe,john@example.com,555-1234,ACC001,2024-01-01
Jane Smith,jane@example.com,555-5678,ACC002,2024-01-02`;
    
    const dataSource = await DataSourceService.createDataSource({
      name: 'customers.csv',
      type: 'csv',
      content: csvContent,
      size: csvContent.length,
      contentTruncated: false
    });
    testDataSourceId = dataSource.id;
  });
  
  describe('Complete Field Mapping Flow', () => {
    it('should map source fields to catalog fields and transform data', async () => {
      // Step 1: Initialize catalog with standard fields
      const catalogFields = await Promise.all([
        CatalogFieldService.createField({
          name: 'Full Name',
          standardName: 'full_name',
          description: 'Person full name',
          dataType: 'string',
          isPii: true,
          categoryId: testCategoryId
        }),
        CatalogFieldService.createField({
          name: 'Email Address',
          standardName: 'email_address',
          description: 'Email contact',
          dataType: 'string',
          isPii: true,
          categoryId: testCategoryId
        }),
        CatalogFieldService.createField({
          name: 'Phone Number',
          standardName: 'phone_number',
          description: 'Contact phone',
          dataType: 'string',
          isPii: true,
          categoryId: testCategoryId
        }),
        CatalogFieldService.createField({
          name: 'Customer ID',
          standardName: 'customer_id',
          description: 'Unique customer identifier',
          dataType: 'string',
          isPii: false,
          categoryId: testCategoryId
        })
      ]);
      
      // Step 2: Get source fields from data
      const sourceFields = await FieldMappingService.loadSourceFields(testDataSourceId);
      expect(sourceFields).toEqual([
        'customer_name',
        'customer_email',
        'phone_number',
        'account_id',
        'registration_date'
      ]);
      
      // Step 3: Get mapping suggestions
      const suggestions = await CatalogMappingService.suggestMappings(
        sourceFields,
        catalogFields
      );
      
      // Verify intelligent suggestions
      expect(suggestions['customer_name']).toBe('full_name');
      expect(suggestions['customer_email']).toBe('email_address');
      expect(suggestions['phone_number']).toBe('phone_number');
      expect(suggestions['account_id']).toBe('customer_id');
      
      // Step 4: Create field mappings
      const mappings = [
        {
          sourceId: testDataSourceId,
          sourceField: 'customer_name',
          catalogFieldId: catalogFields[0].id, // Full Name
          transformRules: []
        },
        {
          sourceId: testDataSourceId,
          sourceField: 'customer_email',
          catalogFieldId: catalogFields[1].id, // Email Address
          transformRules: []
        },
        {
          sourceId: testDataSourceId,
          sourceField: 'phone_number',
          catalogFieldId: catalogFields[2].id, // Phone Number
          transformRules: []
        },
        {
          sourceId: testDataSourceId,
          sourceField: 'account_id',
          catalogFieldId: catalogFields[3].id, // Customer ID
          transformRules: []
        }
      ];
      
      for (const mapping of mappings) {
        await FieldMappingService.createMapping(mapping);
      }
      
      // Step 5: Apply mappings to transform data
      const transformedData = await DataTransformationService.applyMappings(
        testDataSourceId,
        { applyFieldMapping: true }
      );
      
      // Verify field names were transformed
      expect(transformedData.fields).toContain('full_name');
      expect(transformedData.fields).toContain('email_address');
      expect(transformedData.fields).toContain('phone_number');
      expect(transformedData.fields).toContain('customer_id');
      expect(transformedData.fields).toContain('registration_date'); // Unmapped field preserved
      
      // Verify data integrity
      const firstRecord = transformedData.records[0].data;
      expect(firstRecord.full_name).toBe('John Doe');
      expect(firstRecord.email_address).toBe('john@example.com');
      expect(firstRecord.phone_number).toBe('555-1234');
      expect(firstRecord.customer_id).toBe('ACC001');
      expect(firstRecord.registration_date).toBe('2024-01-01');
    });
    
    it('should handle complex transformations with rules', async () => {
      // Create catalog field with transformation
      const phoneField = await CatalogFieldService.createField({
        name: 'Standardized Phone',
        standardName: 'phone_standard',
        description: 'Phone in standard format',
        dataType: 'string',
        isPii: true,
        categoryId: testCategoryId
      });
      
      // Create mapping with transformation rules
      await FieldMappingService.createMapping({
        sourceId: testDataSourceId,
        sourceField: 'phone_number',
        catalogFieldId: phoneField.id,
        transformRules: [
          {
            type: 'regex_replace',
            pattern: '(\\d{3})-(\\d{4})',
            replacement: '($1) $2'
          }
        ]
      });
      
      // Apply transformation
      const transformed = await DataTransformationService.applyMappings(
        testDataSourceId,
        { applyFieldMapping: true }
      );
      
      // Verify transformation was applied
      const record = transformed.records[0].data;
      expect(record.phone_standard).toBe('(555) 1234');
    });
    
    it('should handle multiple sources mapping to same catalog', async () => {
      // Create second data source with different field names
      const csvContent2 = `name_full,email_primary,tel,cust_ref
Alice Brown,alice@example.com,555-9999,ACC003
Bob Wilson,bob@example.com,555-0000,ACC004`;
      
      const dataSource2 = await DataSourceService.createDataSource({
        name: 'customers2.csv',
        type: 'csv',
        content: csvContent2,
        size: csvContent2.length,
        contentTruncated: false
      });
      
      // Get catalog fields
      const catalogFields = await CatalogFieldService.getFieldsByCategory(testCategoryId);
      const nameField = catalogFields.find(f => f.standardName === 'full_name')!;
      const emailField = catalogFields.find(f => f.standardName === 'email_address')!;
      
      // Map both sources to same catalog fields
      await FieldMappingService.getMappingsBySource(testDataSourceId);
      const mappings2 = [
        {
          sourceId: dataSource2.id,
          sourceField: 'name_full',
          catalogFieldId: nameField.id,
          transformRules: []
        },
        {
          sourceId: dataSource2.id,
          sourceField: 'email_primary',
          catalogFieldId: emailField.id,
          transformRules: []
        }
      ];
      
      for (const mapping of mappings2) {
        await FieldMappingService.createMapping(mapping);
      }
      
      // Transform both sources
      const transformed1 = await DataTransformationService.applyMappings(
        testDataSourceId,
        { applyFieldMapping: true }
      );
      const transformed2 = await DataTransformationService.applyMappings(
        dataSource2.id,
        { applyFieldMapping: true }
      );
      
      // Both should have consistent field names
      expect(transformed1.fields).toContain('full_name');
      expect(transformed1.fields).toContain('email_address');
      expect(transformed2.fields).toContain('full_name');
      expect(transformed2.fields).toContain('email_address');
    });
  });
  
  describe('Catalog Management', () => {
    it('should maintain catalog field relationships', async () => {
      // Create parent category
      const parentCategory = await CatalogCategoryService.createCategory({
        name: 'Personal Information',
        description: 'Personal data fields'
      });
      
      // Create child category
      const childCategory = await CatalogCategoryService.createCategory({
        name: 'Contact Information',
        description: 'Contact details',
        parentId: parentCategory.id
      });
      
      // Create related fields
      const fields = await Promise.all([
        CatalogFieldService.createField({
          name: 'Primary Email',
          standardName: 'email_primary',
          dataType: 'string',
          isPii: true,
          categoryId: childCategory.id
        }),
        CatalogFieldService.createField({
          name: 'Secondary Email',
          standardName: 'email_secondary',
          dataType: 'string',
          isPii: true,
          categoryId: childCategory.id,
          relatedFieldIds: [] // Will update after creation
        })
      ]);
      
      // Update field relationships
      await CatalogFieldService.updateField(fields[1].id, {
        relatedFieldIds: [fields[0].id]
      });
      
      // Verify relationships
      const updatedField = await CatalogFieldService.getFieldById(fields[1].id);
      expect(updatedField?.relatedFieldIds).toContain(fields[0].id);
      
      // Get category hierarchy
      const categories = await CatalogCategoryService.getCategoriesWithHierarchy();
      const parent = categories.find(c => c.id === parentCategory.id);
      expect(parent?.children).toHaveLength(1);
      expect(parent?.children![0].id).toBe(childCategory.id);
    });
    
    it('should export and import catalog configuration', async () => {
      // Create catalog structure
      const category = await CatalogCategoryService.createCategory({
        name: 'Test Category',
        description: 'For export test'
      });
      
      await CatalogFieldService.createField({
        name: 'Test Field',
        standardName: 'test_field',
        dataType: 'string',
        categoryId: category.id
      });
      
      // Export catalog
      const exportData = await GlobalCatalogService.exportCatalog();
      
      expect(exportData.categories).toHaveLength(2); // Test + existing
      expect(exportData.fields.some(f => f.standardName === 'test_field')).toBe(true);
      
      // Clear catalog
      await connection.getRepository(CatalogFieldEntity).clear();
      await connection.getRepository(CatalogCategoryEntity).clear();
      
      // Import catalog
      const importResult = await GlobalCatalogService.importCatalog(exportData);
      
      expect(importResult.categoriesImported).toBeGreaterThan(0);
      expect(importResult.fieldsImported).toBeGreaterThan(0);
      
      // Verify import
      const importedField = await CatalogFieldService.getFieldByStandardName('test_field');
      expect(importedField).toBeDefined();
      expect(importedField?.name).toBe('Test Field');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle invalid field mappings', async () => {
      await expect(
        FieldMappingService.createMapping({
          sourceId: testDataSourceId,
          sourceField: 'non_existent_field',
          catalogFieldId: 'invalid-id',
          transformRules: []
        })
      ).rejects.toThrow();
    });
    
    it('should handle circular field relationships', async () => {
      const field1 = await CatalogFieldService.createField({
        name: 'Field 1',
        standardName: 'field_1',
        dataType: 'string',
        categoryId: testCategoryId
      });
      
      const field2 = await CatalogFieldService.createField({
        name: 'Field 2',
        standardName: 'field_2',
        dataType: 'string',
        categoryId: testCategoryId,
        relatedFieldIds: [field1.id]
      });
      
      // Try to create circular reference
      await expect(
        CatalogFieldService.updateField(field1.id, {
          relatedFieldIds: [field2.id]
        })
      ).rejects.toThrow(/circular/i);
    });
  });
});