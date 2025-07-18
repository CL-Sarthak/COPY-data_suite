/**
 * Improved pattern definitions with more accurate regex patterns
 */

export const improvedPatterns = {
  ssn: {
    name: 'Social Security Number',
    description: 'Validates SSN format and excludes invalid ranges',
    patterns: [
      {
        // Format: 123-45-6789 (with dashes)
        regex: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/,
        format: 'XXX-XX-XXXX',
        confidence: 0.95
      },
      {
        // Format: 123456789 (no dashes, but still valid ranges)
        regex: /\b(?!000|666|9\d{2})\d{3}(?!00)\d{2}(?!0000)\d{4}\b/,
        format: 'XXXXXXXXX',
        confidence: 0.85,
        requiresContext: true // Only match if SSN context present
      }
    ],
    invalidPatterns: [
      /\b(\d)\1{8}\b/, // Repeated digits like 111111111
      /\b123456789\b/, // Sequential numbers
      /\b987654321\b/, // Reverse sequential
      /\b(\d{3})\1\1\b/ // Repeated groups like 123123123
    ],
    contextRequired: ['ssn', 'social security', 'taxpayer', 'tin'],
    validate: (match: string): boolean => {
      // Additional validation logic
      const cleaned = match.replace(/\D/g, '');
      if (cleaned.length !== 9) return false;
      
      // Check for obvious test data
      if (cleaned === '123456789' || cleaned === '111111111') return false;
      
      // Check area number (first 3 digits)
      const area = parseInt(cleaned.substring(0, 3));
      if (area === 0 || area === 666 || area >= 900) return false;
      
      // Check group number (middle 2)
      const group = parseInt(cleaned.substring(3, 5));
      if (group === 0) return false;
      
      // Check serial number (last 4)
      const serial = parseInt(cleaned.substring(5, 9));
      if (serial === 0) return false;
      
      return true;
    }
  },
  
  phone: {
    name: 'Phone Number',
    description: 'US phone numbers with area code validation',
    patterns: [
      {
        // Format: (123) 456-7890
        regex: /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
        format: '(XXX) XXX-XXXX',
        confidence: 0.9
      }
    ],
    validate: (match: string): boolean => {
      const cleaned = match.replace(/\D/g, '');
      // Must be 10 digits
      if (cleaned.length !== 10) return false;
      // Area code can't start with 0 or 1
      if (cleaned[0] === '0' || cleaned[0] === '1') return false;
      // Exchange can't start with 0 or 1
      if (cleaned[3] === '0' || cleaned[3] === '1') return false;
      return true;
    }
  },
  
  creditCard: {
    name: 'Credit Card',
    description: 'Credit card numbers with Luhn validation',
    patterns: [
      {
        // Visa: 4xxx
        regex: /\b4\d{3}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,
        format: 'XXXX-XXXX-XXXX-XXXX',
        type: 'Visa'
      },
      {
        // Mastercard: 51-55xx
        regex: /\b5[1-5]\d{2}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/,
        format: 'XXXX-XXXX-XXXX-XXXX',
        type: 'Mastercard'
      },
      {
        // Amex: 34xx or 37xx (15 digits)
        regex: /\b3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5}\b/,
        format: 'XXXX-XXXXXX-XXXXX',
        type: 'Amex'
      }
    ],
    validate: (match: string): boolean => {
      const cleaned = match.replace(/\D/g, '');
      // Luhn algorithm validation
      let sum = 0;
      let isEven = false;
      
      for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i]);
        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
      }
      
      return sum % 10 === 0;
    }
  }
};

/**
 * Pattern feedback learning system
 */
export interface PatternFeedback {
  pattern: string;
  falsePositive: string;
  context: string;
  reason?: 'wrong_format' | 'missing_context' | 'invalid_data' | 'not_sensitive';
}

export class PatternLearningService {
  /**
   * Learn from negative feedback to improve patterns
   */
  static learnFromFeedback(patternName: string, feedback: PatternFeedback[]): {
    suggestedRegex?: string;
    requiredContext?: string[];
    excludePatterns?: string[];
    confidenceAdjustment?: number;
  } {
    const feedbackAnalysis = {
      formatIssues: 0,
      contextIssues: 0,
      invalidDataIssues: 0,
      notSensitiveIssues: 0
    };
    
    // Analyze feedback patterns
    feedback.forEach(fb => {
      switch (fb.reason) {
        case 'wrong_format':
          feedbackAnalysis.formatIssues++;
          break;
        case 'missing_context':
          feedbackAnalysis.contextIssues++;
          break;
        case 'invalid_data':
          feedbackAnalysis.invalidDataIssues++;
          break;
        case 'not_sensitive':
          feedbackAnalysis.notSensitiveIssues++;
          break;
      }
    });
    
    const suggestions: {
      suggestedRegex?: string;
      requiredContext?: string[];
      excludePatterns?: string[];
      confidenceAdjustment?: number;
    } = {};
    
    // If mostly format issues, suggest stricter regex
    if (feedbackAnalysis.formatIssues > feedback.length * 0.5) {
      if (patternName === 'Social Security Number') {
        suggestions.suggestedRegex = '/\\b(?!000|666|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0000)\\d{4}\\b/';
        suggestions.excludePatterns = [
          '/\\b(\\d)\\1{8}\\b/', // Repeated digits
          '/\\b\\d{9}\\b/' // No dashes (unless context present)
        ];
      }
    }
    
    // If mostly context issues, require context
    if (feedbackAnalysis.contextIssues > feedback.length * 0.5) {
      const patternKey = patternName.toLowerCase().replace(/\s+/g, '');
      const patternConfig = improvedPatterns[patternKey as keyof typeof improvedPatterns];
      if (patternConfig && 'contextRequired' in patternConfig) {
        suggestions.requiredContext = patternConfig.contextRequired;
      } else {
        // Default context keywords for pattern types
        suggestions.requiredContext = ['sensitive', 'personal', 'private', 'confidential'];
      }
      suggestions.confidenceAdjustment = -0.2; // Lower confidence without context
    }
    
    return suggestions;
  }
}