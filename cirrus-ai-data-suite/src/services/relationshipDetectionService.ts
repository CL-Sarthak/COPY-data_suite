import { HybridMatch } from './hybridPatternService';

export interface FieldRelationship {
  id: string;
  name: string;
  description: string;
  primaryField: string;
  relatedFields: string[];
  relationshipType: 'explicit' | 'inferred' | 'proximity';
  confidence: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
}

export interface RelatedField {
  fieldName: string;
  relationship: FieldRelationship;
  confidence: number;
  reason: string;
  suggestedPattern?: string;
}

export interface RelationshipMatch {
  primaryMatch: HybridMatch;
  relatedFields: RelatedField[];
  relationshipConfidence: number;
  totalRelatedCount: number;
}

export class RelationshipDetectionService {
  private relationships: FieldRelationship[] = [
    // Healthcare Relationships
    {
      id: 'healthcare-patient-identity',
      name: 'Patient Identity Cluster',
      description: 'Core patient identifying information that should be protected together',
      primaryField: 'ssn|social_security|patient_id|medical_record',
      relatedFields: ['name', 'dob|birth_date', 'address', 'phone', 'email'],
      relationshipType: 'explicit',
      confidence: 0.95,
      priority: 'critical',
      category: 'Healthcare'
    },
    {
      id: 'healthcare-insurance',
      name: 'Insurance Information',
      description: 'Insurance-related data that should be grouped for privacy',
      primaryField: 'insurance_id|policy_number|member_id',
      relatedFields: ['name', 'group_number', 'insurance_company', 'subscriber_id'],
      relationshipType: 'explicit',
      confidence: 0.90,
      priority: 'high',
      category: 'Healthcare'
    },
    {
      id: 'healthcare-provider',
      name: 'Healthcare Provider Information',
      description: 'Provider identification and contact information',
      primaryField: 'provider_id|npi|doctor_id',
      relatedFields: ['provider_name', 'provider_phone', 'provider_address', 'specialty'],
      relationshipType: 'explicit',
      confidence: 0.85,
      priority: 'medium',
      category: 'Healthcare'
    },

    // Financial Relationships
    {
      id: 'financial-account',
      name: 'Financial Account Cluster',
      description: 'Account information and associated customer data',
      primaryField: 'account_number|card_number|routing_number',
      relatedFields: ['name', 'ssn', 'address', 'phone', 'email'],
      relationshipType: 'explicit',
      confidence: 0.95,
      priority: 'critical',
      category: 'Financial'
    },
    {
      id: 'financial-transaction',
      name: 'Transaction Information',
      description: 'Transaction data with associated account details',
      primaryField: 'transaction_id|reference_number',
      relatedFields: ['account_number', 'amount', 'date', 'merchant'],
      relationshipType: 'explicit',
      confidence: 0.80,
      priority: 'medium',
      category: 'Financial'
    },

    // Employment Relationships
    {
      id: 'employment-employee',
      name: 'Employee Identity Cluster',
      description: 'Employee personal and professional information',
      primaryField: 'employee_id|emp_id|badge_number',
      relatedFields: ['name', 'ssn', 'email', 'phone', 'department', 'position'],
      relationshipType: 'explicit',
      confidence: 0.90,
      priority: 'high',
      category: 'Employment'
    },
    {
      id: 'employment-payroll',
      name: 'Payroll Information',
      description: 'Salary and compensation data linked to employee',
      primaryField: 'employee_id|ssn',
      relatedFields: ['salary', 'bonus', 'benefits', 'tax_withholding', 'bank_account'],
      relationshipType: 'explicit',
      confidence: 0.95,
      priority: 'critical',
      category: 'Employment'
    },

    // Contact Information Relationships
    {
      id: 'contact-personal',
      name: 'Personal Contact Cluster',
      description: 'Personal identifying and contact information',
      primaryField: 'name|full_name',
      relatedFields: ['email', 'phone', 'address', 'dob'],
      relationshipType: 'inferred',
      confidence: 0.75,
      priority: 'high',
      category: 'General'
    },
    {
      id: 'contact-address',
      name: 'Address Information Cluster',
      description: 'Complete address information and related location data',
      primaryField: 'address|street_address',
      relatedFields: ['city', 'state', 'zip|postal_code', 'country'],
      relationshipType: 'explicit',
      confidence: 0.90,
      priority: 'medium',
      category: 'General'
    },

    // Legal/Government Relationships
    {
      id: 'legal-case',
      name: 'Legal Case Information',
      description: 'Case-related data and associated parties',
      primaryField: 'case_number|docket_number',
      relatedFields: ['plaintiff', 'defendant', 'attorney', 'court', 'judge'],
      relationshipType: 'explicit',
      confidence: 0.85,
      priority: 'high',
      category: 'Legal'
    }
  ];

