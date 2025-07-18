import { DataAnnotationService } from '@/services/dataAnnotationService';
import { PatternService } from '@/services/patternService';
import { PatternFeedbackService } from '@/services/patternFeedbackService';
import { RefinedPatternService } from '@/services/refinedPatternService';
import { PatternLearningService } from '@/services/patternLearningService';
import { SessionService } from '@/services/sessionService';
import { PatternEntity } from '@/entities/PatternEntity';
import { PatternFeedback } from '@/entities/PatternFeedback';
import { getDatabase } from '@/database/connection';
import { SensitivePattern, FileData } from '@/types';

describe('Pattern Detection Integration', () => {
  let connection: any;
  let sessionId: string;
  
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    connection = await getDatabase();
    await connection.runMigrations();
  });
  
  afterAll(async () => {
    if (connection && connection.isInitialized) {
      await connection.destroy();
    }
  });
  
  beforeEach(async () => {
    // Clear data between tests
    await connection.getRepository(PatternEntity).delete({});
    await connection.getRepository(PatternFeedback).delete({});
    
    // Create a test session
    const session = await SessionService.createSession({
      name: 'Test Pattern Session',
      type: 'pattern-detection'
    });
    sessionId = session.id;
  });
  
  describe('Complete Pattern Detection Flow', () => {
    it('should detect, learn, and refine patterns', async () => {
      // Step 1: Create test document with sensitive data
      const testDocument: FileData = {
        name: 'patient-records.txt',
        content: `Patient: John Doe
SSN: 123-45-6789
Email: john.doe@example.com
Phone: (555) 123-4567
Medical Record: MRN-12345
Diagnosis: Hypertension
Treatment Date: 2024-01-15

Patient: Jane Smith
SSN: 987-65-4321
Email: jane.smith@example.com
Phone: (555) 987-6543
Medical Record: MRN-67890
Diagnosis: Diabetes Type 2
Treatment Date: 2024-01-20`,
        type: 'text/plain',
        size: 0
      };
      
      // Step 2: Initialize patterns (simulating user selection)
      const initialPatterns: SensitivePattern[] = [
        {
          id: 'pattern-1',
          label: 'Social Security Number',
          color: 'bg-red-100 text-red-900',
          type: 'PII',
          examples: ['123-45-6789']
        },
        {
          id: 'pattern-2',
          label: 'Email Address',
          color: 'bg-blue-100 text-blue-900',
          type: 'PII',
          examples: ['john.doe@example.com']
        },
        {
          id: 'pattern-3',
          label: 'Medical Record Number',
          color: 'bg-purple-100 text-purple-900',
          type: 'MEDICAL',
          examples: ['MRN-12345']
        }
      ];
      
      // Step 3: Learn patterns from examples
      for (const pattern of initialPatterns) {
        const learned = DataAnnotationService.learnPatternsFromExamples(pattern.examples);
        pattern.regex = learned.regex;
        pattern.regexPatterns = learned.regexPatterns;
      }
      
      // Verify regex learning
      expect(initialPatterns[0].regex).toMatch(/\d{3}-\d{2}-\d{4}/);
      expect(initialPatterns[1].regex).toBeDefined();
      expect(initialPatterns[2].regex).toMatch(/MRN-\d+/);
      
      // Step 4: Find pattern matches in document
      const matches = await DataAnnotationService.findPatternMatches(
        testDocument.content,
        initialPatterns,
        []
      );
      
      // Verify all patterns were detected
      const ssnMatches = matches.filter(m => m.patternLabel === 'Social Security Number');
      const emailMatches = matches.filter(m => m.patternLabel === 'Email Address');
      const mrnMatches = matches.filter(m => m.patternLabel === 'Medical Record Number');
      
      expect(ssnMatches).toHaveLength(2);
      expect(emailMatches).toHaveLength(2);
      expect(mrnMatches).toHaveLength(2);
      
      // Step 5: Save patterns to database
      const savedPatterns = await Promise.all(
        initialPatterns.map(pattern => 
          PatternService.createPattern({
            ...pattern,
            sessionId,
            examples: pattern.examples
          })
        )
      );
      
      expect(savedPatterns).toHaveLength(3);
      
      // Step 6: Simulate user feedback (negative feedback for false positive)
      const falsePositiveText = '555-12-3456'; // Not a real SSN
      const ssnPattern = savedPatterns.find(p => p.label === 'Social Security Number');
      
      // Add multiple negative feedbacks
      for (let i = 0; i < 3; i++) {
        await PatternFeedbackService.createFeedback({
          patternId: ssnPattern!.id,
          matchedText: falsePositiveText,
          feedbackType: 'negative',
          userId: `user-${i}`,
          sessionId
        });
      }
      
      // Step 7: Check auto-refinement
      const refinedPattern = await RefinedPatternService.getRefinedPattern(ssnPattern!.id);
      expect(refinedPattern).toBeDefined();
      expect(refinedPattern!.excludedExamples).toContain(falsePositiveText);
      
      // Step 8: Verify refined pattern excludes false positive
      const refinedMatches = await DataAnnotationService.findPatternMatches(
        '555-12-3456 and 123-45-6789',
        [ssnPattern!],
        [refinedPattern!]
      );
      
      // Should only match the real SSN, not the false positive
      expect(refinedMatches).toHaveLength(1);
      expect(refinedMatches[0].matchedText).toBe('123-45-6789');
    });
    
    it('should handle context clue patterns', async () => {
      const document: FileData = {
        name: 'form.txt',
        content: `Name: John Doe
Social Security: 123-45-6789
Date of Birth: 01/15/1980
Account Number: ACC-123456`,
        type: 'text/plain',
        size: 0
      };
      
      // Create patterns with context clues
      const patterns: SensitivePattern[] = [
        {
          id: 'pattern-1',
          label: 'SSN',
          color: 'bg-red-100 text-red-900',
          type: 'PII',
          examples: ['123-45-6789'],
          regex: '\\d{3}-\\d{2}-\\d{4}'
        },
        {
          id: 'context-1',
          label: 'SSN Label',
          color: 'bg-amber-100 text-amber-900',
          type: 'CUSTOM',
          examples: ['Social Security:'],
          isContextClue: true
        }
      ];
      
      const matches = await DataAnnotationService.findPatternMatches(
        document.content,
        patterns,
        []
      );
      
      // Verify both sensitive data and context clues are detected
      const ssnMatch = matches.find(m => m.patternLabel === 'SSN');
      const contextMatch = matches.find(m => m.patternLabel === 'SSN Label');
      
      expect(ssnMatch).toBeDefined();
      expect(ssnMatch!.matchedText).toBe('123-45-6789');
      expect(ssnMatch!.isContextClue).toBe(false);
      
      expect(contextMatch).toBeDefined();
      expect(contextMatch!.matchedText).toBe('Social Security:');
      expect(contextMatch!.isContextClue).toBe(true);
    });
    
    it('should generate pattern refinement suggestions', async () => {
      // Create a pattern with mixed feedback
      const pattern = await PatternService.createPattern({
        label: 'Phone Number',
        type: 'PII',
        color: 'bg-green-100 text-green-900',
        examples: ['(555) 123-4567', '555-123-4567'],
        regex: '\\(?\\d{3}\\)?[\\s-]?\\d{3}-\\d{4}',
        sessionId
      });
      
      // Add feedback showing pattern is too broad
      const feedbackData = [
        { text: '(555) 123-4567', type: 'positive' as const },
        { text: '555-123-4567', type: 'positive' as const },
        { text: '123-456-7890', type: 'negative' as const }, // Not a phone number
        { text: '999-999-9999', type: 'negative' as const }, // Test number
        { text: '000-000-0000', type: 'negative' as const }  // Invalid
      ];
      
      for (const { text, type } of feedbackData) {
        await PatternFeedbackService.createFeedback({
          patternId: pattern.id,
          matchedText: text,
          feedbackType: type,
          userId: 'test-user',
          sessionId
        });
      }
      
      // Analyze feedback and generate suggestions
      const analysis = await PatternLearningService.analyzePatternFeedback(pattern.id);
      
      expect(analysis.accuracy).toBeLessThan(1); // Not 100% accurate
      expect(analysis.falsePositives).toBeGreaterThan(0);
      expect(analysis.issues).toContain('over_matching');
      
      // Get refinement suggestions
      const suggestions = await PatternLearningService.generateRefinementSuggestions(
        pattern,
        analysis
      );
      
      expect(suggestions.excludedExamples).toHaveLength(3);
      expect(suggestions.improvedRegex).toBeDefined();
      expect(suggestions.validationRules).toBeDefined();
    });
  });
  
  describe('ML Pattern Detection', () => {
    it('should enhance pattern detection with ML', async () => {
      const documents: FileData[] = [
        {
          name: 'doc1.txt',
          content: 'Contact John at john@example.com or call 555-1234',
          type: 'text/plain',
          size: 0
        },
        {
          name: 'doc2.txt',
          content: 'Email jane@example.com for info. Phone: (555) 5678',
          type: 'text/plain',
          size: 0
        }
      ];
      
      const patterns: SensitivePattern[] = [
        {
          id: 'email-pattern',
          label: 'Email',
          color: 'bg-blue-100 text-blue-900',
          type: 'PII',
          examples: ['john@example.com'],
          regex: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'
        }
      ];
      
      // Run ML detection
      const mlResults = await DataAnnotationService.runMLDetection(documents, patterns);
      
      // Verify ML found patterns in all documents
      expect(Object.keys(mlResults)).toHaveLength(2);
      expect(mlResults[0].some(m => m.matchedText === 'john@example.com')).toBe(true);
      expect(mlResults[1].some(m => m.matchedText === 'jane@example.com')).toBe(true);
    });
  });
  
  describe('Pattern Persistence', () => {
    it('should persist and retrieve patterns across sessions', async () => {
      // Create patterns in first session
      await PatternService.createPattern({
        label: 'Credit Card',
        type: 'FINANCIAL',
        color: 'bg-yellow-100 text-yellow-900',
        examples: ['4111-1111-1111-1111', '5500-0000-0000-0004'],
        regex: '\\d{4}-\\d{4}-\\d{4}-\\d{4}',
        sessionId
      });
      
      // Create new session
      await SessionService.createSession({
        name: 'New Session',
        type: 'pattern-detection'
      });
      
      // Load patterns for new session
      const loadedPatterns = await PatternService.getPatternsBySession(sessionId);
      
      expect(loadedPatterns).toHaveLength(1);
      expect(loadedPatterns[0].label).toBe('Credit Card');
      expect(loadedPatterns[0].examples).toHaveLength(2);
      expect(loadedPatterns[0].regex).toBeDefined();
    });
  });
});

