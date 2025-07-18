import { SensitivePattern, FileData } from '@/types';
import { PatternMatch, PREDEFINED_PATTERNS } from '@/types/dataAnnotation';
import { PatternLearningService } from '@/services/patternLearningService';
import { RefinedPatternClient, RefinedPattern } from '@/services/refinedPatternClient';
import { FeedbackType } from '@/types/feedback';

export class DataAnnotationService {
  /**
   * Initialize patterns with predefined defaults and merge with existing patterns
   */
  static initializePatterns(initialPatterns?: SensitivePattern[]): SensitivePattern[] {
    // Always start with all predefined patterns
    const defaultPatterns: SensitivePattern[] = PREDEFINED_PATTERNS.map((pattern, index) => ({
      ...pattern,
      id: `pattern-${index}`,
      type: pattern.type as "PII" | "FINANCIAL" | "MEDICAL" | "CLASSIFICATION" | "CUSTOM",
      examples: [] as string[],
      existingExamples: [] as string[], // Track examples that came from existing patterns
    }));

    if (!initialPatterns || initialPatterns.length === 0) {
      return defaultPatterns;
    }

    // Merge session patterns with predefined patterns
    const mergedPatterns = [...defaultPatterns];
    
    // Update predefined patterns with examples from session
    initialPatterns.forEach(sessionPattern => {
      // Try to match by ID first (more reliable), then by label as fallback
      let existingIndex = mergedPatterns.findIndex(p => p.id === sessionPattern.id);
      if (existingIndex === -1) {
        existingIndex = mergedPatterns.findIndex(p => p.label === sessionPattern.label && p.type === sessionPattern.type);
      }
      
      if (existingIndex >= 0) {
        // Verify we're updating the right pattern by checking type compatibility
        if (mergedPatterns[existingIndex].type === sessionPattern.type) {
          // Update existing predefined pattern with examples AND regex
          // IMPORTANT: Keep the database ID if the session pattern has one
          mergedPatterns[existingIndex] = { 
            ...mergedPatterns[existingIndex], 
            id: sessionPattern.id, // Use the database ID from the saved pattern
            examples: [...sessionPattern.examples], // Create new array to avoid reference issues
            existingExamples: [...sessionPattern.examples], // Mark these as existing
            regex: sessionPattern.regex,
            regexPatterns: sessionPattern.regexPatterns
          };
        } else {
          // Add as new pattern due to type mismatch
          mergedPatterns.unshift({
            ...sessionPattern,
            id: `session-${sessionPattern.id}`, // Ensure unique ID
            existingExamples: [...sessionPattern.examples] // Mark these as existing
          });
        }
      } else {
        // Add custom patterns that don't exist in predefined list
        mergedPatterns.unshift({
          ...sessionPattern,
          existingExamples: [...sessionPattern.examples] // Mark these as existing
        });
      }
    });
    
    // Remove duplicate patterns by label (keep the one with correct examples)
    const uniquePatterns = [];
    const seenLabels = new Set();
    
    for (const pattern of mergedPatterns) {
      if (!seenLabels.has(pattern.label)) {
        uniquePatterns.push(pattern);
        seenLabels.add(pattern.label);
      }
    }
    
    return uniquePatterns;
  }

  /**
   * Learn regex patterns from examples
   */
  static learnPatternsFromExamples(examples: string[]): { regex?: string; regexPatterns?: string[] } {
    if (examples.length === 0) {
      return { regex: undefined, regexPatterns: undefined };
    }

    try {
      if (typeof PatternLearningService !== 'undefined' && PatternLearningService.learnMultiplePatterns) {
        const learnedPatterns = PatternLearningService.learnMultiplePatterns(examples);
        if (learnedPatterns.length > 0) {
          return {
            regex: learnedPatterns[0].regex,
            regexPatterns: learnedPatterns.map(lp => lp.regex)
          };
        }
      }
    } catch (error) {
      console.error('Error learning pattern from examples:', error);
    }

    return { regex: undefined, regexPatterns: undefined };
  }

  /**
   * Add an example to a pattern and update its regex
   */
  static addExampleToPattern(pattern: SensitivePattern, newExample: string): SensitivePattern {
    const newExamples = [...pattern.examples, newExample];
    const { regex, regexPatterns } = this.learnPatternsFromExamples(newExamples);
    
    return { 
      ...pattern, 
      examples: newExamples,
      regex,
      regexPatterns
    };
  }

  /**
   * Remove an example from a pattern and update its regex
   */
  static removeExampleFromPattern(pattern: SensitivePattern, exampleIndex: number): SensitivePattern {
    const newExamples = pattern.examples.filter((_, i) => i !== exampleIndex);
    const { regex, regexPatterns } = this.learnPatternsFromExamples(newExamples);
    
    return { 
      ...pattern, 
      examples: newExamples, 
      regex, 
      regexPatterns 
    };
  }