  /**
   * Detect relationships between fields based on discovered patterns
   */
  detectRelationships(
    matches: HybridMatch[], 
    recordData: Record<string, unknown>
  ): RelationshipMatch[] {
    const relationshipMatches: RelationshipMatch[] = [];
    const processedMatches = new Set<string>();

    for (const match of matches) {
      if (processedMatches.has(this.getMatchKey(match))) {
        continue;
      }

      // Find relationships where this match could be the primary field
      const applicableRelationships = this.findApplicableRelationships(match);

      for (const relationship of applicableRelationships) {
        const relatedFields = this.findRelatedFields(
          match, 
          relationship, 
          recordData,
          matches
        );

        if (relatedFields.length > 0) {
          const relationshipConfidence = this.calculateRelationshipConfidence(
            match,
            relatedFields,
            relationship
          );

          relationshipMatches.push({
            primaryMatch: match,
            relatedFields,
            relationshipConfidence,
            totalRelatedCount: relatedFields.length
          });

          // Mark related matches as processed to avoid duplicates
          processedMatches.add(this.getMatchKey(match));
          relatedFields.forEach(rf => {
            const relatedMatch = matches.find(m => 
              m.fieldName === rf.fieldName && m.value === recordData[rf.fieldName]
            );
            if (relatedMatch) {
              processedMatches.add(this.getMatchKey(relatedMatch));
            }
          });
        }
      }
    }

    return relationshipMatches.sort((a, b) => b.relationshipConfidence - a.relationshipConfidence);
  }

  /**
   * Find relationships that could apply to this match
   */
  private findApplicableRelationships(match: HybridMatch): FieldRelationship[] {
    return this.relationships.filter(relationship => {
      const primaryPattern = new RegExp(relationship.primaryField, 'i');
      return primaryPattern.test(match.fieldName || '') || 
             primaryPattern.test(match.patternName.toLowerCase());
    });
  }

  /**
   * Find related fields in the same record
   */
  private findRelatedFields(
    primaryMatch: HybridMatch,
    relationship: FieldRelationship,
    recordData: Record<string, unknown>,
    allMatches: HybridMatch[]
  ): RelatedField[] {
    const relatedFields: RelatedField[] = [];
    const recordFields = Object.keys(recordData);

    for (const relatedPattern of relationship.relatedFields) {
      const pattern = new RegExp(relatedPattern, 'i');
      
      // Look for fields that match the related pattern
      const matchingFields = recordFields.filter(field => pattern.test(field));
      
      for (const fieldName of matchingFields) {
        const fieldValue = recordData[fieldName];
        
        // Skip empty or null values
        if (!fieldValue || fieldValue === 'null' || fieldValue === 'undefined') {
          continue;
        }

        // Check if this field already has a detected pattern
        const existingMatch = allMatches.find(m => 
          m.fieldName === fieldName && String(m.value) === String(fieldValue)
        );

        const confidence = this.calculateFieldRelationshipConfidence(
          primaryMatch,
          fieldName,
          fieldValue,
          relationship,
          !!existingMatch
        );

        if (confidence > 0.5) { // Only include if confidence is reasonable
          relatedFields.push({
            fieldName,
            relationship,
            confidence,
            reason: this.getRelationshipReason(
              primaryMatch,
              fieldName,
              relationship,
              !!existingMatch
            ),
            suggestedPattern: existingMatch?.patternName || this.suggestPatternForField(fieldName, fieldValue)
          });
        }
      }
    }

    return relatedFields.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate confidence score for field relationship
   */
  private calculateFieldRelationshipConfidence(
    primaryMatch: HybridMatch,
    relatedFieldName: string,
    relatedFieldValue: unknown,
    relationship: FieldRelationship,
    hasExistingPattern: boolean
  ): number {
    let confidence = relationship.confidence;

    // Boost confidence if field already has a detected pattern
    if (hasExistingPattern) {
      confidence += 0.1;
    }

    // Boost confidence for exact field name matches
    const relatedPatterns = relationship.relatedFields;
    const exactMatch = relatedPatterns.some(pattern => {
      const regex = new RegExp(`^${pattern}$`, 'i');
      return regex.test(relatedFieldName);
    });

    if (exactMatch) {
      confidence += 0.15;
    }

    // Boost confidence for high-priority relationships
    if (relationship.priority === 'critical') {
      confidence += 0.05;
    }

    // Reduce confidence for very generic field names
    const genericFields = ['id', 'data', 'info', 'value', 'field'];
    if (genericFields.some(generic => relatedFieldName.toLowerCase().includes(generic))) {
      confidence -= 0.2;
    }

    // Boost confidence if primary match has high confidence
    if (primaryMatch.confidence > 0.9) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.99); // Cap at 99%
  }

