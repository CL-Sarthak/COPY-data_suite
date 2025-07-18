
export interface PatternFeedbackAnalysis {
  patternId: string;
  patternName: string;
  totalFeedback: number;
  negativeFeedback: number;
  falsePositives: Array<{
    text: string;
    count: number;
    context?: string;
  }>;
  commonIssues: {
    formatMismatches: string[];
    missingContext: string[];
    overMatching: string[];
  };
  suggestions: PatternRefinementSuggestion[];
}

export interface PatternRefinementSuggestion {
  type: 'regex' | 'context' | 'validation' | 'exclusion';
  description: string;
  confidence: number;
  implementation?: {
    regex?: string;
    contextKeywords?: string[];
    validationRule?: string;
    excludePatterns?: string[];
  };
}

import { findMatchingTemplate, generateTemplatePatterns } from './patternTemplates';

export class PatternLearningService {
  /**
   * Analyze feedback to identify pattern issues
   */
  static analyzeFeedbackPatterns(
    feedbackData: Array<{
      matchedText: string;
      context: string;
      feedbackType: 'positive' | 'negative';
      reason?: string;
    }>
  ): {
    issues: string[];
    patterns: Record<string, number>;
  } {
    const issues: string[] = [];
    const textPatterns: Record<string, number> = {};
    
    // Group false positives by pattern
    const falsePositives = feedbackData.filter(f => f.feedbackType === 'negative');
    
    // Analyze text patterns
    falsePositives.forEach(fp => {
      const text = fp.matchedText;
      
      // Check for format patterns
      if (/^\d+$/.test(text)) {
        textPatterns['all_digits'] = (textPatterns['all_digits'] || 0) + 1;
      }
      if (/^(\d)\1+$/.test(text)) {
        textPatterns['repeated_digits'] = (textPatterns['repeated_digits'] || 0) + 1;
      }
      if (!text.includes('-') && !text.includes(' ')) {
        textPatterns['no_separators'] = (textPatterns['no_separators'] || 0) + 1;
      }
      if (/^0+/.test(text)) {
        textPatterns['leading_zeros'] = (textPatterns['leading_zeros'] || 0) + 1;
      }
      
      // Check context patterns
      const contextLower = fp.context.toLowerCase();
      if (!contextLower.match(/\b(ssn|social|security|tax|tin)\b/)) {
        textPatterns['no_context_keywords'] = (textPatterns['no_context_keywords'] || 0) + 1;
      }
    });
    
    // Generate issues based on patterns
    const totalFalsePositives = falsePositives.length;
    
    if (textPatterns['all_digits'] > totalFalsePositives * 0.5) {
      issues.push('Pattern matching numbers without proper formatting');
    }
    if (textPatterns['repeated_digits'] > totalFalsePositives * 0.3) {
      issues.push('Pattern matching test/invalid data (repeated digits)');
    }
    if (textPatterns['no_separators'] > totalFalsePositives * 0.6) {
      issues.push('Pattern should require separators (dashes, spaces, etc.)');
    }
    if (textPatterns['no_context_keywords'] > totalFalsePositives * 0.7) {
      issues.push('Pattern matching without proper context');
    }
    
    return { issues, patterns: textPatterns };
  }

  /**
   * Generate refinement suggestions based on feedback analysis
   */
  static generateRefinementSuggestions(
    currentPattern: {
      regex?: string;
      examples: string[];
      type: string;
    },
    feedbackAnalysis: ReturnType<typeof PatternLearningService.analyzeFeedbackPatterns>
  ): PatternRefinementSuggestion[] {
    const suggestions: PatternRefinementSuggestion[] = [];
    
    // Regex refinement suggestions
    if (feedbackAnalysis.patterns['no_separators'] > 3) {
      suggestions.push({
        type: 'regex',
        description: 'Require proper formatting with separators',
        confidence: 0.9,
        implementation: {
          regex: this.suggestImprovedRegex(currentPattern)
        }
      });
    }
    
    // Context requirement suggestions
    if (feedbackAnalysis.patterns['no_context_keywords'] > 5) {
      suggestions.push({
        type: 'context',
        description: 'Require context keywords near matches',
        confidence: 0.85,
        implementation: {
          contextKeywords: this.suggestContextKeywordsByType(currentPattern.type)
        }
      });
    }
    
    // Validation rule suggestions
    if (feedbackAnalysis.patterns['repeated_digits'] > 2) {
      suggestions.push({
        type: 'validation',
        description: 'Add validation to exclude test/invalid data',
        confidence: 0.95,
        implementation: {
          validationRule: 'exclude_repeated_digits',
          excludePatterns: [
            '/^(\\d)\\1+$/', // Repeated single digit
            '/^123456789$/', // Sequential
            '/^000000000$/', // All zeros
          ]
        }
      });
    }
    
    return suggestions;
  }

