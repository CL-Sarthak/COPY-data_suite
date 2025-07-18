import { AnnotationSession } from '../AnnotationSession';
import { SensitivePattern, FileData } from '@/types';

describe('AnnotationSession', () => {
  it('should create an annotation session with required fields', () => {
    const session = new AnnotationSession();
    
    const patterns: SensitivePattern[] = [
      {
        id: 'pattern-1',
        type: 'PII',
        label: 'Email Address',
        color: 'blue',
        examples: ['user@example.com', 'test@domain.org']
      }
    ];
    
    session.id = 'test-uuid';
    session.name = 'Customer Data Annotation';
    session.patterns = patterns;
    
    expect(session.id).toBe('test-uuid');
    expect(session.name).toBe('Customer Data Annotation');
    expect(session.patterns).toEqual(patterns);
  });

  it('should handle optional description', () => {
    const session = new AnnotationSession();
    
    expect(session.description).toBeUndefined();
    
    session.description = 'Annotating customer PII data';
    expect(session.description).toBe('Annotating customer PII data');
  });

  it('should store training files', () => {
    const session = new AnnotationSession();
    
    const trainingFiles: FileData[] = [
      {
        id: 'file-1',
        name: 'customers.csv',
        content: 'name,email\nJohn Doe,john@example.com',
        type: 'text/csv' as unknown as 'csv' | 'json' | 'text',
        size: 100
      }
    ];
    
    session.trainingFiles = trainingFiles;
    expect(session.trainingFiles).toEqual(trainingFiles);
  });

  it('should handle multiple patterns', () => {
    const session = new AnnotationSession();
    
    const patterns: SensitivePattern[] = [
      {
        id: 'pattern-1',
        type: 'PII',
        label: 'Email Address',
        color: 'blue',
        examples: ['test@example.com']
      },
      {
        id: 'pattern-2',
        type: 'FINANCIAL',
        label: 'Credit Card',
        color: 'red',
        examples: ['4111111111111111']
      },
      {
        id: 'pattern-3',
        type: 'MEDICAL',
        label: 'SSN',
        color: 'green',
        examples: ['123-45-6789']
      }
    ];
    
    session.patterns = patterns;
    expect(session.patterns).toHaveLength(3);
    expect(session.patterns[0].type).toBe('PII');
    expect(session.patterns[1].type).toBe('FINANCIAL');
    expect(session.patterns[2].type).toBe('MEDICAL');
  });

  it('should track timestamps', () => {
    const session = new AnnotationSession();
    const now = new Date();
    
    session.createdAt = now;
    session.updatedAt = now;
    
    expect(session.createdAt).toBe(now);
    expect(session.updatedAt).toBe(now);
  });

  it('should handle empty patterns array', () => {
    const session = new AnnotationSession();
    
    session.patterns = [];
    expect(session.patterns).toEqual([]);
    expect(Array.isArray(session.patterns)).toBe(true);
  });

  it('should handle null training files', () => {
    const session = new AnnotationSession();
    
    session.trainingFiles = undefined;
    expect(session.trainingFiles).toBeUndefined();
  });
});