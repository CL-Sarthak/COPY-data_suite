import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export type TemplateType = 'remediation' | 'normalization' | 'global';
export type TemplateCategory = 'data_cleaning' | 'format_standardization' | 'statistical_normalization' | 
  'validation' | 'enrichment' | 'custom';
export type RiskLevel = 'low' | 'medium' | 'high';

@Entity('data_quality_templates')
@Index(['templateType', 'category'])
@Index(['isActive', 'isSystemTemplate'])
@Index(['name'], { unique: true })
export class DataQualityTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 255, unique: true })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({
    name: 'template_type',
    type: 'enum',
    enum: ['remediation', 'normalization', 'global']
  })
  templateType!: TemplateType;

  @Column({
    name: 'category',
    type: 'enum',
    enum: ['data_cleaning', 'format_standardization', 'statistical_normalization', 
           'validation', 'enrichment', 'custom']
  })
  category!: TemplateCategory;

  @Column({ name: 'method_name', type: 'varchar', length: 100 })
  methodName!: string;

  @Column({ name: 'parameters', type: 'jsonb', default: '{}' })
  parameters!: Record<string, unknown>;

  @Column({ name: 'configuration', type: 'jsonb', default: '{}' })
  configuration!: {
    // For normalization templates
    normalizationType?: 'z-score' | 'min-max' | 'robust' | 'decimal-scaling' | 'log' | 'custom';
    scaleRange?: [number, number];
    handleOutliers?: boolean;
    outlierMethod?: 'iqr' | 'z-score' | 'isolation-forest';
    
    // For remediation templates
    validationRules?: Record<string, unknown>[];
    transformationSteps?: Record<string, unknown>[];
    
    // Common
    previewEnabled?: boolean;
    batchSize?: number;
    [key: string]: unknown;
  };

  @Column({ name: 'applicable_data_types', type: 'simple-array', nullable: true })
  applicableDataTypes?: string[]; // numeric, string, date, boolean, etc.

  @Column({ name: 'applicable_field_patterns', type: 'simple-array', nullable: true })
  applicableFieldPatterns?: string[]; // email, phone, address, etc.

  @Column({ 
    name: 'confidence_threshold', 
    type: 'decimal', 
    precision: 4, 
    scale: 3,
    default: 0.8
  })
  confidenceThreshold!: number;

  @Column({
    name: 'risk_level',
    type: 'enum',
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  })
  riskLevel!: RiskLevel;

  @Column({ name: 'usage_recommendations', type: 'text', nullable: true })
  usageRecommendations?: string;

  @Column({ name: 'example_before', type: 'jsonb', nullable: true })
  exampleBefore?: Record<string, unknown>;

  @Column({ name: 'example_after', type: 'jsonb', nullable: true })
  exampleAfter?: Record<string, unknown>;

  // Usage Statistics
  @Column({ name: 'usage_count', type: 'integer', default: 0 })
  usageCount!: number;

  @Column({ 
    name: 'success_rate', 
    type: 'decimal', 
    precision: 4, 
    scale: 3,
    nullable: true
  })
  successRate?: number;

  @Column({ name: 'avg_processing_time_ms', type: 'integer', nullable: true })
  avgProcessingTimeMs?: number;

  @Column({ name: 'last_used_at', type: 'timestamp with time zone', nullable: true })
  lastUsedAt?: Date;

  // Template Management
  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive!: boolean;

  @Column({ name: 'is_system_template', type: 'boolean', default: false })
  @Index()
  isSystemTemplate!: boolean;

  @Column({ name: 'is_custom', type: 'boolean', default: false })
  isCustom!: boolean;

  @Column({ name: 'tags', type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ name: 'version', type: 'integer', default: 1 })
  version!: number;

  @Column({ name: 'parent_template_id', type: 'uuid', nullable: true })
  parentTemplateId?: string;

  // Audit Fields
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 255 })
  createdBy!: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 255, nullable: true })
  updatedBy?: string;

  // Helper methods
  isApplicableToField(fieldType: string, fieldPattern?: string): boolean {
    // Check data type compatibility
    if (this.applicableDataTypes && this.applicableDataTypes.length > 0) {
      if (!this.applicableDataTypes.includes(fieldType) && !this.applicableDataTypes.includes('*')) {
        return false;
      }
    }

    // Check field pattern compatibility
    if (fieldPattern && this.applicableFieldPatterns && this.applicableFieldPatterns.length > 0) {
      if (!this.applicableFieldPatterns.includes(fieldPattern) && !this.applicableFieldPatterns.includes('*')) {
        return false;
      }
    }

    return true;
  }

  incrementUsage(): void {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
  }

  updateSuccessRate(successful: boolean): void {
    if (this.usageCount === 0) {
      this.successRate = successful ? 1.0 : 0.0;
      return;
    }

    const currentSuccessCount = Math.round((this.successRate || 0) * (this.usageCount - 1));
    const newSuccessCount = successful ? currentSuccessCount + 1 : currentSuccessCount;
    this.successRate = newSuccessCount / this.usageCount;
  }

  updateProcessingTime(timeMs: number): void {
    if (!this.avgProcessingTimeMs) {
      this.avgProcessingTimeMs = timeMs;
      return;
    }

    // Calculate rolling average
    const weight = Math.min(this.usageCount, 100); // Cap at 100 for stable average
    this.avgProcessingTimeMs = Math.round(
      (this.avgProcessingTimeMs * (weight - 1) + timeMs) / weight
    );
  }

  getEffectivenessScore(): number {
    if (!this.successRate || this.usageCount === 0) return 0;
    
    // Combine success rate with usage count (popular templates get slight boost)
    const usageBonus = Math.min(this.usageCount / 100, 0.1); // Max 10% bonus
    return Math.min(this.successRate + usageBonus, 1.0);
  }

  getRecommendationLevel(): 'highly_recommended' | 'recommended' | 'use_with_caution' | 'not_recommended' {
    const score = this.getEffectivenessScore();
    const usage = this.usageCount;

    if (score >= 0.9 && usage >= 10) return 'highly_recommended';
    if (score >= 0.75 && usage >= 5) return 'recommended';
    if (score >= 0.6 || usage < 5) return 'use_with_caution';
    return 'not_recommended';
  }

  clone(newName: string, createdBy: string): Partial<DataQualityTemplateEntity> {
    return {
      name: newName,
      description: this.description,
      templateType: this.templateType,
      category: this.category,
      methodName: this.methodName,
      parameters: { ...this.parameters },
      configuration: { ...this.configuration },
      applicableDataTypes: this.applicableDataTypes ? [...this.applicableDataTypes] : undefined,
      applicableFieldPatterns: this.applicableFieldPatterns ? [...this.applicableFieldPatterns] : undefined,
      confidenceThreshold: this.confidenceThreshold,
      riskLevel: this.riskLevel,
      usageRecommendations: this.usageRecommendations,
      exampleBefore: this.exampleBefore,
      exampleAfter: this.exampleAfter,
      tags: this.tags ? [...this.tags] : undefined,
      parentTemplateId: this.id,
      createdBy,
      isActive: true,
      isCustom: true,
      isSystemTemplate: false,
      usageCount: 0,
      successRate: undefined,
      avgProcessingTimeMs: undefined,
      lastUsedAt: undefined,
      version: 1
    };
  }
}