  /**
   * Calculate overall relationship confidence
   */
  private calculateRelationshipConfidence(
    primaryMatch: HybridMatch,
    relatedFields: RelatedField[],
    relationship: FieldRelationship
  ): number {
    const baseConfidence = relationship.confidence;
    const primaryConfidence = primaryMatch.confidence;
    const avgRelatedConfidence = relatedFields.reduce((sum, rf) => sum + rf.confidence, 0) / relatedFields.length;
    
    // Weight: 40% relationship base, 30% primary match, 30% related fields
    const weightedConfidence = (baseConfidence * 0.4) + (primaryConfidence * 0.3) + (avgRelatedConfidence * 0.3);
    
    // Bonus for finding many related fields
    const completenessBonus = Math.min(relatedFields.length / relationship.relatedFields.length * 0.1, 0.1);
    
    return Math.min(weightedConfidence + completenessBonus, 0.99);
  }

  /**
   * Generate human-readable reason for relationship
   */
  private getRelationshipReason(
    primaryMatch: HybridMatch,
    relatedFieldName: string,
    relationship: FieldRelationship,
    hasExistingPattern: boolean
  ): string {
    const reasons = [];
    
    reasons.push(`related to ${primaryMatch.patternName} via ${relationship.name}`);
    
    if (hasExistingPattern) {
      reasons.push('already detected as sensitive pattern');
    }
    
    if (relationship.priority === 'critical') {
      reasons.push('critical privacy relationship');
    }
    
    reasons.push(`${relationship.relationshipType} relationship`);
    
    return reasons.join(', ');
  }

  /**
   * Suggest pattern type for a field based on name and value
   */
  private suggestPatternForField(fieldName: string, fieldValue: unknown): string | undefined {
    const value = String(fieldValue).toLowerCase();
    const field = fieldName.toLowerCase();

    if (field.includes('name') && /^[a-z\s\-'\.]{2,50}$/i.test(value)) {
      return 'Person Name';
    }
    
    if (field.includes('email') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Email Address';
    }
    
    if (field.includes('phone') && /[\d\-\(\)\s]{7,20}/.test(value)) {
      return 'Phone Number';
    }
    
    if ((field.includes('dob') || field.includes('birth')) && /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(value)) {
      return 'Date of Birth';
    }
    
    if (field.includes('address') && value.length > 10) {
      return 'Street Address';
    }

    return undefined;
  }

  /**
   * Generate unique key for a match
   */
  private getMatchKey(match: HybridMatch): string {
    return `${match.fieldName}:${match.value}:${match.startIndex}`;
  }

  /**
   * Get all available relationship types
   */
  getAvailableRelationships(): FieldRelationship[] {
    return [...this.relationships];
  }

  /**
   * Get relationships by category
   */
  getRelationshipsByCategory(category: string): FieldRelationship[] {
    return this.relationships.filter(r => r.category === category);
  }

  /**
   * Add custom relationship
   */
  addCustomRelationship(relationship: FieldRelationship): void {
    this.relationships.push(relationship);
  }

  /**
   * Get relationship statistics
   */
  getRelationshipStats(relationshipMatches: RelationshipMatch[]): {
    totalRelationships: number;
    averageConfidence: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    totalRelatedFields: number;
  } {
    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let totalRelatedFields = 0;

    relationshipMatches.forEach(rm => {
      const category = rm.relatedFields[0]?.relationship.category || 'Unknown';
      const priority = rm.relatedFields[0]?.relationship.priority || 'medium';
      
      byCategory[category] = (byCategory[category] || 0) + 1;
      byPriority[priority] = (byPriority[priority] || 0) + 1;
      totalRelatedFields += rm.totalRelatedCount;
    });

    const avgConfidence = relationshipMatches.length > 0
      ? relationshipMatches.reduce((sum, rm) => sum + rm.relationshipConfidence, 0) / relationshipMatches.length
      : 0;

    return {
      totalRelationships: relationshipMatches.length,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      byCategory,
      byPriority,
      totalRelatedFields
    };
  }
}