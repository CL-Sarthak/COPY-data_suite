import { NextRequest, NextResponse } from 'next/server';
import { RuleValidationService } from '@/services/ruleValidationService';
import { QualityRule } from '@/types/qualityRules';

/**
 * POST /api/quality-rules/validate
 * Validate a quality rule for syntactic correctness and logical consistency
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rule, availableFields } = body;

    if (!rule) {
      return NextResponse.json(
        { error: 'Rule is required for validation' },
        { status: 400 }
      );
    }

    // Perform comprehensive validation
    const validationResult = RuleValidationService.validateRule(rule as Partial<QualityRule>);

    // Add field reference validation if available fields are provided
    if (availableFields && Array.isArray(availableFields)) {
      const fieldErrors = RuleValidationService.validateFieldReferences(rule, availableFields);
      validationResult.errors.push(...fieldErrors);
      validationResult.isValid = validationResult.isValid && fieldErrors.length === 0;
    }

    // Return validation results
    return NextResponse.json({
      success: true,
      validation: validationResult,
      summary: {
        isValid: validationResult.isValid,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length,
        criticalErrors: validationResult.errors.filter(e => e.severity === 'error').length,
        recommendations: validationResult.warnings.length
      }
    });

  } catch (error) {
    console.error('Error validating rule:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during rule validation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/quality-rules/validate/schema
 * Return validation schema information for client-side validation
 */
export async function GET() {
  try {
    const validationSchema = {
      ruleTypes: ['validation', 'transformation', 'alert'],
      priorities: ['critical', 'high', 'medium', 'low'],
      statuses: ['draft', 'active', 'inactive', 'archived'],
      conditionOperators: [
        'equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with',
        'regex_match', 'greater_than', 'less_than', 'greater_than_or_equal',
        'less_than_or_equal', 'in_list', 'not_in_list', 'is_null', 'is_not_null',
        'is_empty', 'is_not_empty', 'length_equals', 'length_greater_than',
        'length_less_than', 'is_valid_email', 'is_valid_phone', 'is_valid_date'
      ],
      actionTypes: ['flag_violation', 'log_issue', 'send_alert', 'reject_record', 'auto_correct', 'apply_transformation'],
      severityLevels: ['error', 'warning', 'info'],
      logicalOperators: ['AND', 'OR'],
      limits: {
        maxRuleNameLength: 255,
        maxNestingDepth: 5,
        maxConditionsPerGroup: 20,
        maxActionsPerRule: 10,
        maxDescriptionLength: 1000
      },
      validationRules: {
        requiredFields: ['name', 'conditions', 'actions'],
        conditionalRequirements: {
          'send_alert': ['alertRecipients'],
          'auto_correct': ['targetField', 'transformation'],
          'apply_transformation': ['targetField', 'transformation']
        }
      }
    };

    return NextResponse.json({
      success: true,
      schema: validationSchema
    });

  } catch (error) {
    console.error('Error retrieving validation schema:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error retrieving validation schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}