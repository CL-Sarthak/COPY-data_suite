// Data Quality Remediation System Types

export type RemediationJobStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'paused';
export type RemediationActionType = 'auto_fix' | 'manual_fix' | 'ignore' | 'flag_for_review';
export type RemediationActionStatus = 'pending' | 'applied' | 'rejected' | 'requires_review' | 'skipped';
export type RiskLevel = 'low' | 'medium' | 'high';
export type Complexity = 'low' | 'medium' | 'high';
export type FixMethod = 
  // Data Cleaning
  | 'trim_whitespace' | 'remove_special_chars' | 'standardize_case' | 'remove_extra_spaces' | 'fix_encoding' | 'clean_text_combo'
  // Format Standardization  
  | 'standardize_email' | 'standardize_phone' | 'standardize_date' | 'standardize_address' | 'standardize_currency'
  // Data Validation & Correction
  | 'fix_typos' | 'validate_range' | 'fill_missing_values' | 'validate_format'
  // Business Logic Fixes
  | 'standardize_country_code' | 'fix_zip_code' | 'standardize_industry_code' | 'normalize_name'
  // Statistical Fixes
  | 'detect_fix_outliers' | 'impute_missing_numerical' | 'smooth_time_series'
  // Custom
  | 'custom_transformation';

export interface RemediationJob {
  id: string;
  dataSourceId: string;
  ruleExecutionId?: string;
  name: string;
  description?: string;
  status: RemediationJobStatus;
  totalViolations: number;
  fixedViolations: number;
  manualReviewRequired: number;
  autoFixedCount: number;
  rejectedCount: number;
  skippedCount: number;
  estimatedTimeMinutes?: number;
  actualTimeMinutes?: number;
  complexity: Complexity;
  riskLevel: RiskLevel;
  metadata: {
    triggerSource?: 'manual' | 'rule_execution' | 'scheduled' | 'api';
    priority?: 'urgent' | 'high' | 'normal' | 'low';
    tags?: string[];
    configuration?: {
      autoApplyThreshold?: number; // Confidence threshold for auto-apply
      requireReviewThreshold?: number; // Confidence threshold for manual review
      maxRiskLevel?: RiskLevel; // Maximum risk level to allow auto-fixing
      allowDestructiveChanges?: boolean;
    };
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  pausedAt?: Date;
  createdBy: string;
  assignedTo?: string;
}

export interface RemediationAction {
  id: string;
  jobId: string;
  violationId?: string;
  recordId: string;
  fieldName: string;
  actionType: RemediationActionType;
  fixMethod: FixMethod;
  originalValue: unknown;
  suggestedValue: unknown;
  appliedValue?: unknown;
  confidence: number; // 0-1 confidence score
  status: RemediationActionStatus;
  riskAssessment: RiskLevel;
  reviewedBy?: string;
  reviewedAt?: Date;
  rollbackData?: {
    originalValue: unknown;
    previousState?: unknown;
    backupLocation?: string;
  };
  metadata: {
    reasoning?: string;
    alternativeSuggestions?: FixSuggestion[];
    validationResults?: ValidationResult;
    executionTime?: number; // milliseconds
    dependencies?: string[]; // IDs of other actions this depends on
    tags?: string[];
    rejectionReason?: string;
    fieldContext?: {
      fieldName?: string;
      fieldType?: string;
      recordId?: string;
    };
    fixResult?: unknown;
    confidenceFactors?: unknown;
    recommendation?: unknown;
    errorMessage?: string;
  };
  createdAt: Date;
  appliedAt?: Date;
  rolledBackAt?: Date;
}

export interface FixTemplate {
  id: string;
  name: string;
  description?: string;
  category: FixTemplateCategory;
  fixMethod: FixMethod;
  parameters?: Record<string, TemplateParameter>;
  confidenceThreshold: number;
  applicableFieldTypes?: string[]; // e.g., ['string', 'email', 'phone']
  usageCount?: number;
  successRate?: number;
  createdBy?: string;
  isSystemTemplate?: boolean;
  clonedFrom?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FixSuggestion {
  method: FixMethod;
  confidence: number;
  expectedResult: unknown;
  reasoning: string;
  riskLevel: RiskLevel;
  prerequisites?: string[];
  alternatives: FixSuggestion[];
  metadata?: {
    estimatedTime?: number;
    reversible?: boolean;
    dataLoss?: boolean;
  };
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues?: string[];
  suggestions?: string[];
}

export interface RemediationHistory {
  id: string;
  actionId: string;
  eventType: 'created' | 'started' | 'completed' | 'failed' | 'paused' | 'resumed' | 'cancelled' | 'reviewed' | 'approved' | 'rejected' | 'rolled_back';
  oldStatus?: RemediationActionStatus;
  newStatus?: RemediationActionStatus;
  oldValue?: unknown;
  newValue?: unknown;
  performedBy: string;
  reason?: string;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    source?: 'ui' | 'api' | 'system';
    batchId?: string;
  };
  createdAt: Date;
}

// Request/Response Types

export interface CreateRemediationJobRequest {
  dataSourceId: string;
  ruleExecutionId?: string;
  name: string;
  description?: string;
  configuration?: RemediationJob['metadata']['configuration'];
  violations?: ViolationReference[];
}

export interface ViolationReference {
  id: string;
  recordId: string;
  fieldName: string;
  violationType: string;
  originalValue: unknown;
  ruleId?: string;
}

export interface RemediationJobResponse extends RemediationJob {
  actions?: RemediationAction[];
  progress?: {
    percentage: number;
    currentAction?: string;
    estimatedTimeRemaining?: number;
  };
}

export interface StartRemediationRequest {
  jobId: string;
  configuration?: {
    autoApplyHighConfidence?: boolean;
    skipLowConfidence?: boolean;
    pauseOnErrors?: boolean;
  };
}

export interface BulkActionUpdateRequest {
  actionIds: string[];
  operation: 'approve' | 'reject' | 'skip' | 'retry';
  reason?: string;
  metadata?: {
    batchId?: string;
    source?: string;
  };
}

export interface AnalyzeViolationsRequest {
  jobId: string;
  violationIds?: string[];
  options?: {
    includeAlternatives?: boolean;
    maxSuggestions?: number;
    riskThreshold?: RiskLevel;
  };
}

export interface AnalyzeViolationsResponse {
  jobId: string;
  totalViolations: number;
  analyzedCount: number;
  suggestions: Array<{
    violationId: string;
    recordId: string;
    fieldName: string;
    suggestions: FixSuggestion[];
    recommendedAction: RemediationActionType;
  }>;
  summary: {
    autoFixableCount: number;
    requiresReviewCount: number;
    lowConfidenceCount: number;
    averageConfidence: number;
  };
}

export interface ExecuteFixesRequest {
  jobId: string;
  actionIds?: string[]; // If not provided, executes all approved actions
  options?: {
    dryRun?: boolean;
    pauseOnError?: boolean;
    maxConcurrent?: number;
  };
}

export interface ExecuteFixesResponse {
  jobId: string;
  executionId: string;
  totalActions: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  results: Array<{
    actionId: string;
    status: 'success' | 'error' | 'skipped';
    appliedValue?: unknown;
    error?: string;
    executionTime?: number;
  }>;
}

export interface RemediationAnalytics {
  period: {
    startDate: Date;
    endDate: Date;
  };
  jobSummary: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageCompletionTime: number;
  };
  actionSummary: {
    totalActions: number;
    autoFixedActions: number;
    manuallyReviewedActions: number;
    rejectedActions: number;
    averageConfidence: number;
  };
  qualityImprovement: {
    violationsFixed: number;
    qualityScoreImprovement: number;
    timeSaved: number; // in hours
  };
  topFixMethods: Array<{
    method: FixMethod;
    usageCount: number;
    successRate: number;
    averageConfidence: number;
  }>;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
}

