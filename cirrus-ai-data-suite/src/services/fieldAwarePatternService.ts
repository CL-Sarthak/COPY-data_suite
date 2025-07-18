// Field mapping service not directly used, but imported for interface compatibility

export interface FieldPattern {
  name: string;
  category: string;
  fieldNames: RegExp[];
  valuePattern: RegExp;
  validateValue?: (value: string) => boolean;
  getConfidence: (fieldName: string, value: string, context: FieldContext) => number;
}

export interface FieldContext {
  recordIndex: number;
  allFields: Record<string, unknown>;
  normalizedFieldName?: string;
  originalFieldName: string;
}

export interface FieldMatch {
  patternName: string;
  category: string;
  fieldName: string;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  context: FieldContext;
  reason: string;
}

export class FieldAwarePatternService {

  /**
   * Normalize field name for pattern matching
   */
  private normalizeFieldName(fieldName: string): { normalizedName: string; confidence: number } {
    const lowerFieldName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Basic field normalizations
    const normalizations = [
      { pattern: /^(name|full_?name|customer_?name|user_?name)$/i, normalized: 'name' },
      { pattern: /^(first_?name|fname|given_?name)$/i, normalized: 'first_name' },
      { pattern: /^(last_?name|lname|surname|family_?name)$/i, normalized: 'last_name' },
      { pattern: /^(email|e_?mail|email_?address)$/i, normalized: 'email' },
      { pattern: /^(phone|telephone|tel|phone_?number)$/i, normalized: 'phone' },
      { pattern: /^(address|street_?address|home_?address)$/i, normalized: 'address' },
      { pattern: /^(dob|date_?of_?birth|birth_?date)$/i, normalized: 'dob' },
      { pattern: /^(ssn|social_?security|ss_?number)$/i, normalized: 'ssn' }
    ];

    for (const norm of normalizations) {
      if (norm.pattern.test(fieldName)) {
        return { normalizedName: norm.normalized, confidence: 0.9 };
      }
    }

    return { normalizedName: lowerFieldName, confidence: 0.7 };
  }
  
