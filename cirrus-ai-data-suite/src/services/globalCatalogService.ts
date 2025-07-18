/**
 * Global Data Catalog Service
 * Manages a unified catalog schema that all data sources can map to
 */

export interface CatalogField {
  id: string;
  name: string;
  displayName: string;
  description: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json' | 'array' | 'currency';
  category: string;
  isRequired: boolean;
  isStandard: boolean; // True for built-in fields, false for custom fields
  validationRules?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    enumValues?: string[];
    decimalPlaces?: number;
  };
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CatalogCategory {
  id: string;
  name: string;
  displayName: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface SourceFieldMapping {
  id: string;
  sourceId: string;
  sourceFieldName: string;
  catalogFieldId: string;
  transformationRule?: {
    type: 'direct' | 'format' | 'calculation' | 'lookup' | 'conditional';
    expression?: string;
    parameters?: Record<string, unknown>;
  };
  confidence: number;
  isManual: boolean; // True if manually mapped, false if auto-detected
  createdAt: string;
  updatedAt: string;
}

export class GlobalCatalogService {
  // Standard catalog categories
  private static readonly STANDARD_CATEGORIES: CatalogCategory[] = [
    {
      id: 'identity',
      name: 'identity',
      displayName: 'Identity & Personal',
      description: 'Fields related to personal identity and demographics',
      color: 'bg-blue-100 text-blue-800',
      icon: 'UserIcon',
      sortOrder: 1
    },
    {
      id: 'contact',
      name: 'contact',
      displayName: 'Contact Information',
      description: 'Communication and location details',
      color: 'bg-green-100 text-green-800',
      icon: 'PhoneIcon',
      sortOrder: 2
    },
    {
      id: 'location',
      name: 'location',
      displayName: 'Geographic Location',
      description: 'Address and geographic information',
      color: 'bg-purple-100 text-purple-800',
      icon: 'MapPinIcon',
      sortOrder: 3
    },
    {
      id: 'financial',
      name: 'financial',
      displayName: 'Financial Data',
      description: 'Monetary amounts, accounts, and transactions',
      color: 'bg-emerald-100 text-emerald-800',
      icon: 'CurrencyDollarIcon',
      sortOrder: 4
    },
    {
      id: 'temporal',
      name: 'temporal',
      displayName: 'Time & Dates',
      description: 'Timestamps, dates, and time-related information',
      color: 'bg-yellow-100 text-yellow-800',
      icon: 'ClockIcon',
      sortOrder: 5
    },
    {
      id: 'business',
      name: 'business',
      displayName: 'Business Data',
      description: 'Organization and business-related information',
      color: 'bg-indigo-100 text-indigo-800',
      icon: 'BuildingOfficeIcon',
      sortOrder: 6
    },
    {
      id: 'system',
      name: 'system',
      displayName: 'System & Technical',
      description: 'System identifiers, technical metadata',
      color: 'bg-gray-100 text-gray-800',
      icon: 'CogIcon',
      sortOrder: 7
    },
    {
      id: 'custom',
      name: 'custom',
      displayName: 'Custom Fields',
      description: 'User-defined custom fields',
      color: 'bg-orange-100 text-orange-800',
      icon: 'PuzzlePieceIcon',
      sortOrder: 8
    }
  ];

  // Standard catalog fields
  private static readonly STANDARD_FIELDS: Omit<CatalogField, 'createdAt' | 'updatedAt'>[] = [
    // Identity & Personal
    {
      id: 'person_id',
      name: 'person_id',
      displayName: 'Person ID',
      description: 'Unique identifier for a person',
      dataType: 'string',
      category: 'identity',
      isRequired: false,
      isStandard: true,
      tags: ['identifier', 'primary-key']
    },
    {
      id: 'first_name',
      name: 'first_name',
      displayName: 'First Name',
      description: 'Given name or first name',
      dataType: 'string',
      category: 'identity',
      isRequired: false,
      isStandard: true,
      validationRules: { minLength: 1, maxLength: 50 },
      tags: ['personal', 'name']
    },
    {
      id: 'last_name',
      name: 'last_name',
      displayName: 'Last Name',
      description: 'Family name or surname',
      dataType: 'string',
      category: 'identity',
      isRequired: false,
      isStandard: true,
      validationRules: { minLength: 1, maxLength: 50 },
      tags: ['personal', 'name']
    },
    {
      id: 'full_name',
      name: 'full_name',
      displayName: 'Full Name',
      description: 'Complete name (first + last)',
      dataType: 'string',
      category: 'identity',
      isRequired: false,
      isStandard: true,
      validationRules: { minLength: 1, maxLength: 100 },
      tags: ['personal', 'name', 'display']
    },
    {
      id: 'date_of_birth',
      name: 'date_of_birth',
      displayName: 'Date of Birth',
      description: 'Birth date',
      dataType: 'date',
      category: 'identity',
      isRequired: false,
      isStandard: true,
      tags: ['personal', 'sensitive', 'pii']
    },
    {
      id: 'gender',
      name: 'gender',
      displayName: 'Gender',
      description: 'Gender identity',
      dataType: 'string',
      category: 'identity',
      isRequired: false,
      isStandard: true,
      validationRules: { enumValues: ['male', 'female', 'other', 'prefer-not-to-say'] },
      tags: ['personal', 'demographic']
    },

    // Contact Information
    {
      id: 'email_address',
      name: 'email_address',
      displayName: 'Email Address',
      description: 'Primary email address',
      dataType: 'string',
      category: 'contact',
      isRequired: false,
      isStandard: true,
      validationRules: { pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      tags: ['contact', 'communication', 'pii']
    },
    {
      id: 'phone_number',
      name: 'phone_number',
      displayName: 'Phone Number',
      description: 'Primary phone number',
      dataType: 'string',
      category: 'contact',
      isRequired: false,
      isStandard: true,
      validationRules: { pattern: '^[+]?[0-9\\s\\-\\(\\)]{7,15}$' },
      tags: ['contact', 'communication', 'pii']
    },
    {
      id: 'mobile_number',
      name: 'mobile_number',
      displayName: 'Mobile Number',
      description: 'Mobile phone number',
      dataType: 'string',
      category: 'contact',
      isRequired: false,
      isStandard: true,
      tags: ['contact', 'communication', 'mobile']
    },

    // Location
    {
      id: 'street_address',
      name: 'street_address',
      displayName: 'Street Address',
      description: 'Street address including number and name',
      dataType: 'string',
      category: 'location',
      isRequired: false,
      isStandard: true,
      validationRules: { maxLength: 200 },
      tags: ['address', 'location', 'pii']
    },
    {
      id: 'city',
      name: 'city',
      displayName: 'City',
      description: 'City or locality',
      dataType: 'string',
      category: 'location',
      isRequired: false,
      isStandard: true,
      validationRules: { maxLength: 100 },
      tags: ['address', 'location']
    },
    {
      id: 'state_province',
      name: 'state_province',
      displayName: 'State/Province',
      description: 'State, province, or region',
      dataType: 'string',
      category: 'location',
      isRequired: false,
      isStandard: true,
      validationRules: { maxLength: 100 },
      tags: ['address', 'location']
    },
    {
      id: 'postal_code',
      name: 'postal_code',
      displayName: 'Postal Code',
      description: 'ZIP code or postal code',
      dataType: 'string',
      category: 'location',
      isRequired: false,
      isStandard: true,
      validationRules: { maxLength: 20 },
      tags: ['address', 'location']
    },
    {
      id: 'country',
      name: 'country',
      displayName: 'Country',
      description: 'Country name or code',
      dataType: 'string',
      category: 'location',
      isRequired: false,
      isStandard: true,
      validationRules: { maxLength: 100 },
      tags: ['address', 'location']
    },

    // Financial
    {
      id: 'account_number',
      name: 'account_number',
      displayName: 'Account Number',
      description: 'Financial account number',
      dataType: 'string',
      category: 'financial',
      isRequired: false,
      isStandard: true,
      tags: ['financial', 'sensitive', 'account']
    },
    {
      id: 'transaction_amount',
      name: 'transaction_amount',
      displayName: 'Transaction Amount',
      description: 'Monetary amount of transaction',
      dataType: 'number',
      category: 'financial',
      isRequired: false,
      isStandard: true,
      validationRules: { minValue: 0 },
      tags: ['financial', 'amount', 'money']
    },
    {
      id: 'currency_code',
      name: 'currency_code',
      displayName: 'Currency Code',
      description: 'ISO currency code (USD, EUR, etc.)',
      dataType: 'string',
      category: 'financial',
      isRequired: false,
      isStandard: true,
      validationRules: { pattern: '^[A-Z]{3}$', minLength: 3, maxLength: 3 },
      tags: ['financial', 'currency']
    },
    {
      id: 'billing_amount',
      name: 'billing_amount',
      displayName: 'Billing Amount',
      description: 'Total amount billed for services or products',
      dataType: 'currency',
      category: 'financial',
      isRequired: false,
      isStandard: true,
      validationRules: { minValue: 0, decimalPlaces: 2 },
      tags: ['financial', 'billing', 'amount', 'money', 'healthcare']
    },
    {
      id: 'payment_amount',
      name: 'payment_amount',
      displayName: 'Payment Amount',
      description: 'Amount paid or received',
      dataType: 'currency',
      category: 'financial',
      isRequired: false,
      isStandard: true,
      validationRules: { minValue: 0, decimalPlaces: 2 },
      tags: ['financial', 'payment', 'amount', 'money']
    },
    {
      id: 'total_cost',
      name: 'total_cost',
      displayName: 'Total Cost',
      description: 'Total cost or expense amount',
      dataType: 'currency',
      category: 'financial',
      isRequired: false,
      isStandard: true,
      validationRules: { minValue: 0, decimalPlaces: 2 },
      tags: ['financial', 'cost', 'expense', 'money']
    },
    {
      id: 'unit_price',
      name: 'unit_price',
      displayName: 'Unit Price',
      description: 'Price per unit or item',
      dataType: 'currency',
      category: 'financial',
      isRequired: false,
      isStandard: true,
      validationRules: { minValue: 0, decimalPlaces: 2 },
      tags: ['financial', 'price', 'unit', 'money']
    },
    {
      id: 'discount_amount',
      name: 'discount_amount',
      displayName: 'Discount Amount',
      description: 'Amount of discount applied',
      dataType: 'currency',
      category: 'financial',
      isRequired: false,
      isStandard: true,
      validationRules: { minValue: 0, decimalPlaces: 2 },
      tags: ['financial', 'discount', 'amount', 'money']
    },
    {
      id: 'tax_amount',
      name: 'tax_amount',
      displayName: 'Tax Amount',
      description: 'Amount of tax charged',
      dataType: 'currency',
      category: 'financial',
      isRequired: false,
      isStandard: true,
      validationRules: { minValue: 0, decimalPlaces: 2 },
      tags: ['financial', 'tax', 'amount', 'money']
    },
    {
      id: 'insurance_coverage',
      name: 'insurance_coverage',
      displayName: 'Insurance Coverage',
      description: 'Amount covered by insurance',
      dataType: 'currency',
      category: 'financial',
      isRequired: false,
      isStandard: true,
      validationRules: { minValue: 0, decimalPlaces: 2 },
      tags: ['financial', 'insurance', 'coverage', 'money', 'healthcare']
    },
    {
      id: 'copay_amount',
      name: 'copay_amount',
      displayName: 'Copay Amount',
      description: 'Patient copayment amount',
      dataType: 'currency',
      category: 'financial',
      isRequired: false,
      isStandard: true,
      validationRules: { minValue: 0, decimalPlaces: 2 },
      tags: ['financial', 'copay', 'patient', 'money', 'healthcare']
    },
    {
      id: 'deductible_amount',
      name: 'deductible_amount',
      displayName: 'Deductible Amount',
      description: 'Insurance deductible amount',
      dataType: 'currency',
      category: 'financial',
      isRequired: false,
      isStandard: true,
      validationRules: { minValue: 0, decimalPlaces: 2 },
      tags: ['financial', 'deductible', 'insurance', 'money', 'healthcare']
    },

    // Temporal
    {
      id: 'created_timestamp',
      name: 'created_timestamp',
      displayName: 'Created Timestamp',
      description: 'When the record was created',
      dataType: 'datetime',
      category: 'temporal',
      isRequired: false,
      isStandard: true,
      tags: ['timestamp', 'audit', 'creation']
    },
    {
      id: 'modified_timestamp',
      name: 'modified_timestamp',
      displayName: 'Modified Timestamp',
      description: 'When the record was last modified',
      dataType: 'datetime',
      category: 'temporal',
      isRequired: false,
      isStandard: true,
      tags: ['timestamp', 'audit', 'modification']
    },
    {
      id: 'event_date',
      name: 'event_date',
      displayName: 'Event Date',
      description: 'Date when an event occurred',
      dataType: 'date',
      category: 'temporal',
      isRequired: false,
      isStandard: true,
      tags: ['date', 'event']
    },

    // Business
    {
      id: 'organization_id',
      name: 'organization_id',
      displayName: 'Organization ID',
      description: 'Unique identifier for organization',
      dataType: 'string',
      category: 'business',
      isRequired: false,
      isStandard: true,
      tags: ['identifier', 'organization']
    },
    {
      id: 'organization_name',
      name: 'organization_name',
      displayName: 'Organization Name',
      description: 'Name of organization or company',
      dataType: 'string',
      category: 'business',
      isRequired: false,
      isStandard: true,
      validationRules: { maxLength: 200 },
      tags: ['organization', 'business']
    },
    {
      id: 'department',
      name: 'department',
      displayName: 'Department',
      description: 'Department or division',
      dataType: 'string',
      category: 'business',
      isRequired: false,
      isStandard: true,
      validationRules: { maxLength: 100 },
      tags: ['organization', 'department']
    },

    // System
    {
      id: 'record_id',
      name: 'record_id',
      displayName: 'Record ID',
      description: 'Unique identifier for this record',
      dataType: 'string',
      category: 'system',
      isRequired: true,
      isStandard: true,
      tags: ['identifier', 'primary-key', 'system']
    },
    {
      id: 'source_system',
      name: 'source_system',
      displayName: 'Source System',
      description: 'System or application that provided this data',
      dataType: 'string',
      category: 'system',
      isRequired: false,
      isStandard: true,
      tags: ['system', 'lineage', 'source']
    },
    {
      id: 'data_quality_score',
      name: 'data_quality_score',
      displayName: 'Data Quality Score',
      description: 'Quality score for this record (0-100)',
      dataType: 'number',
      category: 'system',
      isRequired: false,
      isStandard: true,
      validationRules: { minValue: 0, maxValue: 100 },
      tags: ['quality', 'score', 'system']
    }
  ];

  /**
   * Get all standard catalog categories
   */
  static getStandardCategories(): CatalogCategory[] {
    return [...this.STANDARD_CATEGORIES];
  }

  /**
   * Get all standard catalog fields
   */
  static getStandardFields(): CatalogField[] {
    const now = new Date().toISOString();
    return this.STANDARD_FIELDS.map(field => ({
      ...field,
      createdAt: now,
      updatedAt: now
    }));
  }

  /**
   * Get fields by category
   */
  static getFieldsByCategory(categoryId: string): CatalogField[] {
    return this.getStandardFields().filter(field => field.category === categoryId);
  }

  /**
   * Get field by ID
   */
  static getFieldById(fieldId: string): CatalogField | null {
    return this.getStandardFields().find(field => field.id === fieldId) || null;
  }

  /**
   * Search fields by name, display name, or tags
   */
  static searchFields(query: string): CatalogField[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getStandardFields().filter(field => 
      field.name.toLowerCase().includes(lowercaseQuery) ||
      field.displayName.toLowerCase().includes(lowercaseQuery) ||
      field.description.toLowerCase().includes(lowercaseQuery) ||
      field.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Suggest catalog fields for a given source field name
   */
  static suggestFieldMappings(sourceFieldName: string): Array<{ field: CatalogField; confidence: number; reason: string }> {
    const suggestions: Array<{ field: CatalogField; confidence: number; reason: string }> = [];
    const lowercaseSource = sourceFieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    for (const field of this.getStandardFields()) {
      let confidence = 0;
      let reason = '';

      // Direct name match
      if (field.name === lowercaseSource) {
        confidence = 1.0;
        reason = 'Exact field name match';
      }
      // Partial name match
      else if (field.name.includes(lowercaseSource) || lowercaseSource.includes(field.name)) {
        confidence = 0.9;
        reason = 'Field name similarity';
      }
      // Display name match
      else if (field.displayName.toLowerCase().replace(/[^a-z0-9]/g, '_').includes(lowercaseSource)) {
        confidence = 0.8;
        reason = 'Display name similarity';
      }
      // Tag match
      else if (field.tags.some(tag => tag.includes(lowercaseSource) || lowercaseSource.includes(tag))) {
        confidence = 0.7;
        reason = 'Tag match';
      }
      // Common patterns
      else if (this.matchesCommonPattern(lowercaseSource, field)) {
        confidence = 0.6;
        reason = 'Common pattern match';
      }

      if (confidence > 0.5) {
        suggestions.push({ field, confidence, reason });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Check if source field matches common patterns for catalog field
   */
  private static matchesCommonPattern(sourceField: string, catalogField: CatalogField): boolean {
    const patterns: Record<string, string[]> = {
      'email_address': ['email', 'mail', 'e_mail'],
      'phone_number': ['phone', 'tel', 'telephone', 'mobile'],
      'first_name': ['fname', 'firstname', 'given_name'],
      'last_name': ['lname', 'lastname', 'surname', 'family_name'],
      'street_address': ['address', 'addr', 'street'],
      'postal_code': ['zip', 'zipcode', 'postcode'],
      'date_of_birth': ['dob', 'birthdate', 'birth_date'],
      'created_timestamp': ['created', 'create_date', 'creation_time'],
      'modified_timestamp': ['modified', 'updated', 'last_modified'],
      
      // Financial/Currency patterns
      'billing_amount': ['billing', 'bill', 'charge', 'charged_amount', 'billed_amount'],
      'payment_amount': ['payment', 'paid', 'pay_amount', 'amount_paid'],
      'total_cost': ['total', 'cost', 'total_cost', 'total_amount', 'amount'],
      'unit_price': ['price', 'unit_price', 'cost_per_unit', 'rate'],
      'discount_amount': ['discount', 'discount_amount', 'savings'],
      'tax_amount': ['tax', 'tax_amount', 'taxes', 'tax_total'],
      'insurance_coverage': ['insurance', 'coverage', 'covered', 'insurance_amount'],
      'copay_amount': ['copay', 'co_pay', 'copayment', 'patient_pay'],
      'deductible_amount': ['deductible', 'deductible_amount', 'patient_deductible'],
      'transaction_amount': ['transaction', 'amount', 'trans_amount']
    };

    const fieldPatterns = patterns[catalogField.name] || [];
    return fieldPatterns.some(pattern => 
      sourceField.includes(pattern) || pattern.includes(sourceField)
    );
  }

  /**
   * Validate a value against catalog field rules
   */
  static validateFieldValue(value: unknown, field: CatalogField): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (field.isRequired && (value === null || value === undefined || value === '')) {
      errors.push(`${field.displayName} is required`);
    }

    if (value !== null && value !== undefined && value !== '') {
      const rules = field.validationRules;
      if (rules) {
        // Type validation
        switch (field.dataType) {
          case 'string':
            if (typeof value !== 'string') {
              errors.push(`${field.displayName} must be a string`);
            } else {
              if (rules.minLength && value.length < rules.minLength) {
                errors.push(`${field.displayName} must be at least ${rules.minLength} characters`);
              }
              if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(`${field.displayName} must be at most ${rules.maxLength} characters`);
              }
              if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
                errors.push(`${field.displayName} format is invalid`);
              }
              if (rules.enumValues && !rules.enumValues.includes(value)) {
                errors.push(`${field.displayName} must be one of: ${rules.enumValues.join(', ')}`);
              }
            }
            break;
          case 'number':
            const numValue = Number(value);
            if (isNaN(numValue)) {
              errors.push(`${field.displayName} must be a number`);
            } else {
              if (rules.minValue !== undefined && numValue < rules.minValue) {
                errors.push(`${field.displayName} must be at least ${rules.minValue}`);
              }
              if (rules.maxValue !== undefined && numValue > rules.maxValue) {
                errors.push(`${field.displayName} must be at most ${rules.maxValue}`);
              }
            }
            break;
          case 'currency':
            const currencyValue = Number(value);
            if (isNaN(currencyValue)) {
              errors.push(`${field.displayName} must be a valid currency amount`);
            } else {
              if (rules.minValue !== undefined && currencyValue < rules.minValue) {
                errors.push(`${field.displayName} must be at least ${rules.minValue}`);
              }
              if (rules.maxValue !== undefined && currencyValue > rules.maxValue) {
                errors.push(`${field.displayName} must be at most ${rules.maxValue}`);
              }
              // Validate decimal places
              if (rules.decimalPlaces !== undefined) {
                const decimalStr = currencyValue.toString();
                const decimalIndex = decimalStr.indexOf('.');
                if (decimalIndex >= 0) {
                  const actualDecimalPlaces = decimalStr.length - decimalIndex - 1;
                  if (actualDecimalPlaces > rules.decimalPlaces) {
                    errors.push(`${field.displayName} can have at most ${rules.decimalPlaces} decimal places`);
                  }
                }
              }
            }
            break;
          case 'date':
          case 'datetime':
            const dateValue = new Date(value as string);
            if (isNaN(dateValue.getTime())) {
              errors.push(`${field.displayName} must be a valid date`);
            }
            break;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}