// Filter and Sort Types

export type RemediationJobSort = 'created_at' | 'updated_at' | 'name' | 'status' | 'priority' | 'progress';
export type RemediationActionSort = 'created_at' | 'confidence' | 'risk_level' | 'status' | 'field_name';

export interface RemediationJobFilters {
  status?: RemediationJobStatus[];
  dataSourceId?: string[];
  createdBy?: string[];
  riskLevel?: RiskLevel[];
  complexity?: Complexity[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  tags?: string[];
}

export interface RemediationActionFilters {
  status?: RemediationActionStatus[];
  actionType?: RemediationActionType[];
  fixMethod?: FixMethod[];
  riskLevel?: RiskLevel[];
  confidenceRange?: {
    min: number;
    max: number;
  };
  fieldName?: string[];
  reviewedBy?: string[];
}

// UI Component Props Types

export interface RemediationDashboardProps {
  dataSourceId?: string;
  initialFilters?: RemediationJobFilters;
}

export interface ViolationReviewProps {
  jobId: string;
  violations: Array<{
    id: string;
    recordId: string;
    fieldName: string;
    originalValue: unknown;
    suggestions: FixSuggestion[];
  }>;
  onActionUpdate: (actionId: string, status: RemediationActionStatus) => void;
  onBulkUpdate: (actionIds: string[], operation: string) => void;
}

export interface ProgressTrackingProps {
  jobId: string;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  realTimeUpdates?: boolean;
}

export interface ManualCorrectionProps {
  actionId: string;
  originalValue: unknown;
  suggestedValue: unknown;
  fieldName: string;
  fieldType: string;
  onSave: (correctedValue: unknown) => void;
  onCancel: () => void;
  validationRules?: unknown[];
}

// Bulk Action Types
export interface BulkActionRequest {
  actionIds: string[];
  performedBy: string;
  reason?: string;
  batchId?: string;
}

export interface BulkActionResult {
  batchId: string;
  totalRequested: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    actionId: string;
    success: boolean;
    error?: string;
  }>;
  message: string;
}