  /**
   * Suggest improved regex based on pattern type and issues
   */
  private static suggestImprovedRegex(pattern: { type: string; examples: string[] }): string {
    // Analyze examples to determine format
    const formats = new Set<string>();
    
    pattern.examples.forEach(example => {
      if (/^\d{3}-\d{2}-\d{4}$/.test(example)) {
        formats.add('XXX-XX-XXXX');
      } else if (/^\d{3}\s\d{2}\s\d{4}$/.test(example)) {
        formats.add('XXX XX XXXX');
      } else if (/^\(\d{3}\)\s?\d{3}-\d{4}$/.test(example)) {
        formats.add('(XXX) XXX-XXXX');
      } else if (/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/.test(example)) {
        formats.add('XXXX XXXX XXXX XXXX');
      }
    });
    
    // Generate regex based on most common format
    const formatArray = Array.from(formats);
    if (formatArray.length === 1) {
      // Single format - create strict regex
      return this.formatToRegex(formatArray[0]);
    } else if (formatArray.length > 1) {
      // Multiple formats - create flexible regex
      return this.combineFormatsToRegex(formatArray);
    }
    
    // Default improvement - require some structure
    return '\\b\\d{3,4}[-\\s]\\d{2,4}[-\\s]\\d{4}\\b';
  }