  /**
   * Create a custom pattern
   */
  static createCustomPattern(label: string): SensitivePattern {
    return {
      id: `custom-${Date.now()}`,
      label,
      color: 'bg-blue-100 text-blue-900',
      type: 'CUSTOM',
      examples: [],
    };
  }

  /**
   * Get patterns that have examples
   */
  static getPatternsWithExamples(patterns: SensitivePattern[]): SensitivePattern[] {
    return patterns.filter(pattern => pattern.examples.length > 0);
  }

  /**
   * Check if context keywords are present near a match
   */
  private static hasContextNearMatch(
    text: string,
    matchIndex: number,
    contextKeywords: string[],
    windowSize: number = 50
  ): boolean {
    if (!contextKeywords || contextKeywords.length === 0) {
      return true; // No context required
    }
    
    // Get surrounding text
    const start = Math.max(0, matchIndex - windowSize);
    const end = Math.min(text.length, matchIndex + windowSize);
    const surroundingText = text.substring(start, end).toLowerCase();
    
    // Check if any context keyword is present
    return contextKeywords.some(keyword => 
      surroundingText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Find pattern matches in text
   */
  static async findPatternMatches(
    text: string, 
    patterns: SensitivePattern[],
    refinedPatterns: RefinedPattern[]
  ): Promise<PatternMatch[]> {
    const allMatches: PatternMatch[] = [];
    
    for (const pattern of patterns) {
      // Get refined pattern exclusions
      const refinedPattern = refinedPatterns.find(rp => rp.id === pattern.id);
      const exclusions = refinedPattern?.excludedExamples || [];
      const isContextClue = pattern.isContextClue || false;
      const contextKeywords = pattern.contextKeywords || [];
      
      // First, try regex if available
      if (pattern.regex) {
        try {
          const regex = new RegExp(pattern.regex, 'gi');
          let match: RegExpExecArray | null;
          
          while ((match = regex.exec(text)) !== null) {
            const matchedText = match[0];
            
            // Skip if this text is in exclusions
            if (exclusions.includes(matchedText)) {
              console.log(`Skipping excluded match: "${matchedText}" for pattern ${pattern.label}`);
              continue;
            }
            
            // Check context if required
            if (contextKeywords.length > 0) {
              if (!this.hasContextNearMatch(text, match.index, contextKeywords)) {
                continue; // Skip this match if context is not present
              }
            }
            
            allMatches.push({
              patternId: pattern.id,
              patternLabel: pattern.label,
              startIndex: match.index,
              endIndex: match.index + matchedText.length,
              matchedText: matchedText,
              confidence: contextKeywords.length > 0 ? 0.98 : 0.95,
              color: pattern.color,
              isContextClue: isContextClue
            });
            
            // Safety check for zero-length matches
            if (matchedText.length === 0) {
              regex.lastIndex++;
            }
          }
        } catch (error) {
          console.error(`Invalid regex for pattern ${pattern.label}:`, error);
        }
      }
      
      // Also check examples for exact matching
      if (pattern.examples && pattern.examples.length > 0) {
        for (const example of pattern.examples) {
          // Skip if this example is in exclusions
          if (exclusions.includes(example)) {
            continue;
          }
          
          // Case-sensitive exact matches
          let searchIndex = 0;
          while (true) {
            const index = text.indexOf(example, searchIndex);
            if (index === -1) break;
            
            // Check if already matched by regex
            const alreadyMatched = allMatches.some(m => 
              m.patternId === pattern.id &&
              m.startIndex === index &&
              m.endIndex === index + example.length
            );
            
            if (!alreadyMatched) {
              // Check context if required
              if (contextKeywords.length > 0) {
                if (!this.hasContextNearMatch(text, index, contextKeywords)) {
                  searchIndex = index + 1;
                  continue; // Skip this match if context is not present
                }
              }
              
              allMatches.push({
                patternId: pattern.id,
                patternLabel: pattern.label,
                startIndex: index,
                endIndex: index + example.length,
                matchedText: example,
                confidence: contextKeywords.length > 0 ? 1.0 : 0.98,
                color: pattern.color,
                isContextClue: isContextClue
              });
            }
            
            searchIndex = index + 1;
          }
          
          // Case-insensitive matches (if different from exact)
          const lowerText = text.toLowerCase();
          const lowerExample = example.toLowerCase();
          if (example !== lowerExample) {
            searchIndex = 0;
            while (true) {
              const index = lowerText.indexOf(lowerExample, searchIndex);
              if (index === -1) break;
              
              const actualText = text.substring(index, index + example.length);
              
              // Skip if this text is in exclusions
              if (exclusions.includes(actualText)) {
                searchIndex = index + 1;
                continue;
              }
              
              // Check if already matched
              const alreadyMatched = allMatches.some(m => 
                m.patternId === pattern.id &&
                m.startIndex === index &&
                m.endIndex === index + example.length
              );
              
              if (!alreadyMatched && actualText !== example) {
                allMatches.push({
                  patternId: pattern.id,
                  patternLabel: pattern.label,
                  startIndex: index,
                  endIndex: index + example.length,
                  matchedText: actualText,
                  confidence: 0.9,
                  color: pattern.color,
                  isContextClue: isContextClue
                });
              }
              
              searchIndex = index + 1;
            }
          }
        }
      }
    }
    
    // Sort by start index to maintain text order
    return allMatches.sort((a, b) => a.startIndex - b.startIndex);
  }

  /**
   * Apply pattern matches to text and generate highlighted HTML
   */
  static applyHighlighting(text: string, matches: PatternMatch[]): string {
    // Helper to escape HTML
    const escapeHtml = (str: string) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };
    
    if (matches.length === 0) {
      // If no matches, return escaped HTML
      return escapeHtml(text);
    }
    
    // Sort matches by position (ascending) to process in order
    const sortedMatches = [...matches].sort((a, b) => a.startIndex - b.startIndex);
    
    let result = '';
    let lastEnd = 0;
    
    for (const match of sortedMatches) {
      // Skip overlapping matches
      if (match.startIndex < lastEnd) continue;
      
      // Add text before match
      if (match.startIndex > lastEnd) {
        result += escapeHtml(text.substring(lastEnd, match.startIndex));
      }
      
      const matchText = text.substring(match.startIndex, match.endIndex);
      
      // Check if this is a persisted pattern (not client-side temporary)
      const isPersistedPattern = !match.patternId.startsWith('pattern-') && !match.patternId.startsWith('custom-');
      const isContextClue = match.isContextClue || false;
      
      // Different tooltips for context clues vs sensitive data
      let tooltip;
      if (isContextClue) {
        tooltip = `Context Clue: ${match.patternLabel} - This provides context but is not sensitive itself`;
      } else {
        tooltip = isPersistedPattern 
          ? `Pattern: ${match.patternLabel} (${Math.round((match.confidence || 1) * 100)}% confidence) - Click for feedback`
          : `Pattern: ${match.patternLabel} (${Math.round((match.confidence || 1) * 100)}% confidence) - Save pattern to enable feedback`;
      }
      
      // Different styling for context clues (dashed border, different background)
      const highlightClass = isContextClue 
        ? 'highlight-annotation bg-amber-50 text-amber-900 px-1 rounded cursor-pointer font-medium border-2 border-dashed border-amber-400 hover:opacity-80 transition-opacity'
        : `highlight-annotation ${match.color} px-1 rounded cursor-pointer font-medium border border-opacity-30 hover:opacity-80 transition-opacity`;
      
      const highlightedSpan = `<span class="${highlightClass}" ${!isContextClue ? 'style="border-color: currentColor;"' : ''} title="${tooltip}" data-pattern="${escapeHtml(match.patternLabel)}" data-pattern-id="${match.patternId}" data-confidence="${match.confidence || 1}" ${isContextClue ? 'data-context-clue="true"' : ''}>${escapeHtml(matchText)}</span>`;
      
      result += highlightedSpan;
      lastEnd = match.endIndex;
    }
    
    // Add remaining text after last match
    if (lastEnd < text.length) {
      result += escapeHtml(text.substring(lastEnd));
    }
    
    return result;
  }

  /**
   * Run ML pattern detection
   */
  static async runMLDetection(
    data: FileData[],
    patterns: SensitivePattern[]
  ): Promise<Record<number, PatternMatch[]>> {
    const mlResults: Record<number, PatternMatch[]> = {};
    
    for (let docIndex = 0; docIndex < data.length; docIndex++) {
      const file = data[docIndex];
      // For ML detection, we'll use the same logic as regular pattern matching
      // In a real implementation, this would call an ML service
      const matches = await this.findPatternMatches(file.content, patterns, []);
      mlResults[docIndex] = matches;
    }
    
    return mlResults;
  }

  /**
   * Store pattern feedback
   */
  static async storeFeedback(
    patternId: string,
    patternLabel: string,
    matchedText: string,
    feedbackType: FeedbackType,
    userId?: string
  ): Promise<void> {
    try {
      const response = await fetch('/api/patterns/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patternId,
          patternLabel,
          matchedText,
          feedbackType,
          userId: userId || 'anonymous'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to store feedback');
      }
    } catch (error) {
      console.error('Error storing feedback:', error);
      throw error;
    }
  }

  /**
   * Load refined patterns from the API
   */
  static async loadRefinedPatterns(): Promise<RefinedPattern[]> {
    try {
      return await RefinedPatternClient.getAllRefinedPatterns();
    } catch (error) {
      console.error('Error loading refined patterns:', error);
      return [];
    }
  }
}