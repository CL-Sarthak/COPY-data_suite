/* eslint-disable @typescript-eslint/no-unused-vars */
import { FixMethod, FixSuggestion, ValidationResult, RiskLevel } from '@/types/remediation';

export interface FixResult {
  success: boolean;
  originalValue: unknown;
  fixedValue: unknown;
  confidence: number; // 0-1
  method: FixMethod;
  metadata: {
    reasoning: string;
    alternatives?: FixSuggestion[];
    riskLevel: RiskLevel;
    reversible: boolean;
    dataLoss: boolean;
    executionTime?: number;
  };
}

export interface FixContext {
  fieldName: string;
  fieldType?: string;
  recordId?: string;
  additionalData?: Record<string, unknown>;
  validationRules?: unknown[];
}

/**
 * AutoFixEngine - Core transformation engine for data quality remediation
 * Provides automated fixes for common data quality issues with confidence scoring
 */
export class AutoFixEngine {
  
  // ==================== DATA CLEANING OPERATIONS ====================
  
  /**
   * Remove leading and trailing whitespace
   */
  static trimWhitespace(value: unknown, _context?: FixContext): FixResult {
    const startTime = Date.now();
    const originalValue = value;
    
    if (typeof value !== 'string') {
      return {
        success: false,
        originalValue,
        fixedValue: value,
        confidence: 0,
        method: 'trim_whitespace',
        metadata: {
          reasoning: 'Value is not a string',
          riskLevel: 'low',
          reversible: true,
          dataLoss: false,
          executionTime: Date.now() - startTime
        }
      };
    }

    const fixedValue = value.trim();
    const changed = originalValue !== fixedValue;
    
    return {
      success: changed,
      originalValue,
      fixedValue,
      confidence: changed ? 0.95 : 0.0,
      method: 'trim_whitespace',
      metadata: {
        reasoning: changed ? 'Removed leading/trailing whitespace' : 'No whitespace to remove',
        riskLevel: 'low',
        reversible: true,
        dataLoss: false,
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Remove special characters while preserving specified ones
   */
  static removeSpecialCharacters(
    value: unknown, 
    options: { preserve?: string[] } = {}, 
    _context?: FixContext
  ): FixResult {
    const startTime = Date.now();
    const originalValue = value;
    const preserve = options.preserve || ['-', '_', '.'];
    
    if (typeof value !== 'string') {
      return {
        success: false,
        originalValue,
        fixedValue: value,
        confidence: 0,
        method: 'remove_special_chars',
        metadata: {
          reasoning: 'Value is not a string',
          riskLevel: 'low',
          reversible: false,
          dataLoss: true,
          executionTime: Date.now() - startTime
        }
      };
    }

    // Create regex pattern to preserve specific characters
    const preservePattern = preserve.map(char => `\\${char}`).join('');
    const pattern = new RegExp(`[^a-zA-Z0-9${preservePattern}\\s]`, 'g');
    const fixedValue = value.replace(pattern, '');
    const changed = originalValue !== fixedValue;
    
    return {
      success: changed,
      originalValue,
      fixedValue,
      confidence: changed ? 0.85 : 0.0,
      method: 'remove_special_chars',
      metadata: {
        reasoning: changed ? `Removed special characters, preserved: ${preserve.join(', ')}` : 'No special characters to remove',
        riskLevel: 'medium',
        reversible: false,
        dataLoss: changed,
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Standardize text case
   */
  static standardizeCase(
    value: unknown, 
    format: 'upper' | 'lower' | 'title' | 'sentence', 
    _context?: FixContext
  ): FixResult {
    const startTime = Date.now();
    const originalValue = value;
    
    if (typeof value !== 'string') {
      return {
        success: false,
        originalValue,
        fixedValue: value,
        confidence: 0,
        method: 'standardize_case',
        metadata: {
          reasoning: 'Value is not a string',
          riskLevel: 'low',
          reversible: true,
          dataLoss: false,
          executionTime: Date.now() - startTime
        }
      };
    }

    let fixedValue: string;
    switch (format) {
      case 'upper':
        fixedValue = value.toUpperCase();
        break;
      case 'lower':
        fixedValue = value.toLowerCase();
        break;
      case 'title':
        fixedValue = value.replace(/\w\S*/g, (txt) => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
        break;
      case 'sentence':
        fixedValue = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        break;
      default:
        fixedValue = value;
    }

    const changed = originalValue !== fixedValue;
    
    return {
      success: changed,
      originalValue,
      fixedValue,
      confidence: changed ? 0.9 : 0.0,
      method: 'standardize_case',
      metadata: {
        reasoning: changed ? `Converted to ${format} case` : `Already in ${format} case`,
        riskLevel: 'low',
        reversible: format !== 'lower', // Lowercase loses original casing
        dataLoss: format === 'lower',
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Remove extra spaces (multiple consecutive spaces)
   */
  static removeExtraSpaces(value: unknown, _context?: FixContext): FixResult {
    const startTime = Date.now();
    const originalValue = value;
    
    if (typeof value !== 'string') {
      return {
        success: false,
        originalValue,
        fixedValue: value,
        confidence: 0,
        method: 'remove_extra_spaces',
        metadata: {
          reasoning: 'Value is not a string',
          riskLevel: 'low',
          reversible: true,
          dataLoss: false,
          executionTime: Date.now() - startTime
        }
      };
    }

    const fixedValue = value.replace(/\s+/g, ' ').trim();
    const changed = originalValue !== fixedValue;
    
    return {
      success: changed,
      originalValue,
      fixedValue,
      confidence: changed ? 0.9 : 0.0,
      method: 'remove_extra_spaces',
      metadata: {
        reasoning: changed ? 'Removed extra spaces' : 'No extra spaces found',
        riskLevel: 'low',
        reversible: false,
        dataLoss: changed,
        executionTime: Date.now() - startTime
      }
    };
  }

  // ==================== FORMAT STANDARDIZATION ====================

  /**
   * Standardize email addresses
   */
  static standardizeEmail(value: unknown, _context?: FixContext): FixResult {
    const startTime = Date.now();
    const originalValue = value;
    
    if (typeof value !== 'string') {
      return {
        success: false,
        originalValue,
        fixedValue: value,
        confidence: 0,
        method: 'standardize_email',
        metadata: {
          reasoning: 'Value is not a string',
          riskLevel: 'low',
          reversible: true,
          dataLoss: false,
          executionTime: Date.now() - startTime
        }
      };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return {
        success: false,
        originalValue,
        fixedValue: value,
        confidence: 0,
        method: 'standardize_email',
        metadata: {
          reasoning: 'Invalid email format',
          riskLevel: 'medium',
          reversible: true,
          dataLoss: false,
          executionTime: Date.now() - startTime
        }
      };
    }

    const fixedValue = value.toLowerCase().trim();
    const changed = originalValue !== fixedValue;
    
    return {
      success: changed,
      originalValue,
      fixedValue,
      confidence: changed ? 0.9 : 0.0,
      method: 'standardize_email',
      metadata: {
        reasoning: changed ? 'Converted to lowercase and trimmed' : 'Already in standard format',
        riskLevel: 'low',
        reversible: false,
        dataLoss: false,
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Standardize phone numbers
   */
  static standardizePhone(
    value: unknown, 
    options: { format?: string; country?: string } = {}, 
    _context?: FixContext
  ): FixResult {
    const startTime = Date.now();
    const originalValue = value;
    const { format = 'international', country = 'US' } = options;
    
    if (typeof value !== 'string') {
      return {
        success: false,
        originalValue,
        fixedValue: value,
        confidence: 0,
        method: 'standardize_phone',
        metadata: {
          reasoning: 'Value is not a string',
          riskLevel: 'low',
          reversible: true,
          dataLoss: false,
          executionTime: Date.now() - startTime
        }
      };
    }

    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    // Validate digit count for US numbers
    if (country === 'US' && digitsOnly.length !== 10 && digitsOnly.length !== 11) {
      return {
        success: false,
        originalValue,
        fixedValue: value,
        confidence: 0,
        method: 'standardize_phone',
        metadata: {
          reasoning: `Invalid US phone number length: ${digitsOnly.length} digits`,
          riskLevel: 'medium',
          reversible: true,
          dataLoss: false,
          executionTime: Date.now() - startTime
        }
      };
    }

    let fixedValue: string;
    if (country === 'US') {
      const phoneDigits = digitsOnly.length === 11 ? digitsOnly.substring(1) : digitsOnly;
      
      switch (format) {
        case 'international':
          fixedValue = `+1-${phoneDigits.substring(0, 3)}-${phoneDigits.substring(3, 6)}-${phoneDigits.substring(6)}`;
          break;
        case 'national':
          fixedValue = `(${phoneDigits.substring(0, 3)}) ${phoneDigits.substring(3, 6)}-${phoneDigits.substring(6)}`;
          break;
        case 'digits':
          fixedValue = phoneDigits;
          break;
        default:
          fixedValue = `+1-${phoneDigits.substring(0, 3)}-${phoneDigits.substring(3, 6)}-${phoneDigits.substring(6)}`;
      }
    } else {
      fixedValue = `+${digitsOnly}`;
    }

    const changed = originalValue !== fixedValue;
    
    return {
      success: changed,
      originalValue,
      fixedValue,
      confidence: changed ? 0.8 : 0.0,
      method: 'standardize_phone',
      metadata: {
        reasoning: changed ? `Standardized to ${format} format` : `Already in ${format} format`,
        riskLevel: 'low',
        reversible: false,
        dataLoss: false,
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Standardize date formats
   */
  static standardizeDate(
    value: unknown, 
    targetFormat: string = 'YYYY-MM-DD', 
    _context?: FixContext
  ): FixResult {
    const startTime = Date.now();
    const originalValue = value;
    
    if (typeof value !== 'string' && !(value instanceof Date)) {
      return {
        success: false,
        originalValue,
        fixedValue: value,
        confidence: 0,
        method: 'standardize_date',
        metadata: {
          reasoning: 'Value is not a string or Date',
          riskLevel: 'low',
          reversible: true,
          dataLoss: false,
          executionTime: Date.now() - startTime
        }
      };
    }

    let date: Date;
    if (value instanceof Date) {
      date = value;
    } else {
      date = new Date(value);
      if (isNaN(date.getTime())) {
        return {
          success: false,
          originalValue,
          fixedValue: value,
          confidence: 0,
          method: 'standardize_date',
          metadata: {
            reasoning: 'Invalid date format',
            riskLevel: 'medium',
            reversible: true,
            dataLoss: false,
            executionTime: Date.now() - startTime
          }
        };
      }
    }

    let fixedValue: string;
    switch (targetFormat) {
      case 'YYYY-MM-DD':
        fixedValue = date.toISOString().split('T')[0];
        break;
      case 'MM/DD/YYYY':
        fixedValue = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
        break;
      case 'DD/MM/YYYY':
        fixedValue = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        break;
      default:
        fixedValue = date.toISOString().split('T')[0];
    }

    const originalString = originalValue != null ? String(originalValue) : '';
    const changed = originalString !== fixedValue;
    
    return {
      success: changed,
      originalValue,
      fixedValue,
      confidence: changed ? 0.85 : 0.0,
      method: 'standardize_date',
      metadata: {
        reasoning: changed ? `Converted to ${targetFormat} format` : `Already in ${targetFormat} format`,
        riskLevel: 'low',
        reversible: true,
        dataLoss: false,
        executionTime: Date.now() - startTime
      }
    };
  }

  // ==================== DATA VALIDATION & CORRECTION ====================

  /**
   * Fill missing values with specified strategy
   */
  static fillMissingValues(
    value: unknown, 
    strategy: 'mean' | 'median' | 'mode' | 'default' | 'forward_fill',
    options: { 
      defaultValue?: unknown; 
      referenceValues?: unknown[];
      fieldType?: string;
    } = {},
    _context?: FixContext
  ): FixResult {
    const startTime = Date.now();
    const originalValue = value;
    
    // Check if value is actually missing
    if (value !== null && value !== undefined && value !== '' && !Number.isNaN(value)) {
      return {
        success: false,
        originalValue,
        fixedValue: value,
        confidence: 0,
        method: 'fill_missing_values',
        metadata: {
          reasoning: 'Value is not missing',
          riskLevel: 'low',
          reversible: true,
          dataLoss: false,
          executionTime: Date.now() - startTime
        }
      };
    }

    let fixedValue: unknown;
    let confidence = 0.75;
    let reasoning = '';

    switch (strategy) {
      case 'default':
        fixedValue = options.defaultValue ?? 'N/A';
        reasoning = `Filled with default value: ${fixedValue}`;
        confidence = 0.8;
        break;
        
      case 'mean':
        if (options.referenceValues && options.referenceValues.length > 0) {
          const numericValues = options.referenceValues.filter((v): v is number => typeof v === 'number' && !isNaN(v));
          if (numericValues.length > 0) {
            fixedValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
            reasoning = `Filled with mean of ${numericValues.length} values: ${(fixedValue as number).toFixed(2)}`;
            confidence = 0.7;
          } else {
            fixedValue = 0;
            reasoning = 'No numeric reference values, used 0';
            confidence = 0.3;
          }
        } else {
          fixedValue = 0;
          reasoning = 'No reference values provided, used 0';
          confidence = 0.3;
        }
        break;
        
      case 'mode':
        if (options.referenceValues && options.referenceValues.length > 0) {
          const frequency = options.referenceValues.reduce((acc: Record<string, number>, val) => {
            const key = String(val);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          fixedValue = Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
          reasoning = `Filled with most frequent value: ${fixedValue}`;
          confidence = 0.7;
        } else {
          fixedValue = 'Unknown';
          reasoning = 'No reference values provided, used "Unknown"';
          confidence = 0.3;
        }
        break;
        
      default:
        fixedValue = options.defaultValue ?? 'N/A';
        reasoning = `Filled with default strategy: ${fixedValue}`;
        confidence = 0.5;
    }

    return {
      success: true,
      originalValue,
      fixedValue,
      confidence,
      method: 'fill_missing_values',
      metadata: {
        reasoning,
        riskLevel: 'medium',
        reversible: true,
        dataLoss: false,
        executionTime: Date.now() - startTime
      }
    };
  }

  /**
   * Validate and correct numeric ranges
   */
  static validateRange(
    value: unknown, 
    min: number, 
    max: number, 
    strategy: 'clamp' | 'flag' = 'clamp',
    _context?: FixContext
  ): FixResult {
    const startTime = Date.now();
    const originalValue = value;
    
    const numericValue = Number(value);
    if (isNaN(numericValue)) {
      return {
        success: false,
        originalValue,
        fixedValue: value,
        confidence: 0,
        method: 'validate_range',
        metadata: {
          reasoning: 'Value is not numeric',
          riskLevel: 'low',
          reversible: true,
          dataLoss: false,
          executionTime: Date.now() - startTime
        }
      };
    }

    if (numericValue >= min && numericValue <= max) {
      return {
        success: false,
        originalValue,
        fixedValue: value,
        confidence: 0,
        method: 'validate_range',
        metadata: {
          reasoning: `Value ${numericValue} is within range [${min}, ${max}]`,
          riskLevel: 'low',
          reversible: true,
          dataLoss: false,
          executionTime: Date.now() - startTime
        }
      };
    }

    let fixedValue: unknown;
    let confidence: number;
    let reasoning: string;

    if (strategy === 'clamp') {
      fixedValue = Math.max(min, Math.min(max, numericValue));
      confidence = 0.6;
      reasoning = `Clamped ${numericValue} to range [${min}, ${max}] = ${fixedValue}`;
    } else {
      fixedValue = value;
      confidence = 0;
      reasoning = `Value ${numericValue} is outside range [${min}, ${max}] - flagged for review`;
    }

    return {
      success: strategy === 'clamp',
      originalValue,
      fixedValue,
      confidence,
      method: 'validate_range',
      metadata: {
        reasoning,
        riskLevel: 'medium',
        reversible: true,
        dataLoss: strategy === 'clamp' && fixedValue !== numericValue,
        executionTime: Date.now() - startTime
      }
    };
  }

  // ==================== BUSINESS LOGIC FIXES ====================

  /**
   * Standardize country codes
   */
  static standardizeCountryCode(
    value: unknown, 
    format: 'iso2' | 'iso3' | 'name' = 'iso2',
    _context?: FixContext
  ): FixResult {
    const startTime = Date.now();
    const originalValue = value;
    
    if (typeof value !== 'string') {
      return {
        success: false,
        originalValue,
        fixedValue: value,
        confidence: 0,
        method: 'standardize_country_code',
        metadata: {
          reasoning: 'Value is not a string',
          riskLevel: 'low',
          reversible: true,
          dataLoss: false,
          executionTime: Date.now() - startTime
        }
      };
    }

    // Simple country code mapping (in real implementation, use a comprehensive library)
    const countryMappings: Record<string, { iso2: string; iso3: string; name: string }> = {
      'US': { iso2: 'US', iso3: 'USA', name: 'United States' },
      'USA': { iso2: 'US', iso3: 'USA', name: 'United States' },
      'UNITED STATES': { iso2: 'US', iso3: 'USA', name: 'United States' },
      'CA': { iso2: 'CA', iso3: 'CAN', name: 'Canada' },
      'CAN': { iso2: 'CA', iso3: 'CAN', name: 'Canada' },
      'CANADA': { iso2: 'CA', iso3: 'CAN', name: 'Canada' },
      'GB': { iso2: 'GB', iso3: 'GBR', name: 'United Kingdom' },
      'UK': { iso2: 'GB', iso3: 'GBR', name: 'United Kingdom' },
      'GBR': { iso2: 'GB', iso3: 'GBR', name: 'United Kingdom' },
      'UNITED KINGDOM': { iso2: 'GB', iso3: 'GBR', name: 'United Kingdom' },
    };

    const normalizedInput = value.toUpperCase().trim();
    const mapping = countryMappings[normalizedInput];
    
    if (!mapping) {
      return {
        success: false,
        originalValue,
        fixedValue: value,
        confidence: 0,
        method: 'standardize_country_code',
        metadata: {
          reasoning: `Unknown country: ${value}`,
          riskLevel: 'medium',
          reversible: true,
          dataLoss: false,
          executionTime: Date.now() - startTime
        }
      };
    }

    const fixedValue = mapping[format];
    const changed = originalValue !== fixedValue;
    
    return {
      success: changed,
      originalValue,
      fixedValue,
      confidence: changed ? 0.85 : 0.0,
      method: 'standardize_country_code',
      metadata: {
        reasoning: changed ? `Converted to ${format} format: ${fixedValue}` : `Already in ${format} format`,
        riskLevel: 'low',
        reversible: true,
        dataLoss: false,
        executionTime: Date.now() - startTime
      }
    };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Analyze value and suggest appropriate fix methods
   */
  static suggestFixMethods(value: unknown, _context?: FixContext): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];
    
    if (typeof value === 'string') {
      // Check for whitespace issues
      if (value !== value.trim()) {
        suggestions.push({
          method: 'trim_whitespace',
          confidence: 0.95,
          expectedResult: value.trim(),
          reasoning: 'Remove leading/trailing whitespace',
          riskLevel: 'low',
          prerequisites: [],
          alternatives: []
        });
      }

      // Check for multiple spaces
      if (/\s{2,}/.test(value)) {
        suggestions.push({
          method: 'remove_extra_spaces',
          confidence: 0.9,
          expectedResult: value.replace(/\s+/g, ' ').trim(),
          reasoning: 'Remove extra spaces',
          riskLevel: 'low',
          prerequisites: [],
          alternatives: []
        });
      }

      // Check for email format
      if (value.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        suggestions.push({
          method: 'standardize_email',
          confidence: 0.9,
          expectedResult: value.toLowerCase().trim(),
          reasoning: 'Standardize email format',
          riskLevel: 'low',
          prerequisites: [],
          alternatives: []
        });
      }

      // Check for phone number patterns
      if (/[\d\-\(\)\s\+]{7,}/.test(value)) {
        suggestions.push({
          method: 'standardize_phone',
          confidence: 0.8,
          expectedResult: 'Formatted phone number',
          reasoning: 'Standardize phone number format',
          riskLevel: 'low',
          prerequisites: [],
          alternatives: []
        });
      }
    }

    // Check for missing values
    if (value === null || value === undefined || value === '' || 
        (typeof value === 'number' && isNaN(value))) {
      suggestions.push({
        method: 'fill_missing_values',
        confidence: 0.75,
        expectedResult: 'Filled value',
        reasoning: 'Fill missing value',
        riskLevel: 'medium',
        prerequisites: [],
        alternatives: []
      });
    }

    return suggestions;
  }

  /**
   * Validate a fix result
   */
  static validateFixResult(result: FixResult): ValidationResult {
    const issues: string[] = [];
    
    if (result.confidence < 0 || result.confidence > 1) {
      issues.push('Confidence score must be between 0 and 1');
    }
    
    if (result.success && result.originalValue === result.fixedValue) {
      issues.push('Fix marked as successful but values are identical');
    }
    
    if (!result.success && result.confidence > 0.5) {
      issues.push('High confidence for unsuccessful fix');
    }

    return {
      isValid: issues.length === 0,
      confidence: issues.length === 0 ? 1.0 : 0.0,
      issues
    };
  }
}