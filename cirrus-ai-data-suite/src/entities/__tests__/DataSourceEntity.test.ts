import { DataSourceEntity } from '../DataSourceEntity';

describe('DataSourceEntity', () => {
  it('should create a data source entity with required fields', () => {
    const dataSource = new DataSourceEntity();
    
    dataSource.id = 'test-uuid';
    dataSource.name = 'Test Data Source';
    dataSource.type = 'filesystem';
    dataSource.configuration = JSON.stringify({ basePath: '/data' });
    
    expect(dataSource.id).toBe('test-uuid');
    expect(dataSource.name).toBe('Test Data Source');
    expect(dataSource.type).toBe('filesystem');
    expect(dataSource.configuration).toBe(JSON.stringify({ basePath: '/data' }));
  });

  it('should support all data source types', () => {
    const types = ['database', 'api', 'filesystem', 's3', 'azure', 'gcp', 'json_transformed'];
    
    types.forEach(type => {
      const dataSource = new DataSourceEntity();
      dataSource.type = type;
      expect(dataSource.type).toBe(type);
    });
  });

  it('should handle optional fields correctly', () => {
    const dataSource = new DataSourceEntity();
    
    // Optional fields should be undefined initially
    expect(dataSource.path).toBeUndefined();
    expect(dataSource.metadata).toBeUndefined();
    expect(dataSource.recordCount).toBeUndefined();
    expect(dataSource.tags).toBeUndefined();
    expect(dataSource.transformedData).toBeUndefined();
    expect(dataSource.transformedAt).toBeUndefined();
    
    // Set optional fields
    dataSource.path = '/data/source.csv';
    dataSource.metadata = JSON.stringify({ size: 1024, format: 'csv' });
    dataSource.recordCount = 1000;
    dataSource.tags = JSON.stringify(['production', 'customer-data']);
    
    expect(dataSource.path).toBe('/data/source.csv');
    expect(JSON.parse(dataSource.metadata!)).toEqual({ size: 1024, format: 'csv' });
    expect(dataSource.recordCount).toBe(1000);
    expect(JSON.parse(dataSource.tags!)).toEqual(['production', 'customer-data']);
  });

  it('should track transformation status', () => {
    const dataSource = new DataSourceEntity();
    const statuses = ['not_started', 'in_progress', 'completed', 'completed_with_errors', 'failed'];
    
    statuses.forEach(status => {
      dataSource.transformationStatus = status;
      expect(dataSource.transformationStatus).toBe(status);
    });
  });

  it('should store storage information', () => {
    const dataSource = new DataSourceEntity();
    
    dataSource.storageProvider = 'vercel';
    dataSource.storageKeys = JSON.stringify(['key1', 'key2']);
    dataSource.originalPath = '/original/path';
    
    expect(dataSource.storageProvider).toBe('vercel');
    expect(JSON.parse(dataSource.storageKeys!)).toEqual(['key1', 'key2']);
    expect(dataSource.originalPath).toBe('/original/path');
  });

  it('should track transformation timestamps', () => {
    const dataSource = new DataSourceEntity();
    const now = new Date();
    
    dataSource.transformedAt = now;
    dataSource.transformationAppliedAt = now;
    dataSource.createdAt = now;
    dataSource.updatedAt = now;
    
    expect(dataSource.transformedAt).toBe(now);
    expect(dataSource.transformationAppliedAt).toBe(now);
    expect(dataSource.createdAt).toBe(now);
    expect(dataSource.updatedAt).toBe(now);
  });

  it('should store transformation errors', () => {
    const dataSource = new DataSourceEntity();
    const errors = [
      { field: 'email', error: 'Invalid format' },
      { field: 'phone', error: 'Missing area code' }
    ];
    
    dataSource.transformationErrors = JSON.stringify(errors);
    
    expect(JSON.parse(dataSource.transformationErrors!)).toEqual(errors);
  });
});