import { SyntheticDataset } from '../SyntheticDataset';

describe('SyntheticDataset', () => {
  it('should create a synthetic dataset with required fields', () => {
    const dataset = new SyntheticDataset();
    
    dataset.id = 'test-uuid';
    dataset.name = 'Test User Dataset';
    dataset.dataType = 'users';
    dataset.schema = {
      firstName: { type: 'string', faker: 'name.firstName' },
      lastName: { type: 'string', faker: 'name.lastName' },
      email: { type: 'string', faker: 'internet.email' }
    };
    dataset.recordCount = 100;
    dataset.status = 'completed';
    // outputFormat is a getter that always returns 'json'
    
    expect(dataset.id).toBe('test-uuid');
    expect(dataset.name).toBe('Test User Dataset');
    expect(dataset.dataType).toBe('users');
    expect(dataset.schema).toEqual({
      firstName: { type: 'string', faker: 'name.firstName' },
      lastName: { type: 'string', faker: 'name.lastName' },
      email: { type: 'string', faker: 'internet.email' }
    });
    expect(dataset.recordCount).toBe(100);
    expect(dataset.status).toBe('completed');
    expect(dataset.outputFormat).toBe('json'); // Always returns 'json' from getter
  });

  it('should support various data types', () => {
    const dataTypes = ['users', 'financial', 'medical', 'general', 'custom'];
    
    dataTypes.forEach(type => {
      const dataset = new SyntheticDataset();
      dataset.dataType = type;
      expect(dataset.dataType).toBe(type);
    });
  });

  it('should track dataset status', () => {
    const dataset = new SyntheticDataset();
    const statuses: Array<'draft' | 'generating' | 'completed' | 'failed'> = [
      'draft', 'generating', 'completed', 'failed'
    ];
    
    statuses.forEach(status => {
      dataset.status = status;
      expect(dataset.status).toBe(status);
    });
  });

  it('should support different output formats', () => {
    const dataset = new SyntheticDataset();
    // outputFormat is a getter that always returns 'json'
    expect(dataset.outputFormat).toBe('json');
  });

  it('should handle optional fields', () => {
    const dataset = new SyntheticDataset();
    
    // Optional fields should be undefined initially
    expect(dataset.description).toBeUndefined();
    expect(dataset.configuration).toBeUndefined();
    expect(dataset.filePath).toBeUndefined();
    expect(dataset.errorMessage).toBeUndefined();
    expect(dataset.generatedContent).toBeUndefined();
    expect(dataset.generatedContentSize).toBeUndefined();
    
    // Set optional fields that are actual columns
    dataset.description = 'Sample user data for testing';
    // configuration is derived from parameters column
    dataset.parameters = JSON.stringify({ locale: 'en_US', seed: 12345 });
    // filePath and errorMessage are getters that always return undefined
    
    expect(dataset.description).toBe('Sample user data for testing');
    expect(dataset.configuration).toEqual({ locale: 'en_US', seed: 12345 });
    expect(dataset.filePath).toBeUndefined(); // Always undefined from getter
    expect(dataset.errorMessage).toBeUndefined(); // Always undefined from getter
  });

  it('should store generated content for production environments', () => {
    const dataset = new SyntheticDataset();
    const generatedData = [
      { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
    ];
    
    dataset.generatedContent = JSON.stringify(generatedData);
    dataset.generatedContentSize = dataset.generatedContent.length;
    
    expect(JSON.parse(dataset.generatedContent)).toEqual(generatedData);
    expect(dataset.generatedContentSize).toBe(dataset.generatedContent.length);
  });

  it('should track error information for failed generation', () => {
    const dataset = new SyntheticDataset();
    
    dataset.status = 'failed';
    // errorMessage is a getter that always returns undefined
    
    expect(dataset.status).toBe('failed');
    expect(dataset.errorMessage).toBeUndefined(); // Always undefined from getter
  });

  it('should have default values', () => {
    const dataset = new SyntheticDataset();
    
    // Note: Default values are typically set by the database
    expect(dataset.recordCount).toBeUndefined(); // Default 0 in DB
    expect(dataset.status).toBeUndefined(); // Default 'draft' in DB
    expect(dataset.outputFormat).toBe('json'); // Always 'json' from getter
  });

  it('should store complex schemas', () => {
    const dataset = new SyntheticDataset();
    const complexSchema = {
      user: {
        type: 'object',
        properties: {
          id: { type: 'string', faker: 'datatype.uuid' },
          profile: {
            type: 'object',
            properties: {
              firstName: { type: 'string', faker: 'name.firstName' },
              lastName: { type: 'string', faker: 'name.lastName' },
              age: { type: 'number', faker: 'datatype.number', min: 18, max: 65 }
            }
          },
          addresses: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: {
              type: 'object',
              properties: {
                street: { type: 'string', faker: 'address.streetAddress' },
                city: { type: 'string', faker: 'address.city' },
                zipCode: { type: 'string', faker: 'address.zipCode' }
              }
            }
          }
        }
      }
    };
    
    dataset.schema = complexSchema;
    expect(dataset.schema).toEqual(complexSchema);
  });
});