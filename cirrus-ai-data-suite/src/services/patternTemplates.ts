/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Pattern templates for common data types
 * These templates help generate more generalized patterns instead of exact matches
 */

export interface PatternTemplate {
  name: string;
  description: string;
  // Function to test if an example matches this template
  test: (example: string) => boolean;
  // Function to generate regex patterns for this type
  generateRegex: (examples: string[]) => string[];
  // Common context words associated with this pattern
  contextKeywords?: string[];
}

export const PATTERN_TEMPLATES: PatternTemplate[] = [
  {
    name: 'Date',
    description: 'Various date formats',
    test: (example: string) => {
      // Test for common date patterns
      return /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/.test(example) ||
             /^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/.test(example) ||
             /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{2,4}$/i.test(example) ||
             /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4}$/i.test(example);
    },
    generateRegex: () => {
      const patterns: string[] = [];
      
      // YYYY-MM-DD or YYYY/MM/DD
      patterns.push('\\b\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}\\b');
      
      // MM-DD-YYYY or MM/DD/YYYY
      patterns.push('\\b\\d{1,2}[-/]\\d{1,2}[-/]\\d{4}\\b');
      
      // DD-MM-YYYY or DD/MM/YYYY
      patterns.push('\\b\\d{1,2}[-/]\\d{1,2}[-/]\\d{4}\\b');
      
      // Month DD, YYYY
      patterns.push('\\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{1,2},?\\s+\\d{2,4}\\b');
      
      // DD Month YYYY
      patterns.push('\\b\\d{1,2}\\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{2,4}\\b');
      
      return patterns;
    },
    contextKeywords: ['date', 'birth', 'dob', 'born', 'birthday', 'expiry', 'expires', 'issued', 'valid']
  },
  
  {
    name: 'SSN',
    description: 'Social Security Numbers',
    test: (example: string) => {
      return /^\d{3}-\d{2}-\d{4}$/.test(example) ||
             /^\d{9}$/.test(example);
    },
    generateRegex: (_examples: string[]) => [
      '\\b\\d{3}-\\d{2}-\\d{4}\\b',
      '\\b\\d{9}\\b'
    ],
    contextKeywords: ['ssn', 'social', 'security', 'tin', 'taxpayer', 'identification']
  },
  
  {
    name: 'Phone',
    description: 'Phone numbers',
    test: (example: string) => {
      return /^[\d\s\-\(\)\+\.]+$/.test(example) && example.replace(/\D/g, '').length >= 10;
    },
    generateRegex: (_examples: string[]) => [
      '\\b\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}\\b',
      '\\b\\+?1?[\\s.-]?\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}\\b',
      '\\b\\d{10,15}\\b'
    ],
    contextKeywords: ['phone', 'mobile', 'cell', 'telephone', 'contact', 'number', 'tel']
  },
  
  {
    name: 'Email',
    description: 'Email addresses',
    test: (example: string) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(example);
    },
    generateRegex: (_examples: string[]) => [
      '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b'
    ],
    contextKeywords: ['email', 'e-mail', 'mail', 'address', 'contact']
  },
  
  {
    name: 'CreditCard',
    description: 'Credit card numbers',
    test: (example: string) => {
      const digits = example.replace(/\D/g, '');
      return digits.length >= 13 && digits.length <= 19;
    },
    generateRegex: (_examples: string[]) => [
      '\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b',
      '\\b\\d{13,19}\\b'
    ],
    contextKeywords: ['card', 'credit', 'debit', 'payment', 'account', 'number']
  },
  
  {
    name: 'IPAddress',
    description: 'IP addresses',
    test: (example: string) => {
      return /^(\d{1,3}\.){3}\d{1,3}$/.test(example);
    },
    generateRegex: (_examples: string[]) => [
      '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b'
    ],
    contextKeywords: ['ip', 'address', 'host', 'server', 'client']
  },
  
  {
    name: 'ZipCode',
    description: 'Postal/ZIP codes',
    test: (example: string) => {
      return /^\d{5}(-\d{4})?$/.test(example) || // US ZIP
             /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(example); // Canadian postal
    },
    generateRegex: (_examples: string[]) => [
      '\\b\\d{5}(-\\d{4})?\\b', // US ZIP
      '\\b[A-Z]\\d[A-Z]\\s?\\d[A-Z]\\d\\b' // Canadian
    ],
    contextKeywords: ['zip', 'postal', 'code', 'postcode', 'address']
  },
  
  {
    name: 'Currency',
    description: 'Currency amounts',
    test: (example: string) => {
      return /^[$€£¥]?\s?\d+([,\d]+)?(\.\d{1,2})?$/.test(example) ||
             /^\d+([,\d]+)?(\.\d{1,2})?\s?[$€£¥]?$/.test(example);
    },
    generateRegex: (_examples: string[]) => [
      '\\$\\s?\\d{1,3}(,\\d{3})*(\\.\\d{2})?\\b',
      '\\b\\d{1,3}(,\\d{3})*(\\.\\d{2})?\\s?\\$',
      '€\\s?\\d{1,3}(,\\d{3})*(\\.\\d{2})?\\b',
      '£\\s?\\d{1,3}(,\\d{3})*(\\.\\d{2})?\\b'
    ],
    contextKeywords: ['amount', 'price', 'cost', 'payment', 'salary', 'wage', 'fee', 'balance']
  },
  
  {
    name: 'AccountNumber',
    description: 'Bank account or ID numbers',
    test: (example: string) => {
      // Generic pattern for account numbers (alphanumeric, 6-20 chars)
      return /^[A-Z0-9]{6,20}$/i.test(example);
    },
    generateRegex: (examples: string[]) => {
      const lengths = examples.map(ex => ex.length);
      const minLen = Math.min(...lengths);
      const maxLen = Math.max(...lengths);
      
      return [
        `\\b[A-Z0-9]{${minLen},${maxLen}}\\b`,
        `\\b\\d{${minLen},${maxLen}}\\b`
      ];
    },
    contextKeywords: ['account', 'number', 'id', 'identifier', 'reference', 'code']
  }
];

/**
 * Find matching pattern template for given examples
 */
export function findMatchingTemplate(examples: string[]): PatternTemplate | null {
  // Count how many examples match each template
  const templateMatches = PATTERN_TEMPLATES.map(template => ({
    template,
    matchCount: examples.filter(ex => template.test(ex)).length
  }));
  
  // Find the template that matches the most examples (at least 50%)
  const bestMatch = templateMatches
    .filter(tm => tm.matchCount >= examples.length * 0.5)
    .sort((a, b) => b.matchCount - a.matchCount)[0];
  
  return bestMatch?.template || null;
}

/**
 * Generate regex patterns using templates
 */
export function generateTemplatePatterns(examples: string[]): string[] {
  const template = findMatchingTemplate(examples);
  
  if (template) {
    return template.generateRegex(examples);
  }
  
  // No template matched - return empty array
  return [];
}