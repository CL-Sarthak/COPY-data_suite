import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';

// GET /api/quality-rules/templates - Get rule templates optimized for normalization
export const GET = withErrorHandler(async () => {
  try {
    console.log('Quality Rule Templates API: Getting normalization-focused templates');
    
    const normalizationRuleTemplates = [
      {
        id: 'norm-rule-1',
        name: 'Email Format Consistency Check',
        description: 'Detects inconsistent email formats that need normalization',
        category: 'consistency',
        fieldName: 'email',
        ruleType: 'pattern',
        conditions: [
          { operator: 'not_matches', value: '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$' }
        ],
        severity: 'medium',
        suggestedFix: 'normalize_email'
      },
      {
        id: 'norm-rule-2',
        name: 'Phone Number Format Check',
        description: 'Identifies phone numbers in non-standard formats',
        category: 'consistency',
        fieldName: 'phone',
        ruleType: 'pattern',
        conditions: [
          { operator: 'not_matches', value: '^\\+[1-9]\\d{1,14}$' }
        ],
        severity: 'medium',
        suggestedFix: 'normalize_phone'
      },
      {
        id: 'norm-rule-3',
        name: 'Date Format Inconsistency',
        description: 'Finds dates not in ISO 8601 format',
        category: 'consistency',
        fieldName: 'date',
        ruleType: 'pattern',
        conditions: [
          { operator: 'not_matches', value: '^\\d{4}-\\d{2}-\\d{2}$' }
        ],
        severity: 'high',
        suggestedFix: 'normalize_date'
      },
      {
        id: 'norm-rule-4',
        name: 'Mixed Case Text Detection',
        description: 'Detects inconsistent text casing in name fields',
        category: 'consistency',
        fieldName: 'name',
        ruleType: 'custom',
        conditions: [
          { operator: 'has_mixed_case', value: true }
        ],
        severity: 'low',
        suggestedFix: 'normalize_name_case'
      },
      {
        id: 'norm-rule-5',
        name: 'Currency Format Variations',
        description: 'Identifies currency values in non-standard formats',
        category: 'consistency',
        fieldName: 'amount',
        ruleType: 'pattern',
        conditions: [
          { operator: 'matches', value: '[$,]|\\s(USD|EUR|GBP)' }
        ],
        severity: 'medium',
        suggestedFix: 'normalize_currency'
      },
      {
        id: 'norm-rule-6',
        name: 'Boolean Value Inconsistency',
        description: 'Finds boolean fields with non-standard values',
        category: 'consistency',
        fieldName: 'is_active',
        ruleType: 'custom',
        conditions: [
          { operator: 'not_in', value: ['true', 'false', true, false] }
        ],
        severity: 'medium',
        suggestedFix: 'normalize_boolean'
      },
      {
        id: 'norm-rule-7',
        name: 'Whitespace Issues',
        description: 'Detects excessive or irregular whitespace',
        category: 'consistency',
        fieldName: 'any_text_field',
        ruleType: 'custom',
        conditions: [
          { operator: 'has_extra_whitespace', value: true }
        ],
        severity: 'low',
        suggestedFix: 'normalize_whitespace'
      },
      {
        id: 'norm-rule-8',
        name: 'Country Code Variations',
        description: 'Finds country fields not using ISO codes',
        category: 'consistency',
        fieldName: 'country',
        ruleType: 'custom',
        conditions: [
          { operator: 'not_matches', value: '^[A-Z]{2}$' }
        ],
        severity: 'medium',
        suggestedFix: 'normalize_country_code'
      }
    ];
    
    console.log('Quality Rule Templates API: Returning', normalizationRuleTemplates.length, 'templates');
    
    return successResponse(normalizationRuleTemplates);
  } catch (error) {
    console.error('Quality Rule Templates API Error:', error);
    return errorResponse(error, 'Failed to fetch quality rule templates', 500);
  }
}, 'Failed to fetch quality rule templates');