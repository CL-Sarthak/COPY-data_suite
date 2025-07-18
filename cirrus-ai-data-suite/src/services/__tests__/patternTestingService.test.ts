import { patternTestingService } from '../patternTestingService';

describe('PatternTestingService', () => {
  describe('testPattern', () => {
    it('should find matches for a simple regex pattern', () => {
      const pattern = {
        id: '1',
        name: 'Email Pattern',
        regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
        examples: ['test@example.com'],
        type: 'PII' as const,
        category: 'Email',
        description: 'Email pattern',
        color: 'bg-blue-100 text-blue-800',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const text = 'Contact us at support@company.com or admin@site.org';
      const result = patternTestingService.testPattern(text, pattern);

      expect(result.matches).toHaveLength(2);
      expect(result.matches[0].value).toBe('support@company.com');
      expect(result.matches[1].value).toBe('admin@site.org');
      expect(result.statistics.totalMatches).toBe(2);
    });

    it('should find matches using examples when no regex is provided', () => {
      const pattern = {
        id: '1',
        name: 'Phone Pattern',
        regex: '',
        examples: ['123-456-7890', '(555) 123-4567'],
        type: 'PII' as const,
        category: 'Phone',
        description: 'Phone pattern',
        color: 'bg-blue-100 text-blue-800',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const text = 'Call me at 123-456-7890 or (555) 123-4567';
      const result = patternTestingService.testPattern(text, pattern);

      expect(result.matches).toHaveLength(2);
      expect(result.matches[0].value).toBe('123-456-7890');
      expect(result.matches[1].value).toBe('(555) 123-4567');
    });

    it('should return no matches for non-matching text', () => {
      const pattern = {
        id: '1',
        name: 'Email Pattern',
        regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
        examples: ['test@example.com'],
        type: 'PII' as const,
        category: 'Email',
        description: 'Email pattern',
        color: 'bg-blue-100 text-blue-800',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const text = 'This text has no email addresses';
      const result = patternTestingService.testPattern(text, pattern);

      expect(result.matches).toHaveLength(0);
      expect(result.statistics.totalMatches).toBe(0);
    });

    it('should handle invalid regex gracefully', () => {
      const pattern = {
        id: '1',
        name: 'Invalid Pattern',
        regex: '[invalid regex(',
        examples: [],
        type: 'PII' as const,
        category: 'Invalid',
        description: 'Invalid pattern',
        color: 'bg-blue-100 text-blue-800',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const text = 'Some test text';
      const result = patternTestingService.testPattern(text, pattern);

      expect(result.matches).toHaveLength(0);
      expect(result.statistics.totalMatches).toBe(0);
    });
  });

  describe('learnPatternFromExamples', () => {
    it('should learn SSN pattern from examples', () => {
      const examples = ['123-45-6789', '987-65-4321', '555-12-3456'];
      const pattern = patternTestingService.learnPatternFromExamples(examples);
      
      expect(pattern).toBeTruthy();
      expect(pattern).toContain('\\d{3}');
      expect(pattern).toContain('\\d{2}');
      expect(pattern).toContain('\\d{4}');
    });

    it('should learn phone pattern from examples', () => {
      const examples = ['123-456-7890', '987-654-3210', '555-123-4567'];
      const pattern = patternTestingService.learnPatternFromExamples(examples);
      
      expect(pattern).toBeTruthy();
      expect(pattern).toContain('\\d{3}');
      expect(pattern).toContain('\\d{4}');
    });

    it('should learn email pattern from examples', () => {
      const examples = ['test@example.com', 'user@domain.org', 'admin@site.net'];
      const pattern = patternTestingService.learnPatternFromExamples(examples);
      
      expect(pattern).toBeTruthy();
      expect(pattern).toContain('@');
      expect(pattern).toContain('\\.');
    });

    it('should return null for empty examples', () => {
      const pattern = patternTestingService.learnPatternFromExamples([]);
      expect(pattern).toBeNull();
    });

    it('should return null for inconsistent examples', () => {
      const examples = ['email@test.com', '123-456-7890', 'random text'];
      const pattern = patternTestingService.learnPatternFromExamples(examples);
      expect(pattern).toBeNull();
    });
  });

  describe('getAvailableRedactionStyles', () => {
    it('should return PII redaction styles', () => {
      const styles = patternTestingService.getAvailableRedactionStyles('PII');
      
      expect(styles).toBeDefined();
      expect(styles.length).toBeGreaterThan(0);
      expect(styles[0]).toHaveProperty('type');
      expect(styles[0]).toHaveProperty('format');
    });

    it('should return FINANCIAL redaction styles', () => {
      const styles = patternTestingService.getAvailableRedactionStyles('FINANCIAL');
      
      expect(styles).toBeDefined();
      expect(styles.length).toBeGreaterThan(0);
      expect(styles.some(s => s.format.includes('****'))).toBe(true);
    });

    it('should return CUSTOM styles for unknown types', () => {
      const styles = patternTestingService.getAvailableRedactionStyles('UNKNOWN');
      
      expect(styles).toBeDefined();
      expect(styles.length).toBeGreaterThan(0);
      expect(styles[0].format).toContain('REDACTED');
    });
  });

  describe('testPatternWithML', () => {
    it('should test pattern with ML disabled', async () => {
      const pattern = {
        id: '1',
        name: 'Email Pattern',
        regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
        examples: ['test@example.com'],
        type: 'PII' as const,
        category: 'Email',
        description: 'Email pattern',
        color: 'bg-blue-100 text-blue-800',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const text = 'Contact us at support@company.com';
      const result = await patternTestingService.testPatternWithML(text, pattern, undefined, false);

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].value).toBe('support@company.com');
      expect(result.statistics.mlMatches).toBe(0);
    });
  });
});