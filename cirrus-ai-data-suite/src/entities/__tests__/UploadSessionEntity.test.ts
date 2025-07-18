import { UploadSessionEntity } from '../UploadSessionEntity';

describe('UploadSessionEntity', () => {
  it('should create an upload session with required fields', () => {
    const session = new UploadSessionEntity();
    
    session.uploadId = 'upload-123';
    session.fileName = 'large-dataset.csv';
    session.fileSize = 1024 * 1024 * 100; // 100MB
    session.mimeType = 'text/csv';
    session.chunkSize = 1024 * 1024 * 5; // 5MB chunks
    session.totalChunks = 20;
    session.uploadedChunks = [0, 1, 2, 3, 4];
    session.status = 'active';
    
    expect(session.uploadId).toBe('upload-123');
    expect(session.fileName).toBe('large-dataset.csv');
    expect(session.fileSize).toBe(104857600);
    expect(session.mimeType).toBe('text/csv');
    expect(session.chunkSize).toBe(5242880);
    expect(session.totalChunks).toBe(20);
    expect(session.uploadedChunks).toEqual([0, 1, 2, 3, 4]);
    expect(session.status).toBe('active');
  });

  it('should track upload status', () => {
    const session = new UploadSessionEntity();
    const statuses: Array<'active' | 'paused' | 'completed' | 'failed'> = [
      'active', 'paused', 'completed', 'failed'
    ];
    
    statuses.forEach(status => {
      session.status = status;
      expect(session.status).toBe(status);
    });
  });

  it('should track uploaded chunks progress', () => {
    const session = new UploadSessionEntity();
    
    session.totalChunks = 10;
    session.uploadedChunks = [];
    
    // Simulate chunk uploads
    for (let i = 0; i < 10; i++) {
      session.uploadedChunks.push(i);
      expect(session.uploadedChunks).toHaveLength(i + 1);
    }
    
    expect(session.uploadedChunks).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('should handle optional fields', () => {
    const session = new UploadSessionEntity();
    
    expect(session.storageKey).toBeUndefined();
    expect(session.metadata).toBeUndefined();
    
    session.storageKey = 'uploads/upload-123/large-dataset.csv';
    session.metadata = {
      source: 'customer-upload',
      userId: 'user-456',
      projectId: 'project-789'
    };
    
    expect(session.storageKey).toBe('uploads/upload-123/large-dataset.csv');
    expect(session.metadata).toEqual({
      source: 'customer-upload',
      userId: 'user-456',
      projectId: 'project-789'
    });
  });

  it('should support various mime types', () => {
    const session = new UploadSessionEntity();
    const mimeTypes = [
      'text/csv',
      'application/json',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    mimeTypes.forEach(mimeType => {
      session.mimeType = mimeType;
      expect(session.mimeType).toBe(mimeType);
    });
  });

  it('should handle large file sizes', () => {
    const session = new UploadSessionEntity();
    
    // Test various file sizes
    const sizes = [
      1024, // 1KB
      1024 * 1024, // 1MB
      1024 * 1024 * 100, // 100MB
      1024 * 1024 * 1024, // 1GB
      1024 * 1024 * 1024 * 5 // 5GB
    ];
    
    sizes.forEach(size => {
      session.fileSize = size;
      expect(session.fileSize).toBe(size);
    });
  });

  it('should track timestamps', () => {
    const session = new UploadSessionEntity();
    const now = new Date();
    
    session.startTime = now;
    session.lastActivity = now;
    
    expect(session.startTime).toBe(now);
    expect(session.lastActivity).toBe(now);
  });

  it('should calculate upload progress', () => {
    const session = new UploadSessionEntity();
    
    session.totalChunks = 100;
    session.uploadedChunks = Array.from({ length: 25 }, (_, i) => i);
    
    const progress = (session.uploadedChunks.length / session.totalChunks) * 100;
    expect(progress).toBe(25);
  });
});