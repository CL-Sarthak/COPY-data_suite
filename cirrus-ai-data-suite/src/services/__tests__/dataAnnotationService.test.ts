import { DataAnnotationService } from '../dataAnnotationService';
import { SensitivePattern } from '@/types';
import { PREDEFINED_PATTERNS } from '@/types/dataAnnotation';
import { PatternLearningService } from '@/services/patternLearningService';
import { RefinedPatternClient } from '@/services/refinedPatternClient';

// Mock dependencies
jest.mock('@/services/patternTestingService', () => ({
  patternTestingService: {
    findMatches: jest.fn(),
    findMatchesML: jest.fn()
  }
}));
jest.mock('@/services/patternLearningService');
jest.mock('@/services/refinedPatternClient');

// Mock fetch
global.fetch = jest.fn();

describe('DataAnnotationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializePatterns', () => {
    it('should return predefined patterns when no initial patterns provided', () => {
      const patterns = DataAnnotationService.initializePatterns();
      
      expect(patterns).toHaveLength(PREDEFINED_PATTERNS.length);
      expect(patterns[0]).toMatchObject({
        id: 'pattern-0',
        label: PREDEFINED_PATTERNS[0].label,
        color: PREDEFINED_PATTERNS[0].color,
        type: PREDEFINED_PATTERNS[0].type,
        examples: [],
        existingExamples: []
      });
    });

    it('should merge initial patterns with predefined patterns', () => {
      const initialPatterns: SensitivePattern[] = [
        {
          id: 'db-123',
          label: 'Email Address',
          color: 'bg-blue-100 text-blue-800',
          type: 'PII',
          examples: ['test@example.com'],
          regex: '\\b[\\w._%+-]+@[\\w.-]+\\.[A-Z]{2,}\\b'
        }
      ];

      const patterns = DataAnnotationService.initializePatterns(initialPatterns);
      
      // Should have all predefined patterns
      expect(patterns.length).toBeGreaterThanOrEqual(PREDEFINED_PATTERNS.length);
      
      // Email pattern should be updated with examples
      const emailPattern = patterns.find(p => p.label === 'Email Address');
      expect(emailPattern).toBeDefined();
      expect(emailPattern!.id).toBe('db-123'); // Should keep database ID
      expect(emailPattern!.examples).toEqual(['test@example.com']);
      expect(emailPattern!.existingExamples).toEqual(['test@example.com']);
      expect(emailPattern!.regex).toBe('\\b[\\w._%+-]+@[\\w.-]+\\.[A-Z]{2,}\\b');
    });

    it('should add custom patterns that dont exist in predefined list', () => {
      const customPattern: SensitivePattern = {
        id: 'custom-123',
        label: 'Employee ID',
        color: 'bg-green-100 text-green-800',
        type: 'CUSTOM',
        examples: ['EMP-12345']
      };

      const patterns = DataAnnotationService.initializePatterns([customPattern]);
      
      // Custom pattern should be at the beginning
      expect(patterns[0]).toMatchObject({
        id: 'custom-123',
        label: 'Employee ID',
        examples: ['EMP-12345'],
        existingExamples: ['EMP-12345']
      });
    });

    it('should remove duplicate patterns by label', () => {
      const duplicatePatterns: SensitivePattern[] = [
        {
          id: 'db-1',
          label: 'Email Address',
          color: 'bg-blue-100 text-blue-800',
          type: 'PII',
          examples: ['test1@example.com']
        },
        {
          id: 'db-2',
          label: 'Email Address',
          color: 'bg-blue-100 text-blue-800',
          type: 'PII',
          examples: ['test2@example.com']
        }
      ];

      const patterns = DataAnnotationService.initializePatterns(duplicatePatterns);
      
      // Should only have one Email Address pattern
      const emailPatterns = patterns.filter(p => p.label === 'Email Address');
      expect(emailPatterns).toHaveLength(1);
    });
  });

  describe('learnPatternsFromExamples', () => {
    it('should return empty regex when no examples provided', () => {
      const result = DataAnnotationService.learnPatternsFromExamples([]);
      
      expect(result.regex).toBeUndefined();
      expect(result.regexPatterns).toBeUndefined();
    });

    it('should learn patterns from examples', () => {
      const mockLearnedPatterns = [
        { regex: '\\d{3}-\\d{2}-\\d{4}' },
        { regex: '\\d{9}' }
      ];
      
      (PatternLearningService.learnMultiplePatterns as jest.Mock).mockReturnValue(mockLearnedPatterns);

      const result = DataAnnotationService.learnPatternsFromExamples(['123-45-6789', '987654321']);
      
      expect(PatternLearningService.learnMultiplePatterns).toHaveBeenCalledWith(['123-45-6789', '987654321']);
      expect(result.regex).toBe('\\d{3}-\\d{2}-\\d{4}');
      expect(result.regexPatterns).toEqual(['\\d{3}-\\d{2}-\\d{4}', '\\d{9}']);
    });

    it('should handle errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (PatternLearningService.learnMultiplePatterns as jest.Mock).mockImplementation(() => {
        throw new Error('Learning failed');
      });

      const result = DataAnnotationService.learnPatternsFromExamples(['test']);
      
      expect(result.regex).toBeUndefined();
      expect(result.regexPatterns).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('Error learning pattern from examples:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('addExampleToPattern', () => {
    it('should add example and update regex', () => {
      const pattern: SensitivePattern = {
        id: 'test-1',
        label: 'SSN',
        color: 'bg-red-100 text-red-800',
        type: 'PII',
        examples: ['123-45-6789']
      };

      (PatternLearningService.learnMultiplePatterns as jest.Mock).mockReturnValue([
        { regex: '\\d{3}-\\d{2}-\\d{4}' }
      ]);

      const updated = DataAnnotationService.addExampleToPattern(pattern, '987-65-4321');
      
      expect(updated.examples).toEqual(['123-45-6789', '987-65-4321']);
      expect(updated.regex).toBe('\\d{3}-\\d{2}-\\d{4}');
    });
  });

  describe('removeExampleFromPattern', () => {
    it('should remove example and update regex', () => {
      const pattern: SensitivePattern = {
        id: 'test-1',
        label: 'SSN',
        color: 'bg-red-100 text-red-800',
        type: 'PII',
        examples: ['123-45-6789', '987-65-4321'],
        regex: '\\d{3}-\\d{2}-\\d{4}'
      };

      (PatternLearningService.learnMultiplePatterns as jest.Mock).mockReturnValue([
        { regex: '\\d{3}-\\d{2}-\\d{4}' }
      ]);

      const updated = DataAnnotationService.removeExampleFromPattern(pattern, 1);
      
      expect(updated.examples).toEqual(['123-45-6789']);
      expect(PatternLearningService.learnMultiplePatterns).toHaveBeenCalledWith(['123-45-6789']);
    });

    it('should clear regex when all examples removed', () => {
      const pattern: SensitivePattern = {
        id: 'test-1',
        label: 'SSN',
        color: 'bg-red-100 text-red-800',
        type: 'PII',
        examples: ['123-45-6789'],
        regex: '\\d{3}-\\d{2}-\\d{4}'
      };

      const updated = DataAnnotationService.removeExampleFromPattern(pattern, 0);
      
      expect(updated.examples).toEqual([]);
      expect(updated.regex).toBeUndefined();
      expect(updated.regexPatterns).toBeUndefined();
    });
  });

  describe('createCustomPattern', () => {
    it('should create a custom pattern with unique ID', () => {
      const pattern = DataAnnotationService.createCustomPattern('Employee ID');
      
      expect(pattern.id).toMatch(/^custom-\d+$/);
      expect(pattern.label).toBe('Employee ID');
      expect(pattern.color).toBe('bg-blue-100 text-blue-900');
      expect(pattern.type).toBe('CUSTOM');
      expect(pattern.examples).toEqual([]);
    });
  });

  describe('getPatternsWithExamples', () => {
    it('should filter patterns that have examples', () => {
      const patterns: SensitivePattern[] = [
        { id: '1', label: 'SSN', color: '', type: 'PII', examples: ['123-45-6789'] },
        { id: '2', label: 'Email', color: '', type: 'PII', examples: [] },
        { id: '3', label: 'Phone', color: '', type: 'PII', examples: ['555-1234'] }
      ];

      const filtered = DataAnnotationService.getPatternsWithExamples(patterns);
      
      expect(filtered).toHaveLength(2);
      expect(filtered[0].label).toBe('SSN');
      expect(filtered[1].label).toBe('Phone');
    });
  });

  describe('findPatternMatches', () => {
    it('should find matches for patterns with examples', async () => {
      const patterns: SensitivePattern[] = [
        { id: '1', label: 'SSN', color: 'bg-red-100', type: 'PII', examples: ['123-45-6789'] }
      ];

      const matches = await DataAnnotationService.findPatternMatches(
        'My SSN is 123-45-6789',
        patterns,
        []
      );
      
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        patternId: '1',
        patternLabel: 'SSN',
        matchedText: '123-45-6789',
        startIndex: 10,
        endIndex: 21,
        confidence: 0.98, // Case-sensitive exact match has confidence 0.98
        color: 'bg-red-100'
      });
    });

    it('should exclude refined pattern exclusions', async () => {
      const patterns: SensitivePattern[] = [
        { id: '1', label: 'SSN', color: 'bg-red-100', type: 'PII', examples: [], regex: '\\d{3}-\\d{2}-\\d{4}' }
      ];
      
      const refinedPatterns = [
        { id: '1', excludedExamples: ['123-45-6789'], label: 'SSN', examples: [], regex: '\\d{3}-\\d{2}-\\d{4}' }
      ];

      const matches = await DataAnnotationService.findPatternMatches(
        'My SSN is 123-45-6789 and 987-65-4321',
        patterns,
        refinedPatterns as any
      );
      
      // Should only include the non-excluded match
      expect(matches).toHaveLength(1);
      expect(matches[0].matchedText).toBe('987-65-4321');
    });

    it('should skip patterns without examples or regex', async () => {
      const patterns: SensitivePattern[] = [
        { id: '1', label: 'SSN', color: 'bg-red-100', type: 'PII', examples: [] }
      ];
      
      const matches = await DataAnnotationService.findPatternMatches(
        'My SSN is 123-45-6789',
        patterns,
        []
      );
      
      expect(matches).toEqual([]);
    });
  });

  describe('applyHighlighting', () => {
    it('should apply highlighting to matched text', () => {
      const matches = [
        {
          patternId: '1',
          patternLabel: 'SSN',
          matchedText: '123-45-6789',
          startIndex: 10,
          endIndex: 21,
          confidence: 0.9,
          color: 'bg-red-100 text-red-800'
        }
      ];

      const highlighted = DataAnnotationService.applyHighlighting(
        'My SSN is 123-45-6789.',
        matches
      );
      
      expect(highlighted).toContain('My SSN is ');
      expect(highlighted).toContain('<span class="highlight-annotation bg-red-100 text-red-800 px-1 rounded cursor-pointer');
      expect(highlighted).toContain('>123-45-6789</span>');
      expect(highlighted).toContain('.');
    });

    it('should handle multiple matches', () => {
      const matches = [
        {
          patternId: '1',
          patternLabel: 'SSN',
          matchedText: '123-45-6789',
          startIndex: 0,
          endIndex: 11,
          confidence: 0.9,
          color: 'bg-red-100'
        },
        {
          patternId: '2',
          patternLabel: 'Email',
          matchedText: 'test@example.com',
          startIndex: 16,
          endIndex: 32,
          confidence: 0.8,
          color: 'bg-blue-100'
        }
      ];

      const highlighted = DataAnnotationService.applyHighlighting(
        '123-45-6789 and test@example.com',
        matches
      );
      
      expect(highlighted).toContain('<span class="highlight-annotation bg-red-100');
      expect(highlighted).toContain('>123-45-6789</span>');
      expect(highlighted).toContain(' and ');
      expect(highlighted).toContain('<span class="highlight-annotation bg-blue-100');
      expect(highlighted).toContain('>test@example.com</span>');
    });

    it('should add proper data attributes', () => {
      const matches = [
        {
          patternId: '1',
          patternLabel: 'SSN',
          matchedText: '123-45-6789',
          startIndex: 0,
          endIndex: 11,
          confidence: 0.9,
          color: 'bg-red-100'
        }
      ];

      const highlighted = DataAnnotationService.applyHighlighting(
        '123-45-6789',
        matches
      );
      
      expect(highlighted).toContain('data-pattern="SSN"');
      expect(highlighted).toContain('data-pattern-id="1"');
      expect(highlighted).toContain('data-confidence="0.9"');
    });
  });

  describe('storeFeedback', () => {
    it('should store feedback via API', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await DataAnnotationService.storeFeedback(
        'pattern-1',
        'SSN',
        '123-45-6789',
        'positive',
        'user123'
      );
      
      expect(fetch).toHaveBeenCalledWith('/api/patterns/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patternId: 'pattern-1',
          patternLabel: 'SSN',
          matchedText: '123-45-6789',
          feedbackType: 'positive',
          userId: 'user123'
        })
      });
    });

    it('should use anonymous userId when not provided', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await DataAnnotationService.storeFeedback(
        'pattern-1',
        'SSN',
        '123-45-6789',
        'negative'
      );
      
      const call = (fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.userId).toBe('anonymous');
    });

    it('should throw error on failed response', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request'
      });

      await expect(
        DataAnnotationService.storeFeedback('1', 'SSN', '123', 'positive')
      ).rejects.toThrow('Failed to store feedback');
      
      consoleSpy.mockRestore();
    });
  });

  describe('loadRefinedPatterns', () => {
    it('should load refined patterns from client', async () => {
      const mockRefinedPatterns = [
        { pattern_id: '1', exclusions: ['123-45-6789'] }
      ];
      
      (RefinedPatternClient.getAllRefinedPatterns as jest.Mock).mockResolvedValue(mockRefinedPatterns);

      const patterns = await DataAnnotationService.loadRefinedPatterns();
      
      expect(patterns).toEqual(mockRefinedPatterns);
    });

    it('should return empty array on error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (RefinedPatternClient.getAllRefinedPatterns as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const patterns = await DataAnnotationService.loadRefinedPatterns();
      
      expect(patterns).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error loading refined patterns:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});