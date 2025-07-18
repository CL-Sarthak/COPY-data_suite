import { PipelineEntity } from '../PipelineEntity';

describe('PipelineEntity', () => {
  it('should create a pipeline with required fields', () => {
    const pipeline = new PipelineEntity();
    
    pipeline.id = 'pipeline-123';
    pipeline.name = 'Customer Data Processing Pipeline';
    pipeline.status = 'active';
    pipeline.createdBy = 'user-456';
    pipeline.version = 1;
    
    expect(pipeline.id).toBe('pipeline-123');
    expect(pipeline.name).toBe('Customer Data Processing Pipeline');
    expect(pipeline.status).toBe('active');
    expect(pipeline.createdBy).toBe('user-456');
    expect(pipeline.version).toBe(1);
  });

  it('should store pipeline nodes and edges as JSON', () => {
    const pipeline = new PipelineEntity();
    
    const nodes = [
      { id: 'node-1', type: 'source', position: { x: 100, y: 100 } },
      { id: 'node-2', type: 'transform', position: { x: 300, y: 100 } },
      { id: 'node-3', type: 'output', position: { x: 500, y: 100 } }
    ];
    
    const edges = [
      { id: 'edge-1', source: 'node-1', target: 'node-2' },
      { id: 'edge-2', source: 'node-2', target: 'node-3' }
    ];
    
    pipeline.nodes = JSON.stringify(nodes);
    pipeline.edges = JSON.stringify(edges);
    
    expect(JSON.parse(pipeline.nodes)).toEqual(nodes);
    expect(JSON.parse(pipeline.edges)).toEqual(edges);
  });

  it('should track pipeline status', () => {
    const pipeline = new PipelineEntity();
    const statuses: Array<'draft' | 'active' | 'paused' | 'error' | 'completed'> = [
      'draft', 'active', 'paused', 'error', 'completed'
    ];
    
    statuses.forEach(status => {
      pipeline.status = status;
      expect(pipeline.status).toBe(status);
    });
  });

  it('should handle optional fields', () => {
    const pipeline = new PipelineEntity();
    
    expect(pipeline.description).toBeUndefined();
    expect(pipeline.nodes).toBeUndefined();
    expect(pipeline.edges).toBeUndefined();
    expect(pipeline.triggers).toBeUndefined();
    expect(pipeline.schedule).toBeUndefined();
    expect(pipeline.tags).toBeUndefined();
    
    pipeline.description = 'Processes customer data daily';
    pipeline.tags = JSON.stringify(['customer', 'daily', 'production']);
    
    expect(pipeline.description).toBe('Processes customer data daily');
    expect(JSON.parse(pipeline.tags)).toEqual(['customer', 'daily', 'production']);
  });

  it('should store triggers configuration', () => {
    const pipeline = new PipelineEntity();
    
    const triggers = [
      { type: 'schedule', cron: '0 0 * * *' },
      { type: 'webhook', url: 'https://api.example.com/trigger' },
      { type: 'event', eventName: 'data-uploaded' }
    ];
    
    pipeline.triggers = JSON.stringify(triggers);
    expect(JSON.parse(pipeline.triggers)).toEqual(triggers);
  });

  it('should store schedule configuration', () => {
    const pipeline = new PipelineEntity();
    
    const schedule = {
      enabled: true,
      cron: '0 2 * * *',
      timezone: 'UTC',
      retryOnFailure: true,
      maxRetries: 3
    };
    
    pipeline.schedule = JSON.stringify(schedule);
    expect(JSON.parse(pipeline.schedule)).toEqual(schedule);
  });

  it('should track version numbers', () => {
    const pipeline = new PipelineEntity();
    
    pipeline.version = 1;
    expect(pipeline.version).toBe(1);
    
    // Simulate version updates
    pipeline.version++;
    expect(pipeline.version).toBe(2);
    
    pipeline.version = 10;
    expect(pipeline.version).toBe(10);
  });

  it('should have default values', () => {
    const pipeline = new PipelineEntity();
    
    // Note: Default values are typically set by the database
    expect(pipeline.status).toBeUndefined(); // Default 'draft' in DB
    expect(pipeline.version).toBeUndefined(); // Default 1 in DB
  });

  it('should track timestamps', () => {
    const pipeline = new PipelineEntity();
    const now = new Date();
    
    pipeline.createdAt = now;
    pipeline.updatedAt = now;
    
    expect(pipeline.createdAt).toBe(now);
    expect(pipeline.updatedAt).toBe(now);
  });

  it('should store complex pipeline configurations', () => {
    const pipeline = new PipelineEntity();
    
    const complexNodes = [
      {
        id: 'source-1',
        type: 'file-upload',
        position: { x: 100, y: 100 },
        data: { sourceId: 'ds-123', fileTypes: ['csv', 'json'] }
      },
      {
        id: 'transform-1',
        type: 'field-mapper',
        position: { x: 300, y: 100 },
        data: { mappingId: 'map-456', validation: true }
      },
      {
        id: 'privacy-1',
        type: 'pii-detector',
        position: { x: 500, y: 100 },
        data: { patterns: ['email', 'ssn'], confidence: 0.9 }
      }
    ];
    
    pipeline.nodes = JSON.stringify(complexNodes);
    const parsed = JSON.parse(pipeline.nodes);
    
    expect(parsed).toHaveLength(3);
    expect(parsed[0].data.sourceId).toBe('ds-123');
    expect(parsed[1].data.mappingId).toBe('map-456');
    expect(parsed[2].data.patterns).toContain('email');
  });
});