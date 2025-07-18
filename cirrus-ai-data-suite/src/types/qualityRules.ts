/**
 * Data Quality Rules Engine - Type Definitions
 * Defines the structure for quality rules, conditions, actions, and executions
 */

// Rule Types
export type RuleType = 'validation' | 'transformation' | 'alert';
export type RuleStatus = 'active' | 'inactive' | 'draft';
export type RulePriority = 'critical' | 'high' | 'medium' | 'low';

// Condition Types
export type ConditionOperator = 
  | 'equals' 
  | 'not_equals'
  | 'contains' 
  | 'not_contains'
  | 'starts_with' 
  | 'ends_with'
  | 'regex_match'
  | 'greater_than' 
  | 'less_than'
  | 'greater_or_equal' 
  | 'less_or_equal'
  | 'between'
  | 'in_list'
  | 'not_in_list'
  | 'is_null'
  | 'is_not_null'
  | 'is_empty'
  | 'is_not_empty'
  | 'date_before'
  | 'date_after'
  | 'date_between';

export type LogicalOperator = 'AND' | 'OR';

// Rule Condition
export interface RuleCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value?: unknown;
  values?: unknown[]; // For operators like 'between', 'in_list'
  caseSensitive?: boolean;
  dataType?: 'string' | 'number' | 'date' | 'boolean';
}

// Condition Group (for complex logic)
export interface ConditionGroup {
  id: string;
  operator: LogicalOperator;
  conditions: (RuleCondition | ConditionGroup)[];
}

// Rule Action
export type ActionType = 
  | 'flag_violation'
  | 'auto_correct'
  | 'reject_record'
  | 'send_alert'
  | 'log_issue'
  | 'apply_transformation';

export interface RuleAction {
  id: string;
  type: ActionType;
  params?: {
    severity?: 'error' | 'warning' | 'info';
    message?: string;
    transformation?: string;
    targetField?: string;
    alertRecipients?: string[];
  };
}

// Main Rule Definition
export interface QualityRule {
  id: string;
  name: string;
  description: string;
  category?: string; // e.g., 'Format', 'Business Logic', 'Compliance'
  type: RuleType;
  status: RuleStatus;
  priority: RulePriority;
  conditions: ConditionGroup;
  actions: RuleAction[];
  metadata?: {
    createdBy: string;
    createdAt: string;
    updatedBy?: string;
    updatedAt?: string;
    version: number;
    tags?: string[];
  };
  config?: {
    enabled: boolean;
    runOnUpload: boolean;
    runOnDemand: boolean;
    stopOnFailure: boolean;
    maxViolations?: number; // Stop after N violations
  };
}

// Rule Set (collection of rules)
export interface RuleSet {
  id: string;
  name: string;
  description: string;
  rules: string[]; // Rule IDs
  metadata?: {
    createdBy: string;
    createdAt: string;
    industry?: string; // e.g., 'healthcare', 'finance'
    compliance?: string[]; // e.g., ['HIPAA', 'GDPR']
  };
}

// Rule Execution
export interface RuleExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  dataSourceId: string;
  dataSourceName: string;
  executionTime: string;
  duration: number; // milliseconds
  status: 'success' | 'failed' | 'partial';
  summary: {
    recordsProcessed: number;
    recordsPassed: number;
    recordsFailed: number;
    violationsFound: number;
    actionsExecuted: number;
  };
  violations?: RuleViolation[];
  error?: string;
}

// Rule Violation
export interface RuleViolation {
  id: string;
  recordId: string | number;
  field: string;
  value: unknown;
  condition: string; // Human-readable condition
  message: string;
  severity: 'error' | 'warning' | 'info';
  lineNumber?: number;
  suggestion?: string;
}

// Rule Template
export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  rule: Partial<QualityRule>; // Pre-configured rule
  variables?: {
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'list';
    default?: unknown;
    required: boolean;
    description: string;
  }[];
}

// Rule Suggestion (AI-powered)
export interface RuleSuggestion {
  id: string;
  field: string;
  suggestedRule: Partial<QualityRule>;
  confidence: number; // 0-1
  reasoning: string;
  examples: {
    valid: unknown[];
    invalid: unknown[];
  };
  basedOn: {
    patterns?: string[];
    statistics?: {
      nullRate?: number;
      uniqueRate?: number;
      formatVariation?: number;
    };
  };
}

// Rule Analytics
export interface RuleAnalytics {
  ruleId: string;
  period: {
    start: string;
    end: string;
  };
  metrics: {
    executionCount: number;
    avgExecutionTime: number;
    totalViolations: number;
    violationRate: number; // violations per record
    falsePositiveRate?: number;
    effectiveness: number; // 0-1 score
  };
  trends: {
    date: string;
    violations: number;
    executionTime: number;
  }[];
  topViolations: {
    value: unknown;
    count: number;
    percentage: number;
  }[];
}

// API Request/Response Types
export interface CreateRuleRequest {
  rule: Omit<QualityRule, 'id' | 'metadata'>;
}

export interface UpdateRuleRequest {
  rule: Partial<Omit<QualityRule, 'id' | 'metadata'>>;
}

export interface TestRuleRequest {
  rule: Partial<QualityRule>;
  sampleData?: Record<string, unknown>[];
  sampleSize?: number;
  dataSourceId?: string;
}

export interface TestRuleResponse {
  success: boolean;
  results: {
    passed: number;
    failed: number;
    violations: RuleViolation[];
    executionTime: number;
  };
  sampleViolations: RuleViolation[]; // First 10 violations
}

export interface ExecuteRuleRequest {
  ruleId: string;
  dataSourceId: string;
  options?: {
    dryRun?: boolean;
    limit?: number;
    offset?: number;
  };
}

export interface RuleSuggestionRequest {
  dataSourceId: string;
  fields?: string[]; // Specific fields to analyze
  options?: {
    maxSuggestions?: number;
    minConfidence?: number;
    categories?: string[];
  };
}

// Helper type for rule builder UI
export interface RuleBuilderState {
  rule: Partial<QualityRule>;
  isDirty: boolean;
  isValid: boolean;
  errors: {
    field: string;
    message: string;
  }[];
  testResults?: TestRuleResponse;
}