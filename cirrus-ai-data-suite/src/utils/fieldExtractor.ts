import { logger } from '@/utils/logger';

export interface ExtractedField {
  name: string;
  type: string;
  sampleValues?: unknown[];
  isPII?: boolean;
}

/**
 * Extract field information from data records
 */
export function extractFieldsFromData(data: unknown[]): ExtractedField[] {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const fieldInfo: Map<string, ExtractedField> = new Map();
  
  // Sample up to 100 records for field detection
  const sampleSize = Math.min(data.length, 100);
  const sampledData = data.slice(0, sampleSize);
  
  // Analyze each record
  for (const record of sampledData) {
    if (typeof record !== 'object' || record === null) continue;
    
    // Handle UnifiedDataRecord structure - check if record has a 'data' property
    const recordWithData = record as { data?: Record<string, unknown>; sourceId?: string };
    const dataToAnalyze = recordWithData.data && recordWithData.sourceId ? recordWithData.data : record;
    
    for (const [key, value] of Object.entries(dataToAnalyze)) {
      if (!fieldInfo.has(key)) {
        fieldInfo.set(key, {
          name: key,
          type: 'unknown',
          sampleValues: [],
          isPII: checkIfFieldIsPII(key)
        });
      }
      
      const field = fieldInfo.get(key)!;
      
      // Update type based on value
      if (value !== null && value !== undefined) {
        const valueType = typeof value;
        if (valueType === 'number') {
          field.type = 'number';
        } else if (valueType === 'boolean') {
          field.type = 'boolean';
        } else if (value instanceof Date) {
          field.type = 'date';
        } else if (valueType === 'string') {
          // Check if it's a date string
          if (isDateString(value)) {
            field.type = 'date';
          } else {
            field.type = 'string';
          }
        } else if (Array.isArray(value)) {
          field.type = 'array';
        } else if (valueType === 'object') {
          field.type = 'object';
        }
        
        // Collect sample values (up to 5 unique ones)
        if (field.sampleValues!.length < 5 && !field.sampleValues!.includes(value)) {
          field.sampleValues!.push(value);
        }
      }
    }
  }
  
  // Convert to array and sort by field name
  const fields = Array.from(fieldInfo.values()).sort((a, b) => a.name.localeCompare(b.name));
  
  logger.info(`Extracted ${fields.length} fields from data`);
  return fields;
}

/**
 * Check if a field name suggests PII
 */
function checkIfFieldIsPII(fieldName: string): boolean {
  const piiPatterns = [
    'ssn', 'social_security', 'socialsecurity',
    'credit_card', 'creditcard', 'card_number', 
    'credit_score', 'creditscore', 'creditScore',
    'phone', 'email', 'address', 'street',
    'birth_date', 'birthdate', 'dob',
    'passport', 'driver_license', 'license_number',
    'bank_account', 'account_number',
    'tax_id', 'ein', 'tin',
    'medical_record', 'patient_id', 'mrn'
  ];
  
  const lowerFieldName = fieldName.toLowerCase();
  return piiPatterns.some(pattern => lowerFieldName.includes(pattern));
}

/**
 * Check if a string value is a date
 */
function isDateString(value: string): boolean {
  // Common date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
  ];
  
  if (datePatterns.some(pattern => pattern.test(value))) {
    return true;
  }
  
  // Try parsing as date
  const parsed = Date.parse(value);
  return !isNaN(parsed) && value.length < 50; // Avoid long strings that happen to parse
}

/**
 * Extract fields from nested JSON structure
 */
export function extractFieldsFromNestedData(data: unknown, prefix = ''): ExtractedField[] {
  const fields: ExtractedField[] = [];
  
  if (Array.isArray(data) && data.length > 0) {
    // For arrays, analyze the first element
    return extractFieldsFromNestedData(data[0], prefix);
  }
  
  if (typeof data === 'object' && data !== null) {
    for (const [key, value] of Object.entries(data)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      
      if (value === null || value === undefined) {
        fields.push({
          name: fieldPath,
          type: 'unknown',
          isPII: checkIfFieldIsPII(key)
        });
      } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Nested object - recurse
        fields.push(...extractFieldsFromNestedData(value, fieldPath));
      } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        // Array of objects - analyze structure
        fields.push({
          name: fieldPath,
          type: 'array<object>',
          isPII: checkIfFieldIsPII(key)
        });
        fields.push(...extractFieldsFromNestedData(value[0], fieldPath));
      } else {
        // Leaf field
        let fieldType = 'unknown';
        if (typeof value === 'number') fieldType = 'number';
        else if (typeof value === 'boolean') fieldType = 'boolean';
        else if (typeof value === 'string') fieldType = isDateString(value) ? 'date' : 'string';
        else if (Array.isArray(value)) fieldType = 'array';
        else if (value instanceof Date) fieldType = 'date';
        
        fields.push({
          name: fieldPath,
          type: fieldType,
          isPII: checkIfFieldIsPII(key)
        });
      }
    }
  }
  
  return fields;
}