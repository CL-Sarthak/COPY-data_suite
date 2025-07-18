import { FieldMappingEntity } from '../FieldMappingEntity';

describe('FieldMappingEntity', () => {
  it('should create a field mapping with required fields', () => {
    const mapping = new FieldMappingEntity();
    
    mapping.id = 'test-uuid';
    mapping.sourceId = 'source-uuid';
    mapping.sourceFieldName = 'Email';
    mapping.catalogFieldId = 'catalog-field-uuid';
    mapping.confidence = 0.95;
    mapping.isManual = false;
    mapping.isActive = true;
    
    expect(mapping.id).toBe('test-uuid');
    expect(mapping.sourceId).toBe('source-uuid');
    expect(mapping.sourceFieldName).toBe('Email');
    expect(mapping.catalogFieldId).toBe('catalog-field-uuid');
    expect(mapping.confidence).toBe(0.95);
    expect(mapping.isManual).toBe(false);
    expect(mapping.isActive).toBe(true);
  });

  it('should handle confidence scores', () => {
    const mapping = new FieldMappingEntity();
    
    // Test various confidence levels
    const confidenceScores = [0.0, 0.25, 0.5, 0.75, 0.95, 1.0];
    
    confidenceScores.forEach(score => {
      mapping.confidence = score;
      expect(mapping.confidence).toBe(score);
      expect(mapping.confidence).toBeGreaterThanOrEqual(0.0);
      expect(mapping.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  it('should store transformation rules as JSON', () => {
    const mapping = new FieldMappingEntity();
    const transformationRules = {
      type: 'format',
      operation: 'lowercase',
      trim: true,
      removeSpaces: false
    };
    
    mapping.transformationRule = JSON.stringify(transformationRules);
    
    expect(JSON.parse(mapping.transformationRule!)).toEqual(transformationRules);
  });

  it('should distinguish between manual and auto-detected mappings', () => {
    const autoMapping = new FieldMappingEntity();
    autoMapping.isManual = false;
    autoMapping.confidence = 0.85;
    
    const manualMapping = new FieldMappingEntity();
    manualMapping.isManual = true;
    manualMapping.confidence = 1.0;
    
    expect(autoMapping.isManual).toBe(false);
    expect(manualMapping.isManual).toBe(true);
    expect(manualMapping.confidence).toBe(1.0); // Manual mappings typically have high confidence
  });

  it('should track active/inactive status', () => {
    const mapping = new FieldMappingEntity();
    
    // Active mapping
    mapping.isActive = true;
    expect(mapping.isActive).toBe(true);
    
    // Inactive mapping
    mapping.isActive = false;
    expect(mapping.isActive).toBe(false);
  });

  it('should have default values', () => {
    const mapping = new FieldMappingEntity();
    
    // Note: Default values are typically set by the database
    expect(mapping.confidence).toBeUndefined(); // Default 0.0 in DB
    expect(mapping.isManual).toBeUndefined(); // Default false in DB
    expect(mapping.isActive).toBeUndefined(); // Default true in DB
  });

  it('should handle optional transformation rules', () => {
    const mapping = new FieldMappingEntity();
    
    // No transformation rules initially
    expect(mapping.transformationRule).toBeUndefined();
    
    // Can be set to null
    mapping.transformationRule = null as unknown as undefined;
    expect(mapping.transformationRule).toBeNull();
  });

  it('should track timestamps', () => {
    const mapping = new FieldMappingEntity();
    const now = new Date();
    
    mapping.createdAt = now;
    mapping.updatedAt = now;
    
    expect(mapping.createdAt).toBe(now);
    expect(mapping.updatedAt).toBe(now);
    expect(mapping.createdAt).toBeInstanceOf(Date);
    expect(mapping.updatedAt).toBeInstanceOf(Date);
  });

  it('should have composite unique constraint on sourceId and sourceFieldName', () => {
    // This is enforced at the database level
    // Document the expected behavior: only one mapping per source field
    const mapping1 = new FieldMappingEntity();
    mapping1.sourceId = 'source-1';
    mapping1.sourceFieldName = 'email';
    
    const mapping2 = new FieldMappingEntity();
    mapping2.sourceId = 'source-1';
    mapping2.sourceFieldName = 'email';
    
    // In a real database, the second insert would fail due to unique constraint
    expect(mapping1.sourceId).toBe(mapping2.sourceId);
    expect(mapping1.sourceFieldName).toBe(mapping2.sourceFieldName);
  });
});