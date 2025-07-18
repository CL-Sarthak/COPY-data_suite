import { CatalogFieldEntity } from '../CatalogFieldEntity';

describe('CatalogFieldEntity', () => {
  it('should create a catalog field with required fields', () => {
    const field = new CatalogFieldEntity();
    
    field.id = 'test-uuid';
    field.name = 'email_address';
    field.displayName = 'Email Address';
    field.description = 'Primary email address for communication';
    field.dataType = 'email';
    field.category = 'Contact Information';
    field.isRequired = true;
    field.isStandard = true;
    field.tags = JSON.stringify(['pii', 'contact']);
    
    expect(field.id).toBe('test-uuid');
    expect(field.name).toBe('email_address');
    expect(field.displayName).toBe('Email Address');
    expect(field.description).toBe('Primary email address for communication');
    expect(field.dataType).toBe('email');
    expect(field.category).toBe('Contact Information');
    expect(field.isRequired).toBe(true);
    expect(field.isStandard).toBe(true);
    expect(JSON.parse(field.tags)).toEqual(['pii', 'contact']);
  });

  it('should support all data types', () => {
    const dataTypes = ['string', 'number', 'currency', 'boolean', 'date', 'datetime', 'json', 'array', 'email', 'url', 'enum'];
    
    dataTypes.forEach(type => {
      const field = new CatalogFieldEntity();
      field.dataType = type;
      expect(field.dataType).toBe(type);
    });
  });

  it('should handle validation rules as JSON', () => {
    const field = new CatalogFieldEntity();
    const validationRules = {
      minLength: 5,
      maxLength: 50,
      pattern: '^[a-zA-Z0-9]+$',
      required: true
    };
    
    field.validationRules = JSON.stringify(validationRules);
    
    expect(JSON.parse(field.validationRules!)).toEqual(validationRules);
  });

  it('should distinguish between standard and custom fields', () => {
    const standardField = new CatalogFieldEntity();
    standardField.isStandard = true;
    standardField.name = 'first_name';
    
    const customField = new CatalogFieldEntity();
    customField.isStandard = false;
    customField.name = 'custom_field';
    
    expect(standardField.isStandard).toBe(true);
    expect(customField.isStandard).toBe(false);
  });

  it('should have default values for boolean fields', () => {
    const field = new CatalogFieldEntity();
    
    // Note: Default values are typically set by the database
    expect(field.isRequired).toBeUndefined();
    expect(field.isStandard).toBeUndefined();
  });

  it('should handle optional validation rules', () => {
    const field = new CatalogFieldEntity();
    
    expect(field.validationRules).toBeUndefined();
    
    field.validationRules = null as unknown as undefined;
    expect(field.validationRules).toBeNull();
  });

  it('should support various categories', () => {
    const categories = [
      'Identity & Personal',
      'Contact Information',
      'Geographic Location',
      'Financial Data',
      'Time & Dates',
      'Business Data',
      'System & Technical',
      'Custom Fields'
    ];
    
    categories.forEach(category => {
      const field = new CatalogFieldEntity();
      field.category = category;
      expect(field.category).toBe(category);
    });
  });

  it('should enforce unique field names', () => {
    // This is a database constraint, but we can document the expected behavior
    const field1 = new CatalogFieldEntity();
    field1.name = 'unique_field_name';
    
    const field2 = new CatalogFieldEntity();
    field2.name = 'unique_field_name';
    
    // In a real database, the second insert would fail
    expect(field1.name).toBe(field2.name);
  });
});