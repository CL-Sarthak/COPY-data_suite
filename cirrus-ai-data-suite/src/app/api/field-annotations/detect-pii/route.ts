import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/utils/api-response';
import { apiHandler } from '@/utils/api-handler';
import { FieldAnnotationService } from '@/services/fieldAnnotationService';
import { DataSourceService } from '@/services/dataSourceService';

// Common PII patterns and field names
const PII_PATTERNS = {
  email: {
    regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    fieldNames: ['email', 'mail', 'emailaddress', 'email_address', 'contact_email', 'user_email']
  },
  ssn: {
    regex: /^\d{3}-?\d{2}-?\d{4}$/,
    fieldNames: ['ssn', 'social_security', 'social_security_number', 'socialsecurity', 'ssnum']
  },
  phone: {
    regex: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
    fieldNames: ['phone', 'telephone', 'mobile', 'cell', 'phone_number', 'contact_phone', 'phone_primary', 'phone_secondary']
  },
  creditCard: {
    regex: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
    fieldNames: ['credit_card', 'creditcard', 'card_number', 'cardnumber', 'cc', 'payment_card']
  },
  name: {
    regex: null, // Names are hard to detect by regex
    fieldNames: ['name', 'firstname', 'lastname', 'first_name', 'last_name', 'middle_name', 'full_name', 'patient_name', 'customer_name', 'user_name', 'display_name']
  },
  address: {
    regex: null,
    fieldNames: ['address', 'street', 'city', 'state', 'zip', 'postal', 'street_address', 'street_address_1', 'street_address_2', 'home_address', 'billing_address', 'shipping_address']
  },
  date_of_birth: {
    regex: null,
    fieldNames: ['dob', 'date_of_birth', 'birth_date', 'birthdate', 'dateofbirth']
  },
  ip_address: {
    regex: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    fieldNames: ['ip', 'ip_address', 'ipaddress', 'client_ip', 'user_ip']
  },
  passport: {
    regex: /^[A-Z][0-9]{8}$/,
    fieldNames: ['passport', 'passport_number', 'passport_no']
  },
  drivers_license: {
    regex: null,
    fieldNames: ['drivers_license', 'license_number', 'dl_number', 'driving_license']
  },
  bank_account: {
    regex: /^\d{8,17}$/,
    fieldNames: ['account_number', 'bank_account', 'account_no', 'iban', 'routing_number']
  },
  medical_record: {
    regex: null,
    fieldNames: ['mrn', 'medical_record', 'medical_record_number', 'patient_id', 'patient_number']
  }
};

async function detectPIIType(fieldName: string, sampleValues: string[]): Promise<{ isPII: boolean; piiType?: string }> {
  const normalizedFieldName = fieldName.toLowerCase().replace(/[_-]/g, '');
  
  // Check field name patterns
  for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
    const normalizedPatternNames = pattern.fieldNames.map(n => n.toLowerCase().replace(/[_-]/g, ''));
    if (normalizedPatternNames.some(patternName => normalizedFieldName.includes(patternName))) {
      return { isPII: true, piiType };
    }
  }
  
  // Check value patterns if we have samples
  if (sampleValues && sampleValues.length > 0) {
    for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
      if (pattern.regex) {
        const matchCount = sampleValues.filter(value => 
          value && pattern.regex!.test(String(value).trim())
        ).length;
        
        // If more than 50% of samples match the pattern, consider it PII
        if (matchCount > sampleValues.length * 0.5) {
          return { isPII: true, piiType };
        }
      }
    }
  }
  
  return { isPII: false };
}