  /**
   * Convert format string to regex
   */
  private static formatToRegex(format: string): string {
    return format
      .replace(/X/g, '\\d')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\s/g, '\\s')
      .replace(/^/, '\\b')
      .replace(/$/, '\\b');
  }

  /**
   * Combine multiple formats into flexible regex
   */
  private static combineFormatsToRegex(formats: string[]): string {
    const patterns = formats.map(f => `(${this.formatToRegex(f).slice(2, -2)})`);
    return `\\b(?:${patterns.join('|')})\\b`;
  }

  /**
   * Suggest context keywords based on pattern type
   */
  private static suggestContextKeywordsByType(patternType: string): string[] {
    const contextMap: Record<string, string[]> = {
      'PII': ['personal', 'private', 'confidential', 'identification'],
      'ssn': ['ssn', 'social security', 'taxpayer', 'tin', 'social'],
      'email': ['email', 'e-mail', 'contact', 'address', '@'],
      'phone': ['phone', 'tel', 'telephone', 'mobile', 'cell', 'contact'],
      'address': ['address', 'street', 'city', 'state', 'zip', 'postal'],
      'credit_card': ['card', 'credit', 'payment', 'visa', 'mastercard', 'amex'],
      'medical': ['patient', 'medical', 'health', 'diagnosis', 'treatment'],
      'financial': ['account', 'bank', 'financial', 'balance', 'transaction']
    };
    
    return contextMap[patternType.toLowerCase()] || contextMap['PII'];
  }

  /**
   * Apply refinements to a pattern
   */
  static applyRefinements(
    currentPattern: {
      id: string;
      regex?: string;
      examples: string[];
      type: string;
      excludedExamples?: string[];
      confidenceThreshold?: number;
      contextRequired?: boolean;
      contextKeywords?: string[];
      excludePatterns?: string[];
      validationRules?: string[];
      regexStrict?: boolean;
    },
    refinements: PatternRefinementSuggestion[]
  ): {
    id: string;
    regex?: string;
    examples: string[];
    type: string;
    excludedExamples?: string[];
    confidenceThreshold?: number;
    contextRequired?: boolean;
    contextKeywords?: string[];
    excludePatterns?: string[];
    validationRules?: string[];
    regexStrict?: boolean;
  } {
    const refined = { ...currentPattern };
    
    refinements.forEach(refinement => {
      switch (refinement.type) {
        case 'regex':
          if (refinement.implementation?.regex) {
            refined.regex = refinement.implementation.regex;
            refined.regexStrict = true;
          }
          break;
          
        case 'context':
          if (refinement.implementation?.contextKeywords) {
            refined.contextRequired = true;
            refined.contextKeywords = refinement.implementation.contextKeywords;
          }
          break;
          
        case 'validation':
          if (refinement.implementation?.excludePatterns) {
            refined.excludePatterns = refinement.implementation.excludePatterns;
          }
          if (refinement.implementation?.validationRule) {
            refined.validationRules = [
              ...(refined.validationRules || []),
              refinement.implementation.validationRule
            ];
          }
          break;
          
        case 'exclusion':
          if (refinement.implementation?.excludePatterns) {
            refined.excludePatterns = [
              ...(refined.excludePatterns || []),
              ...refinement.implementation.excludePatterns
            ];
          }
          break;
      }
    });
    
    return refined;
  }

  /**
   * Learn patterns from examples - Restored from original file
   */
  static learnSinglePattern(examples: string[]): {
    pattern: string;
    regex: string;
    confidence: number;
    format?: string;
  } | null {
    if (examples.length === 0) return null;

    // First, try to match against known pattern templates
    const templatePatterns = generateTemplatePatterns(examples);
    if (templatePatterns.length > 0) {
      const template = findMatchingTemplate(examples);
      return {
        pattern: template?.name || 'Template',
        regex: templatePatterns[0], // Use the first template pattern
        confidence: 0.95,
        format: template?.name
      };
    }

    // If no template matches, fall back to structure analysis
    const structures = examples.map(ex => this.getStructure(ex));
    const uniqueStructures = [...new Set(structures)];

    if (uniqueStructures.length === 1) {
      // All examples have the same structure
      return this.createStrictPattern(examples[0], uniqueStructures[0]);
    } else {
      // Examples have different structures, create a flexible pattern
      return this.createFlexiblePattern(examples);
    }
  }

  /**
   * Get structure of a string (e.g., "NNN-NN-NNNN" for SSN)
   */
  private static getStructure(str: string): string {
    return str
      .replace(/[a-zA-Z]/g, 'W')  // Word characters
      .replace(/\d/g, 'N')         // Numbers
      .replace(/[^WN\s-]/g, 'S'); // Special characters
  }

  /**
   * Create a strict pattern for uniform examples
   */
  private static createStrictPattern(
    example: string, 
    structure: string
  ): { pattern: string; regex: string; confidence: number; format?: string } {
    // Convert structure to regex with proper quantifiers
    let regex = structure;
    
    // Replace consecutive characters with proper quantifiers
    regex = regex.replace(/W+/g, (match) => `[a-zA-Z]{${match.length}}`);
    regex = regex.replace(/N+/g, (match) => `\\d{${match.length}}`);
    regex = regex.replace(/S/g, '\\W');
    regex = regex.replace(/-/g, '\\-');
    regex = regex.replace(/\//g, '\\/');
    regex = regex.replace(/\./g, '\\.');
    regex = regex.replace(/\s/g, '\\s');
    
    // For dates, make the pattern more flexible
    if (structure.match(/N{4}-N{2}-N{2}/) || structure.match(/N{2}-N{2}-N{4}/)) {
      // Date patterns - allow 1 or 2 digits for month/day
      regex = regex.replace(/\\d\{2\}/g, '\\d{1,2}');
    }

    // Add word boundaries
    regex = `\\b${regex}\\b`;

    return {
      pattern: structure,
      regex,
      confidence: 0.9,
      format: this.inferFormat(example, structure)
    };
  }

  /**
   * Create a flexible pattern for varied examples
   */
  private static createFlexiblePattern(
    examples: string[]
  ): { pattern: string; regex: string; confidence: number } {
    // Find common patterns
    const isNumeric = examples.every(ex => /^\d+$/.test(ex));
    const isAlpha = examples.every(ex => /^[a-zA-Z]+$/.test(ex));
    const isAlphanumeric = examples.every(ex => /^[a-zA-Z0-9]+$/.test(ex));

    let regex = '';
    let pattern = '';

    if (isNumeric) {
      const lengths = examples.map(ex => ex.length);
      const minLen = Math.min(...lengths);
      const maxLen = Math.max(...lengths);
      regex = `\\b\\d{${minLen},${maxLen}}\\b`;
      pattern = 'numeric';
    } else if (isAlpha) {
      regex = '\\b[a-zA-Z]+\\b';
      pattern = 'alphabetic';
    } else if (isAlphanumeric) {
      regex = '\\b[a-zA-Z0-9]+\\b';
      pattern = 'alphanumeric';
    } else {
      // Create a pattern that matches any of the examples
      const escapedExamples = examples.map(ex => 
        ex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      );
      regex = `\\b(?:${escapedExamples.join('|')})\\b`;
      pattern = 'mixed';
    }

    return {
      pattern,
      regex,
      confidence: 0.7
    };
  }

  /**
   * Infer format from example and structure
   */
  private static inferFormat(example: string, structure: string): string | undefined {
    // Common formats
    if (structure === 'NNN-NN-NNNN') return 'SSN';
    if (structure === '(NNN) NNN-NNNN') return 'Phone';
    if (structure.includes('@')) return 'Email';
    if (structure === 'NNNN NNNN NNNN NNNN') return 'Credit Card';
    
    return undefined;
  }

  /**
   * Learn multiple patterns from examples
   */
  static learnMultiplePatterns(examples: string[]): Array<{
    pattern: string;
    regex: string;
    confidence: number;
    format?: string;
  }> {
    const patterns: Array<{
      pattern: string;
      regex: string;
      confidence: number;
      format?: string;
    }> = [];

    // First, check if examples match a known template
    const templatePatterns = generateTemplatePatterns(examples);
    const template = findMatchingTemplate(examples);
    
    if (template && templatePatterns.length > 0) {
      // Add all template patterns for better coverage
      templatePatterns.forEach((regex, index) => {
        patterns.push({
          pattern: `${template.name}${index > 0 ? ` (variant ${index + 1})` : ''}`,
          regex,
          confidence: 0.95,
          format: template.name
        });
      });
      
      return patterns;
    }

    // If no template matches, use the original logic
    const singlePattern = this.learnSinglePattern(examples);
    if (singlePattern) {
      patterns.push(singlePattern);
    }

    // Then, look for specific format patterns
    const formatGroups = this.groupByFormat(examples);
    
    for (const [format, formatExamples] of Object.entries(formatGroups)) {
      if (formatExamples.length >= 2) {
        const formatPattern = this.learnSinglePattern(formatExamples);
        if (formatPattern && !patterns.some(p => p.regex === formatPattern.regex)) {
          patterns.push({
            ...formatPattern,
            format
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Group examples by detected format
   */
  private static groupByFormat(examples: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};

    examples.forEach(ex => {
      if (/^\d{3}-\d{2}-\d{4}$/.test(ex)) {
        (groups['SSN'] = groups['SSN'] || []).push(ex);
      } else if (/^\(\d{3}\)\s?\d{3}-\d{4}$/.test(ex)) {
        (groups['Phone'] = groups['Phone'] || []).push(ex);
      } else if (/^[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(ex)) {
        (groups['Email'] = groups['Email'] || []).push(ex);
      } else if (/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/.test(ex)) {
        (groups['Credit Card'] = groups['Credit Card'] || []).push(ex);
      } else {
        (groups['Other'] = groups['Other'] || []).push(ex);
      }
    });

    return groups;
  }

  /**
   * Suggest context keywords based on examples and pattern label
   */
  static suggestContextKeywords(examples: string[], label: string): string[] {
    // First check templates
    const template = findMatchingTemplate(examples);
    if (template && template.contextKeywords) {
      return template.contextKeywords;
    }
    
    // Then use label-based suggestions (reuse the private method's logic)
    const contextMap: Record<string, string[]> = {
      'PII': ['personal', 'private', 'confidential', 'identification'],
      'ssn': ['ssn', 'social security', 'taxpayer', 'tin', 'social'],
      'Social Security Number': ['ssn', 'social security', 'taxpayer', 'tin', 'social'],
      'email': ['email', 'e-mail', 'contact', 'address', '@'],
      'Email Address': ['email', 'e-mail', 'contact', 'address', '@'],
      'phone': ['phone', 'tel', 'telephone', 'mobile', 'cell', 'contact'],
      'Phone Number': ['phone', 'tel', 'telephone', 'mobile', 'cell', 'contact'],
      'address': ['address', 'street', 'city', 'state', 'zip', 'postal'],
      'Address': ['address', 'street', 'city', 'state', 'zip', 'postal'],
      'credit_card': ['card', 'credit', 'payment', 'visa', 'mastercard', 'amex'],
      'Credit Card': ['card', 'credit', 'payment', 'visa', 'mastercard', 'amex'],
      'Date of Birth': ['birth', 'dob', 'birthdate', 'born', 'birthday'],
      'medical': ['patient', 'medical', 'health', 'diagnosis', 'treatment'],
      'financial': ['account', 'bank', 'financial', 'balance', 'transaction']
    };
    
    // Try exact match first
    if (contextMap[label]) {
      return contextMap[label];
    }
    
    // Try lowercase match
    const lowerLabel = label.toLowerCase();
    if (contextMap[lowerLabel]) {
      return contextMap[lowerLabel];
    }
    
    // Default to generic PII keywords
    return contextMap['PII'];
  }
}