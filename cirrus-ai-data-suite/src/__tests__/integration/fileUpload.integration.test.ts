import { DataSourceService } from '@/services/dataSourceService';
import { StreamingUploadService } from '@/services/streaming/streamingUploadService';
import { StorageService } from '@/services/storage/storageService';
import { DataTransformationService } from '@/services/dataTransformationService';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { getDatabase } from '@/database/connection';

describe('File Upload Integration', () => {
  let connection: any;
  
  beforeAll(async () => {
    // Set up test database connection
    process.env.NODE_ENV = 'test';
    connection = await getDatabase();
    
    // Run migrations
    await connection.runMigrations();
  });
  
  afterAll(async () => {
    // Clean up
    if (connection && connection.isInitialized) {
      await connection.destroy();
    }
  });
  
  beforeEach(async () => {
    // Clear data between tests
    await connection.getRepository(DataSourceEntity).delete({});
  });
  
  describe('Complete File Upload Flow', () => {
    it('should handle CSV file upload end-to-end', async () => {
      // Step 1: Create test CSV file
      const testData = `name,email,phone,ssn
John Doe,john@example.com,555-1234,123-45-6789
Jane Smith,jane@example.com,555-5678,987-65-4321`;
      
      const fileName = 'test-data.csv';
      const fileBuffer = Buffer.from(testData);
      const file = new File([fileBuffer], fileName, { type: 'text/csv' });
      
      // Step 2: Initialize streaming upload
      const uploadService = new StreamingUploadService();
      const { uploadId } = await uploadService.initializeUpload(fileName, file.size);
      
      expect(uploadId).toBeDefined();
      expect(uploadId).toMatch(/^upload_/);
      
      // Step 3: Upload file chunks
      const chunkSize = 1024 * 1024; // 1MB chunks
      let offset = 0;
      
      while (offset < file.size) {
        const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
        const checksum = await calculateChecksum(chunk);
        
        await uploadService.uploadChunk(uploadId, chunk, offset / chunkSize, checksum);
        offset += chunkSize;
      }
      
      // Step 4: Complete upload
      const { storageKey } = await uploadService.completeUpload(uploadId);
      expect(storageKey).toBeDefined();
      
      // Step 5: Create data source
      const dataSource = await DataSourceService.createDataSource({
        name: fileName,
        type: 'csv',
        storageKey,
        size: file.size,
        contentTruncated: false
      });
      
      expect(dataSource).toBeDefined();
      expect(dataSource.id).toBeDefined();
      expect(dataSource.name).toBe(fileName);
      expect(dataSource.type).toBe('csv');
      
      // Step 6: Transform data
      const transformedData = await DataTransformationService.transformDataSource(dataSource.id);
      
      expect(transformedData).toBeDefined();
      expect(transformedData.records).toHaveLength(2);
      expect(transformedData.fields).toContain('name');
      expect(transformedData.fields).toContain('email');
      expect(transformedData.fields).toContain('phone');
      expect(transformedData.fields).toContain('ssn');
      
      // Step 7: Verify data integrity
      const firstRecord = transformedData.records[0];
      expect(firstRecord.data.name).toBe('John Doe');
      expect(firstRecord.data.email).toBe('john@example.com');
      expect(firstRecord.data.phone).toBe('555-1234');
      expect(firstRecord.data.ssn).toBe('123-45-6789');
    });
    
    it('should handle large file upload with retry', async () => {
      // Create a 5MB test file
      const largeData = 'x'.repeat(5 * 1024 * 1024);
      const fileName = 'large-file.txt';
      const file = new File([largeData], fileName, { type: 'text/plain' });
      
      // Mock network failure on first chunk
      const uploadService = new StreamingUploadService();
      const originalUploadChunk = uploadService.uploadChunk.bind(uploadService);
      let attemptCount = 0;
      
      uploadService.uploadChunk = jest.fn().mockImplementation(async (uploadId, chunk, index, checksum) => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('Network error');
        }
        return originalUploadChunk(uploadId, chunk, index, checksum);
      });
      
      // Initialize upload
      const { uploadId } = await uploadService.initializeUpload(fileName, file.size);
      
      // Upload with retry logic
      const chunkSize = 1024 * 1024; // 1MB chunks
      let offset = 0;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (offset < file.size) {
        const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
        const checksum = await calculateChecksum(chunk);
        let uploaded = false;
        
        for (let i = 0; i < maxRetries; i++) {
          try {
            await uploadService.uploadChunk(uploadId, chunk, offset / chunkSize, checksum);
            uploaded = true;
            break;
          } catch (error) {
            retryCount++;
            if (i === maxRetries - 1) throw error;
            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
          }
        }
        
        if (!uploaded) {
          throw new Error('Failed to upload chunk after retries');
        }
        
        offset += chunkSize;
      }
      
      // Verify retry occurred
      expect(retryCount).toBeGreaterThan(0);
      
      // Complete upload
      const { storageKey } = await uploadService.completeUpload(uploadId);
      expect(storageKey).toBeDefined();
    });
    
    it('should handle concurrent file uploads', async () => {
      const files = [
        { name: 'file1.csv', content: 'name\nJohn' },
        { name: 'file2.csv', content: 'email\njohn@example.com' },
        { name: 'file3.csv', content: 'phone\n555-1234' }
      ];
      
      // Upload all files concurrently
      const uploadPromises = files.map(async ({ name, content }) => {
        const file = new File([content], name, { type: 'text/csv' });
        const uploadService = new StreamingUploadService();
        
        const { uploadId } = await uploadService.initializeUpload(name, file.size);
        const checksum = await calculateChecksum(file);
        
        await uploadService.uploadChunk(uploadId, file, 0, checksum);
        const { storageKey } = await uploadService.completeUpload(uploadId);
        
        return DataSourceService.createDataSource({
          name,
          type: 'csv',
          storageKey,
          size: file.size,
          contentTruncated: false
        });
      });
      
      const dataSources = await Promise.all(uploadPromises);
      
      // Verify all uploads completed successfully
      expect(dataSources).toHaveLength(3);
      dataSources.forEach((ds, index) => {
        expect(ds.name).toBe(files[index].name);
        expect(ds.type).toBe('csv');
      });
      
      // Verify data integrity
      const transformPromises = dataSources.map(ds => 
        DataTransformationService.transformDataSource(ds.id)
      );
      const transformedData = await Promise.all(transformPromises);
      
      expect(transformedData[0].fields).toContain('name');
      expect(transformedData[1].fields).toContain('email');
      expect(transformedData[2].fields).toContain('phone');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle upload session timeout', async () => {
      const uploadService = new StreamingUploadService();
      const fileName = 'timeout-test.csv';
      
      // Initialize upload
      const { uploadId } = await uploadService.initializeUpload(fileName, 1000);
      
      // Wait for session to expire (mock by setting session expiry)
      const session = await uploadService.getUploadSession(uploadId);
      if (session) {
        session.expiresAt = new Date(Date.now() - 1000); // Expired
        await uploadService.updateUploadSession(session);
      }
      
      // Try to upload chunk to expired session
      const chunk = new File(['test'], fileName);
      const checksum = await calculateChecksum(chunk);
      
      await expect(
        uploadService.uploadChunk(uploadId, chunk, 0, checksum)
      ).rejects.toThrow(/expired|not found/i);
    });
    
    it('should handle invalid file types', async () => {
      const fileName = 'invalid.exe';
      const file = new File(['binary data'], fileName, { type: 'application/x-executable' });
      
      await expect(
        DataSourceService.createDataSource({
          name: fileName,
          type: 'exe' as any,
          storageKey: 'test-key',
          size: file.size,
          contentTruncated: false
        })
      ).rejects.toThrow(/invalid|unsupported/i);
    });
    
    it('should handle storage failures gracefully', async () => {
      const uploadService = new StreamingUploadService();
      const fileName = 'storage-fail.csv';
      const file = new File(['test data'], fileName);
      
      // Mock storage failure
      const originalWrite = StorageService.prototype.write;
      StorageService.prototype.write = jest.fn().mockRejectedValue(new Error('Storage full'));
      
      const { uploadId } = await uploadService.initializeUpload(fileName, file.size);
      const checksum = await calculateChecksum(file);
      
      await expect(
        uploadService.uploadChunk(uploadId, file, 0, checksum)
      ).rejects.toThrow('Storage full');
      
      // Restore original method
      StorageService.prototype.write = originalWrite;
    });
  });
});

// Helper function to calculate checksum
async function calculateChecksum(data: Blob | File): Promise<string> {
  const buffer = await data.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}