// Rollback Types
export interface ActionRollbackRequest {
  performedBy: string;
  reason?: string;
}

export interface ActionRollbackResult {
  actionId: string;
  success: boolean;
  previousValue?: unknown;
  restoredValue?: unknown;
  message: string;
}

// Status Update Types
export interface ActionStatusUpdate {
  status: RemediationActionStatus;
  reason?: string;
  performedBy: string;
  metadata?: Record<string, unknown>;
}

// Advanced Filter Types
export interface ActionFilter {
  jobId?: string;
  status?: RemediationActionStatus | RemediationActionStatus[];
  fixMethod?: FixMethod | FixMethod[];
  confidenceRange?: {
    min: number;
    max: number;
  };
  riskLevel?: RiskLevel | RiskLevel[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  limit?: number;
  offset?: number;
}

// Fix Template Types (using the interface defined above)

export type FixTemplateCategory = 
  | 'data_cleaning' 
  | 'format_standardization' 
  | 'data_validation' 
  | 'business_logic'
  | 'custom';

export interface TemplateParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  default?: unknown;
  required: boolean;
  enum?: string[];
  min?: number;
  max?: number;
  description?: string;
}

export interface CreateFixTemplateRequest {
  name: string;
  description: string;
  category: FixTemplateCategory;
  fixMethod: FixMethod;
  parameters?: Record<string, TemplateParameter>;
  applicableFieldTypes?: string[];
  confidenceThreshold?: number;
  createdBy: string;
}

export interface UpdateFixTemplateRequest {
  name?: string;
  description?: string;
  category?: FixTemplateCategory;
  fixMethod?: FixMethod;
  parameters?: Record<string, TemplateParameter>;
  applicableFieldTypes?: string[];
  confidenceThreshold?: number;
}

export interface TemplateValidation {
  isValid: boolean;
  errors: string[];
}