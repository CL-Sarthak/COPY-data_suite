import { QualityRule, ConditionGroup, RuleCondition, RuleAction, ConditionOperator } from '@/types/qualityRules';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'rule' | 'condition' | 'action' | 'syntax';
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

export interface ValidationWarning {
  type: 'performance' | 'logic' | 'best_practice';
  field: string;
  message: string;
  suggestion: string;
  code: string;
}

/**
 * Comprehensive rule validation service
 * Validates rule syntax, logic, and best practices
 */
export class RuleValidationService {
  
  /**
   * Validate a complete quality rule
   */
  static validateRule(rule: Partial<QualityRule>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic rule validation
    this.validateBasicRuleProperties(rule, errors);
    
    // Condition validation
    if (rule.conditions) {
      this.validateConditionGroup(rule.conditions, errors, warnings);
    }
    
    // Action validation
    if (rule.actions) {
      this.validateActions(rule.actions, errors, warnings);
    }
    
    // Cross-validation (conditions vs actions)
    this.validateRuleLogic(rule, errors, warnings);
    
    // Performance warnings
    this.validatePerformance(rule, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate basic rule properties
   */
  private static validateBasicRuleProperties(rule: Partial<QualityRule>, errors: ValidationError[]): void {
    // Required fields
    if (!rule.name || rule.name.trim().length === 0) {
      errors.push({
        type: 'rule',
        field: 'name',
        message: 'Rule name is required and cannot be empty',
        severity: 'error',
        code: 'RULE_NAME_REQUIRED'
      });
    }

    if (rule.name && rule.name.length > 255) {
      errors.push({
        type: 'rule',
        field: 'name',
        message: 'Rule name cannot exceed 255 characters',
        severity: 'error',
        code: 'RULE_NAME_TOO_LONG'
      });
    }

    // Rule type validation
    const validTypes = ['validation', 'transformation', 'alert'];
    if (rule.type && !validTypes.includes(rule.type)) {
      errors.push({
        type: 'rule',
        field: 'type',
        message: `Invalid rule type. Must be one of: ${validTypes.join(', ')}`,
        severity: 'error',
        code: 'INVALID_RULE_TYPE'
      });
    }

    // Priority validation
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    if (rule.priority && !validPriorities.includes(rule.priority)) {
      errors.push({
        type: 'rule',
        field: 'priority',
        message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
        severity: 'error',
        code: 'INVALID_PRIORITY'
      });
    }

    // Status validation
    const validStatuses = ['draft', 'active', 'inactive', 'archived'];
    if (rule.status && !validStatuses.includes(rule.status)) {
      errors.push({
        type: 'rule',
        field: 'status',
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        severity: 'error',
        code: 'INVALID_STATUS'
      });
    }
  }

  /**
   * Validate condition group recursively
   */
  private static validateConditionGroup(
    group: ConditionGroup, 
    errors: ValidationError[], 
    warnings: ValidationWarning[],
    depth: number = 0,
    path: string = 'conditions'
  ): void {
    // Check nesting depth
    if (depth > 5) {
      errors.push({
        type: 'condition',
        field: path,
        message: 'Condition nesting too deep (maximum 5 levels)',
        severity: 'error',
        code: 'CONDITION_NESTING_TOO_DEEP'
      });
      return;
    }

    // Validate logical operator
    const validOperators = ['AND', 'OR'];
    if (!validOperators.includes(group.operator)) {
      errors.push({
        type: 'condition',
        field: `${path}.operator`,
        message: `Invalid logical operator. Must be one of: ${validOperators.join(', ')}`,
        severity: 'error',
        code: 'INVALID_LOGICAL_OPERATOR'
      });
    }

    // Validate conditions array
    if (!group.conditions || group.conditions.length === 0) {
      errors.push({
        type: 'condition',
        field: `${path}.conditions`,
        message: 'Condition group must contain at least one condition',
        severity: 'error',
        code: 'EMPTY_CONDITION_GROUP'
      });
      return;
    }

    // Check for too many conditions (performance)
    if (group.conditions.length > 20) {
      warnings.push({
        type: 'performance',
        field: `${path}.conditions`,
        message: 'Large number of conditions may impact performance',
        suggestion: 'Consider breaking into multiple rules or using nested groups',
        code: 'TOO_MANY_CONDITIONS'
      });
    }

    // Validate each condition
    group.conditions.forEach((condition, index) => {
      const conditionPath = `${path}.conditions[${index}]`;
      
      if ('conditions' in condition) {
        // Nested condition group
        this.validateConditionGroup(condition, errors, warnings, depth + 1, conditionPath);
      } else {
        // Individual condition
        this.validateCondition(condition, errors, warnings, conditionPath);
      }
    });
  }

  /**
   * Validate individual condition
   */
  private static validateCondition(
    condition: RuleCondition, 
    errors: ValidationError[], 
    warnings: ValidationWarning[],
    path: string
  ): void {
    // Field name validation
    if (!condition.field || condition.field.trim().length === 0) {
      errors.push({
        type: 'condition',
        field: `${path}.field`,
        message: 'Field name is required',
        severity: 'error',
        code: 'CONDITION_FIELD_REQUIRED'
      });
    }

    // Operator validation
    const validOperators: ConditionOperator[] = [
      'equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with',
      'regex_match', 'greater_than', 'less_than', 'greater_or_equal',
      'less_or_equal', 'between', 'in_list', 'not_in_list', 'is_null', 'is_not_null',
      'is_empty', 'is_not_empty', 'date_before', 'date_after', 'date_between'
    ];

    if (!validOperators.includes(condition.operator)) {
      errors.push({
        type: 'condition',
        field: `${path}.operator`,
        message: `Invalid condition operator: ${condition.operator}`,
        severity: 'error',
        code: 'INVALID_CONDITION_OPERATOR'
      });
    }

    // Value validation based on operator
    this.validateConditionValue(condition, errors, warnings, path);

    // Regex validation for regex_match operator
    if (condition.operator === 'regex_match' && condition.value) {
      try {
        new RegExp(condition.value.toString());
      } catch (e) {
        errors.push({
          type: 'syntax',
          field: `${path}.value`,
          message: `Invalid regular expression: ${e instanceof Error ? e.message : 'Unknown error'}`,
          severity: 'error',
          code: 'INVALID_REGEX'
        });
      }
    }
  }

  /**
   * Validate condition value based on operator
   */
  private static validateConditionValue(
    condition: RuleCondition,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    path: string
  ): void {
    const { operator, value } = condition;

    // Operators that don't require a value
    const noValueOperators = ['is_null', 'is_not_null', 'is_empty', 'is_not_empty', 'is_valid_email', 'is_valid_phone', 'is_valid_date'];
    
    if (noValueOperators.includes(operator)) {
      if (value !== undefined && value !== null && value !== '') {
        warnings.push({
          type: 'logic',
          field: `${path}.value`,
          message: `Operator '${operator}' does not require a value`,
          suggestion: 'Remove the value for this operator',
          code: 'UNNECESSARY_VALUE'
        });
      }
      return;
    }

    // Operators that require a value
    if (value === undefined || value === null || value === '') {
      errors.push({
        type: 'condition',
        field: `${path}.value`,
        message: `Operator '${operator}' requires a value`,
        severity: 'error',
        code: 'CONDITION_VALUE_REQUIRED'
      });
      return;
    }

    // Numeric operators
    const numericOperators = ['greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'length_equals', 'length_greater_than', 'length_less_than'];
    if (numericOperators.includes(operator)) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push({
          type: 'condition',
          field: `${path}.value`,
          message: `Operator '${operator}' requires a numeric value`,
          severity: 'error',
          code: 'NUMERIC_VALUE_REQUIRED'
        });
      }
    }

    // List operators
    const listOperators = ['in_list', 'not_in_list'];
    if (listOperators.includes(operator)) {
      if (!Array.isArray(value) && typeof value === 'string') {
        // Try to parse as comma-separated list
        try {
          const parsed = value.split(',').map(v => v.trim()).filter(v => v.length > 0);
          if (parsed.length === 0) {
            errors.push({
              type: 'condition',
              field: `${path}.value`,
              message: `Operator '${operator}' requires a non-empty list`,
              severity: 'error',
              code: 'EMPTY_LIST_VALUE'
            });
          }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_e) {
          errors.push({
            type: 'condition',
            field: `${path}.value`,
            message: `Invalid list format for operator '${operator}'`,
            severity: 'error',
            code: 'INVALID_LIST_FORMAT'
          });
        }
      }
    }
  }

  /**
   * Validate rule actions
   */
  private static validateActions(
    actions: RuleAction[], 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    if (actions.length === 0) {
      errors.push({
        type: 'action',
        field: 'actions',
        message: 'At least one action is required',
        severity: 'error',
        code: 'NO_ACTIONS_DEFINED'
      });
      return;
    }

    if (actions.length > 10) {
      warnings.push({
        type: 'performance',
        field: 'actions',
        message: 'Large number of actions may impact performance',
        suggestion: 'Consider consolidating similar actions',
        code: 'TOO_MANY_ACTIONS'
      });
    }

    actions.forEach((action, index) => {
      this.validateAction(action, errors, warnings, `actions[${index}]`);
    });
  }

  /**
   * Validate individual action
   */
  private static validateAction(
    action: RuleAction,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    path: string
  ): void {
    // Action type validation
    const validActionTypes = ['flag_violation', 'log_issue', 'send_alert', 'reject_record', 'auto_correct', 'apply_transformation'];
    if (!validActionTypes.includes(action.type)) {
      errors.push({
        type: 'action',
        field: `${path}.type`,
        message: `Invalid action type. Must be one of: ${validActionTypes.join(', ')}`,
        severity: 'error',
        code: 'INVALID_ACTION_TYPE'
      });
    }

    // Parameters validation based on action type
    this.validateActionParams(action, errors, warnings, path);
  }

  /**
   * Validate action parameters
   */
  private static validateActionParams(
    action: RuleAction,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    path: string
  ): void {
    const { type, params } = action;

    if (!params) {
      errors.push({
        type: 'action',
        field: `${path}.params`,
        message: 'Action parameters are required',
        severity: 'error',
        code: 'ACTION_PARAMS_REQUIRED'
      });
      return;
    }

    switch (type) {
      case 'send_alert':
        if (!params.alertRecipients || params.alertRecipients.length === 0) {
          errors.push({
            type: 'action',
            field: `${path}.params.alertRecipients`,
            message: 'Alert recipients are required for send_alert action',
            severity: 'error',
            code: 'ALERT_RECIPIENTS_REQUIRED'
          });
        }
        break;

      case 'auto_correct':
      case 'apply_transformation':
        if (!params.targetField) {
          errors.push({
            type: 'action',
            field: `${path}.params.targetField`,
            message: 'Target field is required for transformation actions',
            severity: 'error',
            code: 'TARGET_FIELD_REQUIRED'
          });
        }
        if (!params.transformation) {
          errors.push({
            type: 'action',
            field: `${path}.params.transformation`,
            message: 'Transformation rule is required',
            severity: 'error',
            code: 'TRANSFORMATION_RULE_REQUIRED'
          });
        }
        break;
    }

    // Severity validation
    if (params.severity) {
      const validSeverities = ['error', 'warning', 'info'];
      if (!validSeverities.includes(params.severity)) {
        errors.push({
          type: 'action',
          field: `${path}.params.severity`,
          message: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`,
          severity: 'error',
          code: 'INVALID_SEVERITY'
        });
      }
    }
  }

  /**
   * Validate rule logic and cross-references
   */
  private static validateRuleLogic(
    rule: Partial<QualityRule>,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Check for conflicting actions
    if (rule.actions) {
      const hasReject = rule.actions.some(a => a.type === 'reject_record');
      const hasTransform = rule.actions.some(a => a.type === 'auto_correct' || a.type === 'apply_transformation');
      
      if (hasReject && hasTransform) {
        warnings.push({
          type: 'logic',
          field: 'actions',
          message: 'Reject and transformation actions may conflict',
          suggestion: 'Consider using separate rules for reject vs transform logic',
          code: 'CONFLICTING_ACTIONS'
        });
      }
    }

    // Validation rules should have flag_violation or log_issue actions
    if (rule.type === 'validation' && rule.actions) {
      const hasValidationAction = rule.actions.some(a => 
        a.type === 'flag_violation' || a.type === 'log_issue' || a.type === 'reject_record'
      );
      if (!hasValidationAction) {
        warnings.push({
          type: 'best_practice',
          field: 'actions',
          message: 'Validation rules should typically include flag_violation or log_issue actions',
          suggestion: 'Add appropriate validation actions',
          code: 'MISSING_VALIDATION_ACTION'
        });
      }
    }
  }

  /**
   * Validate for performance considerations
   */
  private static validatePerformance(
    rule: Partial<QualityRule>,
    warnings: ValidationWarning[]
  ): void {
    if (rule.conditions) {
      this.checkRegexPerformance(rule.conditions, warnings);
      this.checkComplexConditions(rule.conditions, warnings);
    }
  }

  /**
   * Check for potentially slow regex patterns
   */
  private static checkRegexPerformance(
    group: ConditionGroup,
    warnings: ValidationWarning[],
    path: string = 'conditions'
  ): void {
    group.conditions.forEach((condition, index) => {
      if ('conditions' in condition) {
        this.checkRegexPerformance(condition, warnings, `${path}.conditions[${index}]`);
      } else if (condition.operator === 'regex_match' && condition.value) {
        const regex = condition.value.toString();
        
        // Check for potentially catastrophic backtracking patterns
        const dangerousPatterns = [
          /\(\?\!\.\*\)/,  // Negative lookahead with .*
          /\(\.\*\)\+/,    // .* followed by +
          /\(\.\+\)\*/,    // .+ followed by *
        ];

        const hasComplexQuantifiers = /[\*\+\?]\{.*\}/.test(regex);
        const hasDangerousPattern = dangerousPatterns.some(pattern => pattern.test(regex));

        if (hasDangerousPattern || hasComplexQuantifiers) {
          warnings.push({
            type: 'performance',
            field: `${path}.conditions[${index}].value`,
            message: 'Complex regex pattern may cause performance issues',
            suggestion: 'Consider simplifying the regex or using alternative conditions',
            code: 'COMPLEX_REGEX_PATTERN'
          });
        }
      }
    });
  }

  /**
   * Check for overly complex condition structures
   */
  private static checkComplexConditions(
    group: ConditionGroup,
    warnings: ValidationWarning[],
    depth: number = 0
  ): void {
    if (depth > 3) {
      warnings.push({
        type: 'performance',
        field: 'conditions',
        message: 'Deep condition nesting may impact readability and performance',
        suggestion: 'Consider flattening the condition structure',
        code: 'DEEP_CONDITION_NESTING'
      });
    }

    if (group.conditions.length > 10) {
      warnings.push({
        type: 'performance',
        field: 'conditions',
        message: 'Large number of conditions in single group may impact performance',
        suggestion: 'Consider breaking into multiple groups or separate rules',
        code: 'LARGE_CONDITION_GROUP'
      });
    }
  }

  /**
   * Quick validation for syntax checking only
   */
  static validateSyntax(rule: Partial<QualityRule>): { isValid: boolean; errors: string[] } {
    const result = this.validateRule(rule);
    const syntaxErrors = result.errors.filter(e => e.severity === 'error');
    
    return {
      isValid: syntaxErrors.length === 0,
      errors: syntaxErrors.map(e => e.message)
    };
  }

  /**
   * Validate field names against available fields
   */
  static validateFieldReferences(rule: Partial<QualityRule>, availableFields: string[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (rule.conditions) {
      this.validateFieldsInConditionGroup(rule.conditions, availableFields, errors);
    }

    if (rule.actions) {
      rule.actions.forEach((action, index) => {
        if (action.params?.targetField && !availableFields.includes(action.params.targetField)) {
          errors.push({
            type: 'condition',
            field: `actions[${index}].params.targetField`,
            message: `Field '${action.params.targetField}' is not available in the data source`,
            severity: 'error',
            code: 'FIELD_NOT_FOUND'
          });
        }
      });
    }

    return errors;
  }

  /**
   * Validate field references in condition group
   */
  private static validateFieldsInConditionGroup(
    group: ConditionGroup,
    availableFields: string[],
    errors: ValidationError[],
    path: string = 'conditions'
  ): void {
    group.conditions.forEach((condition, index) => {
      if ('conditions' in condition) {
        this.validateFieldsInConditionGroup(condition, availableFields, errors, `${path}.conditions[${index}]`);
      } else {
        if (condition.field && !availableFields.includes(condition.field)) {
          errors.push({
            type: 'condition',
            field: `${path}.conditions[${index}].field`,
            message: `Field '${condition.field}' is not available in the data source`,
            severity: 'error',
            code: 'FIELD_NOT_FOUND'
          });
        }
      }
    });
  }
}