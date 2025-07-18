import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
// import type { Relation } from 'typeorm'; // Not needed with lazy loading
import { RemediationJobEntity } from './RemediationJobEntity';
import { RemediationHistoryEntity } from './RemediationHistoryEntity';
// Using lazy imports to avoid circular dependencies
import type { 
  RemediationActionType, 
  RemediationActionStatus, 
  RiskLevel, 
  FixMethod
} from '@/types/remediation';
import { 
  FixSuggestion,
  ValidationResult
} from '@/types/remediation';

@Entity('remediation_actions')
@Index(['jobId'])
@Index(['status'])
@Index(['recordId', 'fieldName'])
@Index(['confidence'], { where: 'confidence IS NOT NULL' })
@Index(['riskAssessment'])
@Index(['fixMethod'])
@Index(['createdAt'])
export class RemediationActionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_id', type: 'uuid' })
  @Index()
  jobId!: string;

  @Column({ name: 'violation_id', type: 'uuid', nullable: true })
  violationId?: string;

  @Column({ name: 'record_id', type: 'varchar', length: 255 })
  recordId!: string;

  @Column({ name: 'field_name', type: 'varchar', length: 255 })
  fieldName!: string;

  @Column({
    name: 'action_type',
    type: 'enum',
    enum: ['auto_fix', 'manual_fix', 'ignore', 'flag_for_review']
  })
  actionType!: RemediationActionType;

  @Column({
    name: 'fix_method',
    type: 'enum',
    enum: [
      // Data Cleaning
      'trim_whitespace', 'remove_special_chars', 'standardize_case', 'remove_extra_spaces', 'fix_encoding',
      // Format Standardization  
      'standardize_email', 'standardize_phone', 'standardize_date', 'standardize_address', 'standardize_currency',
      // Data Validation & Correction
      'fix_typos', 'validate_range', 'fill_missing_values', 'validate_format',
      // Business Logic Fixes
      'standardize_country_code', 'fix_zip_code', 'standardize_industry_code', 'normalize_name',
      // Statistical Fixes
      'detect_fix_outliers', 'impute_missing_numerical', 'smooth_time_series',
      // Custom
      'custom_transformation'
    ]
  })
  fixMethod!: FixMethod;

  @Column({ name: 'original_value', type: 'text', nullable: true })
  originalValue?: string;

  @Column({ name: 'suggested_value', type: 'text', nullable: true })
  suggestedValue?: string;

  @Column({ name: 'applied_value', type: 'text', nullable: true })
  appliedValue?: string;

  @Column({ 
    name: 'confidence', 
    type: 'decimal', 
    precision: 4, 
    scale: 3,
    nullable: true
  })
  confidence?: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['pending', 'applied', 'rejected', 'requires_review', 'skipped'],
    default: 'pending'
  })
  status!: RemediationActionStatus;

  @Column({
    name: 'risk_assessment',
    type: 'enum',
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  })
  riskAssessment!: RiskLevel;

  @Column({ name: 'reviewed_by', type: 'varchar', length: 255, nullable: true })
  reviewedBy?: string;

  @Column({ name: 'reviewed_at', type: 'timestamp with time zone', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'rollback_data', type: 'jsonb', nullable: true })
  rollbackData?: {
    originalValue: unknown;
    previousState?: unknown;
    backupLocation?: string;
  };

  @Column({ name: 'metadata', type: 'jsonb', default: '{}' })
  metadata!: {
    reasoning?: string;
    alternativeSuggestions?: FixSuggestion[];
    validationResults?: ValidationResult;
    executionTime?: number;
    dependencies?: string[];
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ name: 'applied_at', type: 'timestamp with time zone', nullable: true })
  appliedAt?: Date;

  @Column({ name: 'rolled_back_at', type: 'timestamp with time zone', nullable: true })
  rolledBackAt?: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  // Relations with lazy loading to avoid Vercel issues
  @ManyToOne(() => RemediationJobEntity, job => job.actions, { onDelete: 'CASCADE', lazy: true })
  @JoinColumn({ name: 'job_id' })
  job?: Promise<RemediationJobEntity>;

  @OneToMany(() => RemediationHistoryEntity, history => history.action, { lazy: true })
  history?: Promise<RemediationHistoryEntity[]>;

  // Helper methods
  canBeApplied(): boolean {
    return ['pending', 'requires_review'].includes(this.status);
  }

  canBeRolledBack(): boolean {
    return this.status === 'applied' && !!this.appliedAt && !!this.rollbackData;
  }

  isHighConfidence(): boolean {
    return (this.confidence || 0) >= 0.9;
  }

  isMediumConfidence(): boolean {
    const conf = this.confidence || 0;
    return conf >= 0.7 && conf < 0.9;
  }

  isLowConfidence(): boolean {
    return (this.confidence || 0) < 0.7;
  }

  isHighRisk(): boolean {
    return this.riskAssessment === 'high';
  }

  getExecutionTimeMs(): number {
    return this.metadata?.executionTime || 0;
  }

  hasAlternatives(): boolean {
    return (this.metadata?.alternativeSuggestions?.length || 0) > 0;
  }

  getDependencies(): string[] {
    return this.metadata?.dependencies || [];
  }

  getTags(): string[] {
    return this.metadata?.tags || [];
  }

  getValueChangeDescription(): string {
    if (!this.originalValue && !this.suggestedValue) return 'No change';
    if (!this.originalValue) return `Add: "${this.suggestedValue}"`;
    if (!this.suggestedValue) return `Remove: "${this.originalValue}"`;
    return `Change: "${this.originalValue}" → "${this.suggestedValue}"`;
  }

  shouldAutoApply(threshold: number = 0.9): boolean {
    return this.isHighConfidence() && 
           this.confidence! >= threshold && 
           this.riskAssessment !== 'high' && 
           this.canBeApplied();
  }

  shouldRequireReview(threshold: number = 0.7): boolean {
    const conf = this.confidence || 0;
    return (conf >= threshold && conf < 0.9) || 
           this.riskAssessment === 'high' || 
           this.hasAlternatives();
  }
}