  private patterns: FieldPattern[] = [
    {
      name: 'Person Name',
      category: 'PII',
      fieldNames: [
        /^(name|first_?name|last_?name|full_?name|patient_?name|customer_?name|contact_?name|person_?name|user_?name)$/i,
        /^(fname|lname|fullname|patientname|customername)$/i
      ],
      valuePattern: /^[A-Za-z\s\-'\.]{2,50}$/,
      validateValue: (value: string) => {
        // Must contain at least one letter and be reasonable length
        if (!/[A-Za-z]/.test(value)) return false;
        if (value.length < 2 || value.length > 50) return false;
        
        // Exclude common non-name patterns
        const excluded = /^(test|example|sample|demo|admin|user|null|undefined|n\/a|tbd|pending)$/i;
        if (excluded.test(value.trim())) return false;
        
        // Exclude numbers-only or mostly numbers
        if (/^\d+$/.test(value) || /\d{3,}/.test(value)) return false;
        
        return true;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getConfidence: (fieldName: string, _value: string, _context: FieldContext) => {
        // Very high confidence if field name clearly indicates name
        const strongNameFields = /^(name|full_?name|patient_?name|customer_?name)$/i;
        if (strongNameFields.test(fieldName)) return 0.98;
        
        const partialNameFields = /^(first_?name|last_?name|fname|lname)$/i;
        if (partialNameFields.test(fieldName)) return 0.95;
        
        const weakNameFields = /^(contact_?name|user_?name|person_?name)$/i;
        if (weakNameFields.test(fieldName)) return 0.90;
        
        return 0.85;
      }
    },
    {
      name: 'Phone Number',
      category: 'PII',
      fieldNames: [
        /^(phone|telephone|tel|mobile|cell|fax|phone_?number|tel_?number|mobile_?number|cell_?number|fax_?number)$/i,
        /^(home_?phone|work_?phone|office_?phone|business_?phone|emergency_?phone|contact_?phone)$/i
      ],
      valuePattern: /^[\+]?[\d\s\-\(\)\.]{7,20}$/,
      validateValue: (value: string) => {
        // Extract just digits
        const digits = value.replace(/\D/g, '');
        
        // Should have 7-15 digits (local to international)
        if (digits.length < 7 || digits.length > 15) return false;
        
        // US phone numbers (10 or 11 digits)
        if (digits.length === 10 || (digits.length === 11 && digits[0] === '1')) {
          // Don't allow obvious patterns like 1111111111
          if (/^(\d)\1+$/.test(digits.slice(-10))) return false;
          return true;
        }
        
        // International numbers (7-15 digits)
        return digits.length >= 7 && digits.length <= 15;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getConfidence: (fieldName: string, _value: string, _context: FieldContext) => {
        const strongPhoneFields = /^(phone|telephone|mobile|cell)$/i;
        if (strongPhoneFields.test(fieldName)) return 0.98;
        
        const specificPhoneFields = /^(phone_?number|tel_?number|mobile_?number|cell_?number)$/i;
        if (specificPhoneFields.test(fieldName)) return 0.97;
        
        const contextPhoneFields = /^(home_?phone|work_?phone|office_?phone|emergency_?phone)$/i;
        if (contextPhoneFields.test(fieldName)) return 0.95;
        
        return 0.90;
      }
    },
    {
      name: 'Social Security Number',
      category: 'PII',
      fieldNames: [
        /^(ssn|social_?security|ss_?number|social_?security_?number|tax_?id|tin|taxpayer_?id)$/i
      ],
      valuePattern: /^\d{3}[-.\s]?\d{2}[-.\s]?\d{4}$/,
      validateValue: (value: string) => {
        const cleaned = value.replace(/[-.\s]/g, '');
        if (cleaned.length !== 9) return false;
        
        // SSNs don't start with 000, 666, or 900-999
        const firstThree = parseInt(cleaned.substring(0, 3));
        if (firstThree === 0 || firstThree === 666 || firstThree >= 900) return false;
        
        // Middle two digits can't be 00
        const middleTwo = parseInt(cleaned.substring(3, 5));
        if (middleTwo === 0) return false;
        
        // Last four digits can't be 0000
        const lastFour = parseInt(cleaned.substring(5, 9));
        if (lastFour === 0) return false;
        
        return true;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getConfidence: (_fieldName: string, _value: string, _context: FieldContext) => {
        // Extremely high confidence for exact SSN field names
        return 0.99;
      }
    },
    {
      name: 'Email Address',
      category: 'PII',
      fieldNames: [
        /^(email|e_?mail|email_?address|e_?mail_?address|contact_?email|work_?email|personal_?email)$/i,
        /^(mail|email_addr|mail_addr)$/i
      ],
      valuePattern: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/,
      validateValue: (value: string) => {
        const parts = value.split('@');
        if (parts.length !== 2) return false;
        
        const [local, domain] = parts;
        if (local.length < 1 || domain.length < 3) return false;
        
        // Domain should have at least one dot
        if (!domain.includes('.')) return false;
        
        return true;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getConfidence: (fieldName: string, _value: string, _context: FieldContext) => {
        const strongEmailFields = /^(email|e_?mail)$/i;
        if (strongEmailFields.test(fieldName)) return 0.99;
        
        const specificEmailFields = /^(email_?address|e_?mail_?address|contact_?email)$/i;
        if (specificEmailFields.test(fieldName)) return 0.98;
        
        return 0.95;
      }
    },
    {
      name: 'Date of Birth',
      category: 'PII',
      fieldNames: [
        /^(dob|date_?of_?birth|birth_?date|birthday|birth_?day)$/i,
        /^(patient_?dob|customer_?dob|contact_?dob)$/i
      ],
      valuePattern: /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|\d{2,4}-\d{1,2}-\d{1,2})$/,
      validateValue: (value: string) => {
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) return false;
          
          // Should be between 1900 and current year + 1
          const year = date.getFullYear();
          const currentYear = new Date().getFullYear();
          
          return year >= 1900 && year <= currentYear + 1;
        } catch {
          return false;
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getConfidence: (fieldName: string, _value: string, _context: FieldContext) => {
        const strongDobFields = /^(dob|date_?of_?birth|birth_?date)$/i;
        if (strongDobFields.test(fieldName)) return 0.98;
        
        return 0.95;
      }
    },
    {
      name: 'Street Address',
      category: 'PII',
      fieldNames: [
        /^(address|street|street_?address|home_?address|mailing_?address|billing_?address|physical_?address)$/i,
        /^(addr|address_?line_?1|address1|street_?addr)$/i
      ],
      valuePattern: /^.{5,100}$/,
      validateValue: (value: string) => {
        // Should contain both numbers and words, typical of addresses
        const hasNumber = /\d/.test(value);
        const hasWords = /[A-Za-z]{2,}/.test(value);
        
        if (!hasNumber || !hasWords) return false;
        
        // If field name suggests address, be more lenient
        // Otherwise require address keywords
        return true;
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getConfidence: (fieldName: string, value: string, _context: FieldContext) => {
        const strongAddressFields = /^(address|street_?address|home_?address)$/i;
        if (strongAddressFields.test(fieldName)) {
          // Check if value contains address keywords for extra confidence
          const addressKeywords = /\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|place|pl|boulevard|blvd|way|circle|cir)\b/i;
          if (addressKeywords.test(value)) return 0.98;
          return 0.90;
        }
        
        const specificAddressFields = /^(mailing_?address|billing_?address|physical_?address|address1)$/i;
        if (specificAddressFields.test(fieldName)) return 0.95;
        
        return 0.85;
      }
    }
  ];

  /**
   * Detect patterns in structured data using field-aware analysis
   */
  detectPatterns(content: string): FieldMatch[] {
    const matches: FieldMatch[] = [];
    const lines = content.split('\n');
    let currentRecord = 0;
    let recordFields: Record<string, unknown> = {};
    let lineOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        lineOffset += lines[i].length + 1; // +1 for newline
        continue;
      }
      
      // Check if this is a record header (e.g., "Record 1:")
      if (/^Record \d+:/.test(line)) {
        currentRecord++;
        recordFields = {};
        lineOffset += lines[i].length + 1;
        continue;
      }
      
      // Parse field: value pairs
      const fieldMatch = line.match(/^([^:]+):\s*(.*)$/);
      if (fieldMatch) {
        const [, fieldName, value] = fieldMatch;
        const cleanFieldName = fieldName.trim();
        const cleanValue = value.trim();
        
        // Store field for context
        recordFields[cleanFieldName] = cleanValue;
        
        // Skip empty values
        if (!cleanValue || cleanValue === 'null' || cleanValue === 'undefined') {
          lineOffset += lines[i].length + 1;
          continue;
        }
        
        // Try to match this field against our patterns
        const fieldMatches = this.matchField(cleanFieldName, cleanValue, {
          recordIndex: currentRecord,
          allFields: recordFields,
          originalFieldName: cleanFieldName
        });
        
        // Add position information to matches
        fieldMatches.forEach(match => {
          const valueStartInLine = line.indexOf(cleanValue);
          match.startIndex = lineOffset + valueStartInLine;
          match.endIndex = match.startIndex + cleanValue.length;
          matches.push(match);
        });
      }
      
      lineOffset += lines[i].length + 1;
    }
    
    return this.deduplicateMatches(matches);
  }

  /**
   * Match a specific field against all patterns
   */
  private matchField(fieldName: string, value: string, context: FieldContext): FieldMatch[] {
    const matches: FieldMatch[] = [];
    
    // Normalize field name for better matching
    const normalizedField = this.normalizeFieldName(fieldName);
    context.normalizedFieldName = normalizedField.normalizedName;
    
    for (const pattern of this.patterns) {
      // Check if field name matches any of the pattern's field names
      const fieldNameMatch = pattern.fieldNames.some(regex => 
        regex.test(fieldName) || regex.test(normalizedField.normalizedName)
      );
      
      if (fieldNameMatch) {
        // Check if value matches the pattern
        if (pattern.valuePattern.test(value)) {
          // Additional validation if provided
          if (pattern.validateValue && !pattern.validateValue(value)) {
            continue;
          }
          
          const confidence = pattern.getConfidence(fieldName, value, context);
          const reason = this.getMatchReason(fieldName, value, pattern, normalizedField);
          
          matches.push({
            patternName: pattern.name,
            category: pattern.category,
            fieldName,
            value,
            confidence,
            startIndex: 0, // Will be set by caller
            endIndex: 0,   // Will be set by caller
            context,
            reason
          });
        }
      }
    }
    
    return matches;
  }

  /**
   * Generate human-readable reason for the match
   */
  private getMatchReason(fieldName: string, value: string, pattern: FieldPattern, normalizedField: { normalizedName: string; confidence: number }): string {
    const reasons = [];
    
    if (normalizedField.confidence > 0.8) {
      reasons.push(`field name "${fieldName}" normalized to "${normalizedField.normalizedName}"`);
    } else {
      reasons.push(`field name "${fieldName}" matches ${pattern.name.toLowerCase()} pattern`);
    }
    
    if (pattern.validateValue) {
      reasons.push('value passes validation checks');
    }
    
    reasons.push(`value format matches ${pattern.name.toLowerCase()} pattern`);
    
    return reasons.join(', ');
  }

  /**
   * Remove duplicate matches (same position, different patterns)
   */
  private deduplicateMatches(matches: FieldMatch[]): FieldMatch[] {
    const seen = new Map<string, FieldMatch>();
    
    for (const match of matches) {
      const key = `${match.fieldName}:${match.value}:${match.context.recordIndex}`;
      const existing = seen.get(key);
      
      if (!existing || match.confidence > existing.confidence) {
        seen.set(key, match);
      }
    }
    
    return Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence);
  }
}