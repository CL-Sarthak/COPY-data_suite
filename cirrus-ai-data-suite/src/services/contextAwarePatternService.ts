export interface ContextPattern {
  name: string;
  category: string;
  contextClues: string[];
  valuePattern: RegExp;
  lookBehindPattern?: RegExp;
  lookAheadPattern?: RegExp;
  confidence: (match: ContextMatch) => number;
}

export interface ContextMatch {
  value: string;
  fullMatch: string;
  beforeContext: string;
  afterContext: string;
  pattern: ContextPattern;
  startIndex: number;
  endIndex: number;
}

export class ContextAwarePatternService {
  private patterns: ContextPattern[] = [
    {
      name: 'Social Security Number',
      category: 'PII',
      contextClues: ['ssn', 'social security', 'social', 'ss#', 'soc sec', 'tin', 'taxpayer'],
      valuePattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/,
      confidence: (match) => {
        // Higher confidence if context clues are present
        const contextStr = (match.beforeContext + ' ' + match.afterContext).toLowerCase();
        const hasClue = match.pattern.contextClues.some(clue => 
          contextStr.includes(clue)
        );
        
        // Check if it looks like a phone number instead
        const phoneContext = ['phone', 'tel', 'mobile', 'cell', 'call', 'fax'];
        const hasPhoneClue = phoneContext.some(clue => contextStr.includes(clue));
        
        if (hasClue && !hasPhoneClue) return 0.95;
        if (hasPhoneClue) return 0.2;
        
        // Check format validity
        const cleaned = match.value.replace(/[-.\s]/g, '');
        if (cleaned.length !== 9) return 0.1;
        
        // SSNs don't start with 000, 666, or 900-999
        const firstThree = parseInt(cleaned.substring(0, 3));
        if (firstThree === 0 || firstThree === 666 || firstThree >= 900) return 0.1;
        
        return 0.5;
      }
    },
    {
      name: 'Email Address',
      category: 'PII',
      contextClues: ['email', 'e-mail', 'mail', 'contact', 'reach', 'send', '@', 'email_address', 'emailaddress'],
      valuePattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      confidence: (match) => {
        const contextStr = (match.beforeContext + ' ' + match.afterContext).toLowerCase();
        const hasClue = match.pattern.contextClues.some(clue => 
          contextStr.includes(clue)
        );
        
        // Check for common email field labels
        const labelPattern = /\b(email|e-mail|mail)\s*(address)?:?\s*$/i;
        if (labelPattern.test(match.beforeContext)) return 0.98;
        
        if (hasClue) return 0.9;
        
        // Basic email validation
        const parts = match.value.split('@');
        if (parts.length !== 2) return 0.1;
        
        const [local, domain] = parts;
        if (local.length < 1 || domain.length < 3) return 0.3;
        
        return 0.7;
      }
    },
    {
      name: 'Credit Card Number',
      category: 'Financial',
      contextClues: ['card', 'credit', 'debit', 'visa', 'mastercard', 'amex', 'payment', 'cc'],
      valuePattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{3,4}\b/,
      confidence: (match) => {
        const contextStr = (match.beforeContext + ' ' + match.afterContext).toLowerCase();
        const hasClue = match.pattern.contextClues.some(clue => 
          contextStr.includes(clue)
        );
        
        const cleaned = match.value.replace(/[\s-]/g, '');
        
        // Luhn algorithm validation
        if (this.isValidLuhn(cleaned)) {
          return hasClue ? 0.98 : 0.85;
        }
        
        // Check if it might be a different type of number
        if (contextStr.includes('order') || contextStr.includes('invoice')) return 0.2;
        
        return hasClue ? 0.6 : 0.3;
      }
    },
    {
      name: 'Phone Number',
      category: 'PII',
      contextClues: ['phone', 'tel', 'mobile', 'cell', 'call', 'fax', 'contact', 'phone_number', 'phonenumber', 'telephone'],
      valuePattern: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
      confidence: (match) => {
        const contextStr = (match.beforeContext + ' ' + match.afterContext).toLowerCase();
        const hasClue = match.pattern.contextClues.some(clue => 
          contextStr.includes(clue)
        );
        
        // Check for phone number labels
        const labelPattern = /\b(phone|tel|mobile|cell|fax)\s*(number)?:?\s*$/i;
        if (labelPattern.test(match.beforeContext)) return 0.95;
        
        // Check if it might be SSN instead
        const ssnContext = ['ssn', 'social security', 'social'];
        const hasSsnClue = ssnContext.some(clue => contextStr.includes(clue));
        
        if (hasClue && !hasSsnClue) return 0.9;
        if (hasSsnClue) return 0.2;
        
        return 0.5;
      }
    },
    {
      name: 'Date of Birth',
      category: 'PII',
      contextClues: ['dob', 'birth', 'born', 'birthday', 'date of birth', 'birthdate'],
      valuePattern: /\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})\b/i,
      confidence: (match) => {
        const contextStr = (match.beforeContext + ' ' + match.afterContext).toLowerCase();
        const hasClue = match.pattern.contextClues.some(clue => 
          contextStr.includes(clue)
        );
        
        // Higher confidence for DOB patterns
        if (/(dob|date of birth|birthdate|born on):?\s*$/i.test(match.beforeContext)) {
          return 0.95;
        }
        
        // Check if date is in reasonable range for birth date
        const year = this.extractYear(match.value);
        const currentYear = new Date().getFullYear();
        if (year && year > 1900 && year < currentYear - 5) {
          return hasClue ? 0.9 : 0.6;
        }
        
        return hasClue ? 0.7 : 0.3;
      }
    },
    {
      name: 'Address',
      category: 'PII',
      contextClues: ['address', 'street', 'ave', 'blvd', 'lane', 'road', 'suite', 'apt'],
      valuePattern: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Plaza|Pl|Suite|Ste|Apt|Apartment)\b/i,
      confidence: (match) => {
        const contextStr = (match.beforeContext + ' ' + match.afterContext).toLowerCase();
        const hasClue = match.pattern.contextClues.some(clue => 
          contextStr.includes(clue)
        );
        
        // Check for address label
        if (/\baddress:?\s*$/i.test(match.beforeContext)) return 0.95;
        
        // Check if followed by city, state, zip pattern
        const hasLocationAfter = /,?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s+\d{5}/.test(match.afterContext);
        if (hasLocationAfter) return 0.9;
        
        return hasClue ? 0.8 : 0.5;
      }
    },
    {
      name: 'Person Name',
      category: 'PII',
      contextClues: ['name', 'patient', 'client', 'customer', 'first', 'last', 'full name', 'fname', 'lname', 'patient_name', 'patientname', 'first_name', 'last_name', 'firstname', 'lastname'],
      valuePattern: /\b[A-Z][a-z]+(?: [A-Z][a-z]+)+\b/,
      confidence: (match) => {
        const contextStr = (match.beforeContext + ' ' + match.afterContext).toLowerCase();
        const hasClue = match.pattern.contextClues.some(clue => 
          contextStr.includes(clue)
        );
        
        // High confidence for name field labels
        if (/\b(name|patient|client|customer|first name|last name|full name):?\s*$/i.test(match.beforeContext)) {
          return 0.95;
        }
        
        // Check if it looks like a common name structure
        const words = match.value.split(' ');
        if (words.length >= 2 && words.length <= 4) {
          // Additional validation: avoid common false positives
          const commonFalsePositives = ['United States', 'New York', 'Los Angeles', 'San Francisco', 'Air Force', 'Health Care', 'Medical Center'];
          if (commonFalsePositives.some(fp => match.value.includes(fp))) {
            return 0.1;
          }
          
          return hasClue ? 0.85 : 0.6;
        }
        
        return hasClue ? 0.7 : 0.3;
      }
    }
  ];

  private isValidLuhn(cardNumber: string): boolean {
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  private extractYear(dateStr: string): number | null {
    // Try different year patterns
    const fourDigitYear = /\b(19|20)\d{2}\b/.exec(dateStr);
    if (fourDigitYear) return parseInt(fourDigitYear[0]);
    
    const twoDigitYear = /\b\d{2}\b/.exec(dateStr);
    if (twoDigitYear) {
      const year = parseInt(twoDigitYear[0]);
      return year > 50 ? 1900 + year : 2000 + year;
    }
    
    return null;
  }

  private isStructuredData(text: string): boolean {
    // Check for patterns that indicate structured data (like JSON conversion output)
    const structuredPatterns = [
      /Record \d+:/,           // "Record 1:", "Record 2:"
      /\w+:\s*\w+\n/,         // "field: value" lines
      /^\w+:\s/m              // Lines starting with "field: "
    ];
    
    return structuredPatterns.some(pattern => pattern.test(text));
  }

  private hasFieldNameContext(beforeContext: string, pattern: ContextPattern): boolean {
    // Check if the immediate context contains a field name that matches pattern clues
    const lastLine = beforeContext.split('\n').pop() || '';
    return pattern.contextClues.some(clue => 
      lastLine.toLowerCase().includes(clue.toLowerCase())
    );
  }

  public findMatches(text: string, contextWindow: number = 50): ContextMatch[] {
    const matches: ContextMatch[] = [];
    
    // Detect if this looks like structured JSON data
    const isStructuredData = this.isStructuredData(text);
    const confidenceThreshold = isStructuredData ? 0.3 : 0.5;
    
    for (const pattern of this.patterns) {
      let match;
      const regex = new RegExp(pattern.valuePattern, 'gi');
      
      while ((match = regex.exec(text)) !== null) {
        const startIndex = match.index;
        const endIndex = match.index + match[0].length;
        
        // Extract context
        const beforeStart = Math.max(0, startIndex - contextWindow);
        const afterEnd = Math.min(text.length, endIndex + contextWindow);
        
        const beforeContext = text.substring(beforeStart, startIndex);
        const afterContext = text.substring(endIndex, afterEnd);
        
        const contextMatch: ContextMatch = {
          value: match[0],
          fullMatch: text.substring(beforeStart, afterEnd),
          beforeContext,
          afterContext,
          pattern,
          startIndex,
          endIndex
        };
        
        // Calculate confidence
        let confidence = pattern.confidence(contextMatch);
        
        // Boost confidence for structured data when field names are clear
        if (isStructuredData && this.hasFieldNameContext(beforeContext, pattern)) {
          confidence = Math.min(0.95, confidence + 0.2);
        }
        
        // Only include matches above threshold
        if (confidence > confidenceThreshold) {
          matches.push({
            ...contextMatch,
            pattern: {
              ...pattern,
              confidence: () => confidence
            }
          });
        }
      }
    }
    
    // Sort by position
    matches.sort((a, b) => a.startIndex - b.startIndex);
    
    // Remove overlapping matches (keep higher confidence)
    const filteredMatches: ContextMatch[] = [];
    for (const match of matches) {
      const overlaps = filteredMatches.some(existing => 
        (match.startIndex >= existing.startIndex && match.startIndex < existing.endIndex) ||
        (match.endIndex > existing.startIndex && match.endIndex <= existing.endIndex)
      );
      
      if (!overlaps) {
        filteredMatches.push(match);
      } else {
        // Replace if higher confidence
        const overlappingIndex = filteredMatches.findIndex(existing => 
          (match.startIndex >= existing.startIndex && match.startIndex < existing.endIndex) ||
          (match.endIndex > existing.startIndex && match.endIndex <= existing.endIndex)
        );
        
        if (overlappingIndex !== -1) {
          const existingConfidence = filteredMatches[overlappingIndex].pattern.confidence(filteredMatches[overlappingIndex]);
          const newConfidence = match.pattern.confidence(match);
          
          if (newConfidence > existingConfidence) {
            filteredMatches[overlappingIndex] = match;
          }
        }
      }
    }
    
    return filteredMatches;
  }

  public getPatternSuggestions(text: string): Array<{
    pattern: string;
    matches: ContextMatch[];
    totalConfidence: number;
  }> {
    const allMatches = this.findMatches(text);
    
    // Group by pattern
    const grouped = allMatches.reduce((acc, match) => {
      const patternName = match.pattern.name;
      if (!acc[patternName]) {
        acc[patternName] = [];
      }
      acc[patternName].push(match);
      return acc;
    }, {} as Record<string, ContextMatch[]>);
    
    // Calculate average confidence per pattern
    return Object.entries(grouped).map(([pattern, matches]) => {
      const totalConfidence = matches.reduce((sum, match) => 
        sum + match.pattern.confidence(match), 0
      ) / matches.length;
      
      return {
        pattern,
        matches,
        totalConfidence
      };
    }).sort((a, b) => b.totalConfidence - a.totalConfidence);
  }
}

export const contextAwarePatternService = new ContextAwarePatternService();