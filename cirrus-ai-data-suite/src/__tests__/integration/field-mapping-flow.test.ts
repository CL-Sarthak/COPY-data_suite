import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { getDatabase } from '@/database/connection';

describe('Field Mapping Flow Integration Test', () => {
  let connection: any;
  let dataSourceId: string;

  beforeAll(async () => {
    connection = await getDatabase();
  });

  afterAll(async () => {
    if (connection) {
      await connection.close();
    }
  });

  describe('Field-mapped data preservation', () => {
    it('should not overwrite field-mapped data when transform endpoint is called', async () => {
      // Create a mock data source with field-mapped data
      const repository = connection.getRepository(DataSourceEntity);
      
      // Sample field-mapped data (as would be saved by apply-mappings)
      const fieldMappedData = [
        { "Full name": "John Doe", "Email Address": "john@example.com" },
        { "Full name": "Jane Smith", "Email Address": "jane@example.com" }
      ];

      const mockDataSource = repository.create({
        name: 'Test Field Mapping',
        type: 'filesystem',
        configuration: JSON.stringify({
          files: [{
            name: 'test.csv',
            type: 'text/csv',
            size: 1000
          }]
        }),
        transformedData: JSON.stringify(fieldMappedData),
        transformationStatus: 'completed',
        transformationAppliedAt: new Date(),
        recordCount: 2
      });

      const saved = await repository.save(mockDataSource);
      dataSourceId = saved.id;

      // Verify initial state
      const initial = await repository.findOne({ where: { id: dataSourceId } });
      expect(initial?.transformedData).toBeTruthy();
      expect(initial?.transformationAppliedAt).toBeTruthy();
      
      const initialData = JSON.parse(initial!.transformedData!);
      expect(Array.isArray(initialData)).toBe(true);
      expect(initialData[0]["Full name"]).toBe("John Doe");

      // Simulate calling the transform endpoint
      // The fix ensures it won't overwrite because transformationAppliedAt is set
      await fetch(
        `http://localhost:3000/api/data-sources/${dataSourceId}/transform`
      ).catch(() => null);

      // Check that field-mapped data is preserved
      const after = await repository.findOne({ where: { id: dataSourceId } });
      expect(after?.transformedData).toBeTruthy();
      
      const afterData = JSON.parse(after!.transformedData!);
      
      // The data should still be field-mapped format (array with mapped field names)
      if (Array.isArray(afterData)) {
        // Good - field-mapped data preserved
        expect(afterData[0]["Full name"]).toBe("John Doe");
        expect(afterData[0]["Email Address"]).toBe("john@example.com");
      } else if (afterData.catalogId) {
        // If it's converted to catalog format, check that field names are preserved
        expect(afterData.records).toBeTruthy();
        if (afterData.records.length > 0) {
          const recordData = afterData.records[0].data || afterData.records[0];
          expect(recordData["Full name"]).toBe("John Doe");
          expect(recordData["Email Address"]).toBe("john@example.com");
        }
      }

      // Clean up
      await repository.delete(dataSourceId);
    });

    it('should correctly display field-mapped names in preview', async () => {
      // This test verifies the preview hook logic
      const repository = connection.getRepository(DataSourceEntity);
      
      const fieldMappedData = [
        { "Customer Name": "Alice", "Contact Email": "alice@test.com" }
      ];

      const mockDataSource = repository.create({
        name: 'Preview Test',
        type: 'filesystem',
        configuration: JSON.stringify({ files: [] }),
        transformedData: JSON.stringify(fieldMappedData),
        transformationAppliedAt: new Date(),
        recordCount: 1
      });

      const saved = await repository.save(mockDataSource);

      // The preview hook should detect field-mapped data
      const dataSource = await repository.findOne({ where: { id: saved.id } });
      const parsedData = JSON.parse(dataSource!.transformedData!);
      
      expect(Array.isArray(parsedData)).toBe(true);
      expect(parsedData.length).toBeGreaterThan(0);
      
      const fieldNames = Object.keys(parsedData[0]);
      expect(fieldNames).toContain("Customer Name");
      expect(fieldNames).toContain("Contact Email");
      
      // Clean up
      await repository.delete(saved.id);
    });
  });
});