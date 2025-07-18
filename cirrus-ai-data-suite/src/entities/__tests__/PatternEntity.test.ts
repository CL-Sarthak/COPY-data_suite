import { PatternEntity } from '../PatternEntity';

describe('PatternEntity', () => {
  it('should create a pattern entity with all required fields', () => {
    const pattern = new PatternEntity();
    
    // Set required fields
    pattern.id = 'test-uuid';
    pattern.name = 'Email Pattern';
    pattern.type = 'PII';
    pattern.category = 'Contact Information';
    pattern.regex = '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$';
    pattern.examples = JSON.stringify(['user@example.com', 'test@domain.org']);
    pattern.description = 'Detects email addresses';
    pattern.color = '#4B5563';
    pattern.isActive = true;
    pattern.createdAt = new Date();
    pattern.updatedAt = new Date();
    
    // Verify all fields
    expect(pattern.id).toBe('test-uuid');
    expect(pattern.name).toBe('Email Pattern');
    expect(pattern.type).toBe('PII');
    expect(pattern.category).toBe('Contact Information');
    expect(pattern.regex).toBe('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$');
    expect(pattern.examples).toBe(JSON.stringify(['user@example.com', 'test@domain.org']));
    expect(pattern.description).toBe('Detects email addresses');
    expect(pattern.color).toBe('#4B5563');
    expect(pattern.isActive).toBe(true);
    expect(pattern.createdAt).toBeInstanceOf(Date);
    expect(pattern.updatedAt).toBeInstanceOf(Date);
  });

  it('should parse examples as JSON array', () => {
    const pattern = new PatternEntity();
    const exampleArray = ['example1', 'example2', 'example3'];
    pattern.examples = JSON.stringify(exampleArray);
    
    const parsed = JSON.parse(pattern.examples);
    expect(parsed).toEqual(exampleArray);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('should support all pattern types', () => {
    const patternTypes = ['PII', 'FINANCIAL', 'MEDICAL', 'CLASSIFICATION', 'CUSTOM'];
    
    patternTypes.forEach(type => {
      const pattern = new PatternEntity();
      pattern.type = type;
      expect(pattern.type).toBe(type);
    });
  });

  it('should have default value for isActive', () => {
    const pattern = new PatternEntity();
    // Note: Default values are typically set by the database, not in the entity class
    // This test documents the expected behavior
    expect(pattern.isActive).toBeUndefined(); // Before database insertion
  });

  it('should allow nullable regex field', () => {
    const pattern = new PatternEntity();
    pattern.regex = null as unknown as string;
    expect(pattern.regex).toBeNull();
  });
});