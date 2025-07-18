// Test redaction utility functions
describe('Redaction Utilities', () => {
  describe('Text masking', () => {
    it('should mask text with asterisks', () => {
      const maskText = (text: string): string => {
        return '*'.repeat(text.length);
      };
      
      expect(maskText('sensitive')).toBe('*********');
      expect(maskText('email@test.com')).toBe('**************');
      expect(maskText('')).toBe('');
    });

    it('should partially mask text keeping first and last characters', () => {
      const partialMask = (text: string): string => {
        if (text.length <= 3) return '*'.repeat(text.length);
        const first = text.slice(0, 1);
        const last = text.slice(-1);
        const middle = '*'.repeat(text.length - 2);
        return first + middle + last;
      };
      
      expect(partialMask('test@email.com')).toBe('t************m');
      expect(partialMask('secret')).toBe('s****t');
      expect(partialMask('hi')).toBe('**');
    });
  });

  describe('Text replacement', () => {
    it('should replace sensitive text with placeholders', () => {
      const replaceWithPlaceholder = (text: string, placeholder = '[REDACTED]'): string => {
        return placeholder;
      };
      
      expect(replaceWithPlaceholder('sensitive data')).toBe('[REDACTED]');
      expect(replaceWithPlaceholder('test', '[REMOVED]')).toBe('[REMOVED]');
    });
  });

  describe('Text removal', () => {
    it('should remove sensitive text completely', () => {
      const removeText = (): string => {
        return '';
      };
      
      expect(removeText()).toBe('');
    });
  });

  describe('Confidence scoring', () => {
    it('should calculate confidence scores for pattern matches', () => {
      const calculateConfidence = (pattern: string, text: string): number => {
        if (pattern === text) return 1.0;
        if (text.includes(pattern)) return 0.8;
        if (pattern.includes(text)) return 0.6;
        return 0.3;
      };
      
      expect(calculateConfidence('test', 'test')).toBe(1.0);
      expect(calculateConfidence('test', 'testing')).toBe(0.8);
      expect(calculateConfidence('testing', 'test')).toBe(0.6);
      expect(calculateConfidence('hello', 'world')).toBe(0.3);
    });
  });

  describe('Pattern validation', () => {
    it('should validate pattern consistency', () => {
      const validatePatternConsistency = (examples: string[]): boolean => {
        if (examples.length === 0) return false;
        if (examples.length === 1) return true;
        
        // Check if all examples are emails
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
        const allEmails = examples.every(ex => emailRegex.test(ex));
        
        // Check if all examples are phones
        const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
        const allPhones = examples.every(ex => phoneRegex.test(ex));
        
        return allEmails || allPhones;
      };
      
      expect(validatePatternConsistency(['test@email.com', 'user@domain.org'])).toBe(true);
      expect(validatePatternConsistency(['123-456-7890', '555-123-4567'])).toBe(true);
      expect(validatePatternConsistency(['test@email.com', '123-456-7890'])).toBe(false);
      expect(validatePatternConsistency([])).toBe(false);
      expect(validatePatternConsistency(['single@email.com'])).toBe(true);
    });
  });

  describe('Data source validation', () => {
    it('should validate data source configuration', () => {
      const validateDataSourceConfig = (config: { name?: string; type?: string; configuration?: object }): boolean => {
        return !!(config.name && config.type && config.configuration);
      };
      
      expect(validateDataSourceConfig({
        name: 'Test DB',
        type: 'database',
        configuration: { host: 'localhost' }
      })).toBe(true);
      
      expect(validateDataSourceConfig({
        name: 'Test DB',
        type: 'database'
      })).toBe(false);
      
      expect(validateDataSourceConfig({
        type: 'database',
        configuration: { host: 'localhost' }
      })).toBe(false);
    });
  });
});