function getSemanticType(fieldName: string, piiType?: string): string {
  if (piiType) return 'pii';
  
  const normalizedName = fieldName.toLowerCase();
  
  if (normalizedName.includes('id') || normalizedName.includes('key')) return 'identifier';
  if (normalizedName.includes('date') || normalizedName.includes('time') || normalizedName.includes('_at')) return 'timestamp';
  if (normalizedName.includes('count') || normalizedName.includes('total') || normalizedName.includes('amount') || normalizedName.includes('price')) return 'metric';
  if (normalizedName.includes('type') || normalizedName.includes('status') || normalizedName.includes('category')) return 'category';
  if (normalizedName.includes('description') || normalizedName.includes('comment') || normalizedName.includes('note')) return 'text';
  
  return 'other';
}

function getSensitivityLevel(isPII: boolean, piiType?: string): string {
  if (!isPII) return 'internal';
  
  // High sensitivity PII types
  if (['ssn', 'credit_card', 'bank_account', 'passport', 'drivers_license'].includes(piiType || '')) {
    return 'restricted';
  }
  
  // Medium sensitivity PII types
  if (['email', 'phone', 'address', 'date_of_birth', 'medical_record'].includes(piiType || '')) {
    return 'confidential';
  }
  
  // Lower sensitivity PII
  return 'confidential';
}

export const POST = apiHandler(
  async (request: NextRequest) => {
    const body = await request.json();
    const { dataSourceId } = body;

    if (!dataSourceId) {
      return errorResponse(new Error('dataSourceId is required'), 'dataSourceId is required', 400);
    }

    try {
      // Get transformed data to analyze fields
      // Get the data source first
      const dataSource = await DataSourceService.getDataSourceById(dataSourceId);
      if (!dataSource) {
        return errorResponse(new Error('Data source not found'), 'Data source not found', 404);
      }
      
      // Parse transformed data
      let transformedData = null;
      if (dataSource.transformedData) {
        transformedData = JSON.parse(dataSource.transformedData);
      }
      
      if (!transformedData || !transformedData.records || transformedData.records.length === 0) {
        return errorResponse(new Error('No data available for PII detection'), 'No data available for PII detection', 404);
      }

      // Extract field information
      const fieldInfo: Map<string, { name: string; values: Set<string> }> = new Map();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transformedData.records.forEach((record: any) => {
        const recordData = record.data || record;
        Object.entries(recordData).forEach(([key, value]) => {
          if (!fieldInfo.has(key)) {
            fieldInfo.set(key, { name: key, values: new Set() });
          }
          
          // Collect sample values (limit to 10 per field)
          const field = fieldInfo.get(key)!;
          if (field.values.size < 10 && value !== null && value !== undefined && 
              !Array.isArray(value) && typeof value !== 'object') {
            field.values.add(String(value));
          }
        });
      });

      // Analyze each field for PII
      const detectedAnnotations = [];
      
      for (const [fieldPath, field] of fieldInfo.entries()) {
        const sampleValues = Array.from(field.values);
        const { isPII, piiType } = await detectPIIType(field.name, sampleValues);
        
        if (isPII || Math.random() < 0.3) { // Also annotate some non-PII fields for better data governance
          const annotation = {
            dataSourceId,
            fieldPath,
            fieldName: field.name,
            semanticType: getSemanticType(field.name, piiType),
            isPII,
            piiType: isPII ? piiType : undefined,
            sensitivityLevel: getSensitivityLevel(isPII, piiType),
            description: isPII ? `Auto-detected as ${piiType || 'PII'}` : `Auto-classified as ${getSemanticType(field.name)}`,
            tags: isPII ? ['auto-detected', 'pii'] : ['auto-detected'],
            exampleValues: sampleValues.slice(0, 5),
            createdBy: 'system',
            updatedBy: 'system'
          };
          
          // Save the annotation
          const savedAnnotation = await FieldAnnotationService.createOrUpdate(annotation);
          detectedAnnotations.push(savedAnnotation);
        }
      }

      return successResponse(detectedAnnotations);
    } catch (error) {
      console.error('Error detecting PII:', error);
      return errorResponse(error as Error, 'Failed to detect PII fields', 500);
    }
  },
  {
    routeName: 'field-annotations.detect-pii.POST'
  }
);