import { SensitivePattern } from '@/types';

export interface ClusterPattern {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  fields: ClusterField[];
  confidence: number;
  examples?: Record<string, string>[];
}

export interface ClusterField {
  fieldName: string;
  pattern: string;
  required: boolean;
  alternateNames?: string[];
  validation?: (value: string) => boolean;
}

export interface DetectedCluster {
  clusterId: string;
  clusterName: string;
  confidence: number;
  detectedFields: Array<{
    fieldName: string;
    value: string;
    pattern: string;
    confidence: number;
  }>;
  missingRequiredFields: string[];
  completeness: number;
}

export class ClusterPatternService {
  /**
   * Flatten nested relational data into a format suitable for cluster detection
   */
  static flattenRelationalData(data: Record<string, unknown>[]): Array<{ fieldName: string; value: string }> {
    const flattened: Array<{ fieldName: string; value: string }> = [];
    
    const flattenObject = (obj: Record<string, unknown>, prefix = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        
        if (value === null || value === undefined) {
          continue;
        }
        
        if (typeof value === 'object' && !Array.isArray(value)) {
          // Recursively flatten nested objects
          flattenObject(value as Record<string, unknown>, fieldName);
        } else if (Array.isArray(value)) {
          // For arrays, flatten each element
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              flattenObject(item as Record<string, unknown>, `${fieldName}[${index}]`);
            } else if (typeof item === 'string' || typeof item === 'number') {
              flattened.push({
                fieldName: `${fieldName}[${index}]`,
                value: String(item)
              });
            }
          });
        } else {
          // Convert primitive values to string
          flattened.push({
            fieldName,
            value: String(value)
          });
        }
      }
    };
    
    // Process each record
    data.forEach(record => {
      if (typeof record === 'object' && record !== null) {
        flattenObject(record as Record<string, unknown>);
      }
    });
    
    return flattened;
  }

  /**
   * Detect clusters in flattened relational data
   */
  static detectClusters(flattenedData: Array<{ fieldName: string; value: string }>): Array<{ name: string; fields: string[]; confidence: number }> {
    const detectedClusters: Array<{ name: string; fields: string[]; confidence: number }> = [];
    
    // Group fields by their base name (without array indices and table prefixes)
    const fieldGroups = new Map<string, Set<string>>();
    const fieldValues = new Map<string, string[]>();
    
    flattenedData.forEach(({ fieldName, value }) => {
      // Extract base field name (remove array indices and simplify nested paths)
      const baseName = fieldName
        .replace(/\[\d+\]/g, '') // Remove array indices
        .split('.')
        .pop() || fieldName; // Get the last part of the path
      
      if (!fieldGroups.has(baseName)) {
        fieldGroups.set(baseName, new Set());
        fieldValues.set(baseName, []);
      }
      
      fieldGroups.get(baseName)?.add(fieldName);
      fieldValues.get(baseName)?.push(value);
    });
    
    // Convert to object format for existing cluster detection
    const dataObject: Record<string, string> = {};
    fieldGroups.forEach((fieldSet, baseName) => {
      const values = fieldValues.get(baseName) || [];
      // Use the first non-empty value as representative
      dataObject[baseName] = values.find(v => v && v.trim() !== '') || '';
    });
    
    // Use existing cluster detection logic
    const standardDetected = this.detectClustersInObject(dataObject);
    
    // Convert to simplified format
    standardDetected.forEach(cluster => {
      const fields = new Set<string>();
      
      // Map detected fields back to their full paths
      cluster.detectedFields.forEach(df => {
        const baseField = df.fieldName;
        const relatedFields = fieldGroups.get(baseField) || new Set([baseField]);
        relatedFields.forEach(f => fields.add(f));
      });
      
      if (fields.size > 0) {
        detectedClusters.push({
          name: cluster.clusterName,
          fields: Array.from(fields),
          confidence: cluster.confidence
        });
      }
    });
    
    return detectedClusters;
  }

  /**
   * Detect clusters in a flat object (renamed from detectClusters to avoid confusion)
   */
  private static detectClustersInObject(data: Record<string, string>): DetectedCluster[] {
    const detectedClusters: DetectedCluster[] = [];
    const fieldNames = Object.keys(data);

    for (const cluster of this.clusterPatterns) {
      const detectedFields: DetectedCluster['detectedFields'] = [];
      const missingRequiredFields: string[] = [];
      let matchScore = 0;

      for (const clusterField of cluster.fields) {
        const matchedFieldName = this.findMatchingField(fieldNames, clusterField);
        
        if (matchedFieldName && data[matchedFieldName]) {
          detectedFields.push({
            fieldName: matchedFieldName,
            value: String(data[matchedFieldName]),
            pattern: clusterField.pattern,
            confidence: 0.9
          });
          matchScore += clusterField.required ? 2 : 1;
        } else if (clusterField.required) {
          missingRequiredFields.push(clusterField.fieldName);
        }
      }

      // Calculate completeness
      const totalPossibleScore = cluster.fields.reduce((sum, f) => sum + (f.required ? 2 : 1), 0);
      const completeness = matchScore / totalPossibleScore;

      // Only include clusters with at least 50% completeness and all required fields
      if (completeness >= 0.5 && missingRequiredFields.length === 0) {
        detectedClusters.push({
          clusterId: cluster.id,
          clusterName: cluster.name,
          confidence: cluster.confidence * completeness,
          detectedFields,
          missingRequiredFields,
          completeness
        });
      }
    }

    return detectedClusters.sort((a, b) => b.confidence - a.confidence);
  }

  private static clusterPatterns: ClusterPattern[] = [
    {
      id: 'personal-identity',
      name: 'Personal Identity Information',
      description: 'Complete personal identification data',
      category: 'PII',
      priority: 'high',
      confidence: 0.95,
      fields: [
        {
          fieldName: 'name',
          pattern: 'Name',
          required: true,
          alternateNames: ['firstName', 'lastName', 'fullName', 'name', 'customer_name', 'patient_name']
        },
        {
          fieldName: 'email',
          pattern: 'Email Address',
          required: false,
          alternateNames: ['email', 'emailAddress', 'email_address', 'contact_email']
        },
        {
          fieldName: 'phone',
          pattern: 'Phone Number',
          required: false,
          alternateNames: ['phone', 'phoneNumber', 'phone_number', 'mobile', 'telephone']
        },
        {
          fieldName: 'address',
          pattern: 'Address',
          required: false,
          alternateNames: ['address', 'street', 'streetAddress', 'street_address']
        },
        {
          fieldName: 'ssn',
          pattern: 'Social Security Number',
          required: false,
          alternateNames: ['ssn', 'socialSecurity', 'social_security', 'taxId', 'tax_id']
        }
      ]
    },
    {
      id: 'complete-address',
      name: 'Complete Address',
      description: 'Full mailing address information',
      category: 'PII',
      priority: 'medium',
      confidence: 0.9,
      fields: [
        {
          fieldName: 'street',
          pattern: 'Address',
          required: true,
          alternateNames: ['address', 'street', 'streetAddress', 'address1', 'line1']
        },
        {
          fieldName: 'city',
          pattern: 'City',
          required: true,
          alternateNames: ['city', 'town', 'municipality']
        },
        {
          fieldName: 'state',
          pattern: 'State',
          required: true,
          alternateNames: ['state', 'province', 'region', 'stateProvince']
        },
        {
          fieldName: 'zipCode',
          pattern: 'Zip Code',
          required: true,
          alternateNames: ['zip', 'zipCode', 'postalCode', 'postal_code', 'postcode']
        },
        {
          fieldName: 'country',
          pattern: 'Country',
          required: false,
          alternateNames: ['country', 'countryCode', 'country_code']
        }
      ]
    },
    {
      id: 'payment-card',
      name: 'Payment Card Information',
      description: 'Complete credit/debit card details',
      category: 'FINANCIAL',
      priority: 'high',
      confidence: 0.98,
      fields: [
        {
          fieldName: 'cardNumber',
          pattern: 'Credit Card',
          required: true,
          alternateNames: ['cardNumber', 'card_number', 'creditCard', 'credit_card', 'pan']
        },
        {
          fieldName: 'cardholderName',
          pattern: 'Name',
          required: true,
          alternateNames: ['cardholderName', 'cardholder_name', 'nameOnCard', 'name_on_card']
        },
        {
          fieldName: 'expirationDate',
          pattern: 'Date',
          required: true,
          alternateNames: ['expiry', 'expiration', 'expirationDate', 'exp_date', 'expires']
        },
        {
          fieldName: 'cvv',
          pattern: 'CVV',
          required: false,
          alternateNames: ['cvv', 'cvc', 'securityCode', 'security_code']
        },
        {
          fieldName: 'billingAddress',
          pattern: 'Address',
          required: false,
          alternateNames: ['billingAddress', 'billing_address']
        }
      ]
    },
    {
      id: 'medical-record',
      name: 'Medical Record',
      description: 'Patient medical information',
      category: 'MEDICAL',
      priority: 'high',
      confidence: 0.95,
      fields: [
        {
          fieldName: 'patientName',
          pattern: 'Name',
          required: true,
          alternateNames: ['patientName', 'patient_name', 'patient', 'name']
        },
        {
          fieldName: 'mrn',
          pattern: 'Medical Record Number',
          required: true,
          alternateNames: ['mrn', 'medicalRecordNumber', 'medical_record_number', 'patientId']
        },
        {
          fieldName: 'dateOfBirth',
          pattern: 'Date of Birth',
          required: false,
          alternateNames: ['dob', 'dateOfBirth', 'date_of_birth', 'birthDate']
        },
        {
          fieldName: 'diagnosis',
          pattern: 'Medical Diagnosis',
          required: false,
          alternateNames: ['diagnosis', 'condition', 'medical_condition']
        },
        {
          fieldName: 'provider',
          pattern: 'Name',
          required: false,
          alternateNames: ['provider', 'physician', 'doctor', 'practitioner']
        }
      ]
    },
    {
      id: 'bank-account',
      name: 'Bank Account Information',
      description: 'Banking and financial account details',
      category: 'FINANCIAL',
      priority: 'high',
      confidence: 0.95,
      fields: [
        {
          fieldName: 'accountNumber',
          pattern: 'Account Number',
          required: true,
          alternateNames: ['accountNumber', 'account_number', 'account', 'acct']
        },
        {
          fieldName: 'routingNumber',
          pattern: 'Routing Number',
          required: true,
          alternateNames: ['routingNumber', 'routing_number', 'aba', 'transit']
        },
        {
          fieldName: 'accountHolder',
          pattern: 'Name',
          required: true,
          alternateNames: ['accountHolder', 'account_holder', 'accountName', 'account_name']
        },
        {
          fieldName: 'bankName',
          pattern: 'Bank Name',
          required: false,
          alternateNames: ['bankName', 'bank_name', 'institution', 'bank']
        }
      ]
    },
    {
      id: 'employee-record',
      name: 'Employee Record',
      description: 'Employee personal and professional information',
      category: 'PII',
      priority: 'high',
      confidence: 0.92,
      fields: [
        {
          fieldName: 'employeeName',
          pattern: 'Name',
          required: true,
          alternateNames: ['name', 'employeeName', 'employee_name', 'fullName']
        },
        {
          fieldName: 'employeeId',
          pattern: 'Employee ID',
          required: true,
          alternateNames: ['employeeId', 'employee_id', 'empId', 'staffId', 'badge']
        },
        {
          fieldName: 'email',
          pattern: 'Email Address',
          required: false,
          alternateNames: ['email', 'workEmail', 'work_email', 'corporateEmail']
        },
        {
          fieldName: 'department',
          pattern: 'Department',
          required: false,
          alternateNames: ['department', 'dept', 'division', 'team']
        },
        {
          fieldName: 'salary',
          pattern: 'Currency',
          required: false,
          alternateNames: ['salary', 'compensation', 'pay', 'wage']
        }
      ]
    }
  ];


  /**
   * Find matching field name considering alternates
   */
  private static findMatchingField(fieldNames: string[], clusterField: ClusterField): string | null {
    const allNames = [clusterField.fieldName, ...(clusterField.alternateNames || [])];
    
    for (const fieldName of fieldNames) {
      const normalizedFieldName = fieldName.toLowerCase().replace(/[_-]/g, '');
      
      for (const alternateName of allNames) {
        const normalizedAlternate = alternateName.toLowerCase().replace(/[_-]/g, '');
        if (normalizedFieldName === normalizedAlternate || 
            normalizedFieldName.includes(normalizedAlternate) ||
            normalizedAlternate.includes(normalizedFieldName)) {
          return fieldName;
        }
      }
    }
    
    return null;
  }

  /**
   * Create a custom cluster pattern from detected relationships
   */
  static createClusterFromRelationships(
    primaryField: string,
    relatedFields: Array<{ fieldName: string; pattern: string }>,
    name: string,
    category: string = 'CUSTOM'
  ): ClusterPattern {
    return {
      id: `custom-${Date.now()}`,
      name,
      description: `Custom cluster based on ${primaryField}`,
      category,
      priority: 'medium',
      confidence: 0.85,
      fields: [
        {
          fieldName: primaryField,
          pattern: 'Primary Field',
          required: true,
          alternateNames: [primaryField]
        },
        ...relatedFields.map(rf => ({
          fieldName: rf.fieldName,
          pattern: rf.pattern,
          required: false,
          alternateNames: [rf.fieldName]
        }))
      ]
    };
  }

  /**
   * Get all available cluster patterns
   */
  static getAllClusterPatterns(): ClusterPattern[] {
    return [...this.clusterPatterns];
  }

  /**
   * Add a new cluster pattern
   */
  static addClusterPattern(pattern: ClusterPattern): void {
    this.clusterPatterns.push(pattern);
  }

  /**
   * Detect clusters in structured data (for backward compatibility)
   */
  static detectClustersLegacy(data: Record<string, string>): DetectedCluster[] {
    return this.detectClustersInObject(data);
  }

  /**
   * Convert detected clusters to sensitive patterns
   */
  static clustersToPatterns(clusters: DetectedCluster[]): SensitivePattern[] {
    const patterns: SensitivePattern[] = [];
    
    for (const cluster of clusters) {
      const clusterDef = this.clusterPatterns.find(cp => cp.id === cluster.clusterId);
      if (!clusterDef) continue;

      // Create a pattern for the entire cluster
      patterns.push({
        id: `cluster-${cluster.clusterId}`,
        label: cluster.clusterName,
        color: this.getCategoryColor(clusterDef.category),
        type: this.mapCategoryToType(clusterDef.category),
        examples: cluster.detectedFields.map(f => f.value),
        isCluster: true,
        clusterFields: cluster.detectedFields.map(f => f.fieldName)
      } as SensitivePattern & { isCluster: boolean; clusterFields: string[] });
    }
    
    return patterns;
  }

  private static getCategoryColor(category: string): string {
    const colorMap: Record<string, string> = {
      'PII': 'bg-red-100 text-red-800',
      'FINANCIAL': 'bg-yellow-100 text-yellow-800',
      'MEDICAL': 'bg-purple-100 text-purple-800',
      'CUSTOM': 'bg-blue-100 text-blue-800'
    };
    return colorMap[category] || 'bg-gray-100 text-gray-800';
  }

  private static mapCategoryToType(category: string): SensitivePattern['type'] {
    const typeMap: Record<string, SensitivePattern['type']> = {
      'PII': 'PII',
      'FINANCIAL': 'FINANCIAL',
      'MEDICAL': 'MEDICAL',
      'CUSTOM': 'CUSTOM'
    };
    return typeMap[category] || 'CUSTOM';
  }
}