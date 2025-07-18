import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';
// import { FixMethod, RiskLevel } from '@/types/remediation';
import type { FixMethod, RiskLevel } from '@/types/remediation';

@Entity('fix_templates')
@Index(['category'])
@Index(['fixMethod'])
@Index(['isActive'])
@Index(['successRate'], { where: 'success_rate IS NOT NULL' })
@Index(['usageCount'])
@Index(['name'], { unique: true })
export class FixTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 255, unique: true })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'category', type: 'varchar', length: 100 })
  @Index()
  category!: string;

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

  @Column({ name: 'parameters', type: 'jsonb', default: '{}' })
  parameters!: Record<string, unknown>;

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

  @Column({ name: 'applicable_field_types', type: 'simple-array', nullable: true })
  applicableFieldTypes?: string[];

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

  @Column({ name: 'last_used_at', type: 'timestamp with time zone', nullable: true })
  lastUsedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 255 })
  createdBy!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive!: boolean;

  @Column({ name: 'tags', type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ name: 'is_system_template', type: 'boolean', default: false })
  isSystemTemplate!: boolean;

  @Column({ name: 'cloned_from', type: 'varchar', length: 36, nullable: true })
  clonedFrom?: string;

  // Helper methods
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

  isApplicableToField(fieldType: string): boolean {
    if (!this.applicableFieldTypes || this.applicableFieldTypes.length === 0) {
      return true; // Template applies to all field types
    }
    return this.applicableFieldTypes.includes(fieldType) || this.applicableFieldTypes.includes('*');
  }

  getEffectivenessScore(): number {
    if (!this.successRate || this.usageCount === 0) return 0;
    
    // Combine success rate with usage count (popular templates get slight boost)
    const usageBonus = Math.min(this.usageCount / 100, 0.1); // Max 10% bonus
    return Math.min(this.successRate + usageBonus, 1.0);
  }

  isHighPerforming(): boolean {
    return this.getEffectivenessScore() >= 0.85 && this.usageCount >= 5;
  }

  isUnderPerforming(): boolean {
    return this.getEffectivenessScore() < 0.6 && this.usageCount >= 10;
  }

  getRecommendationLevel(): 'highly_recommended' | 'recommended' | 'caution' | 'not_recommended' {
    const score = this.getEffectivenessScore();
    const usage = this.usageCount;

    if (score >= 0.9 && usage >= 10) return 'highly_recommended';
    if (score >= 0.75 && usage >= 5) return 'recommended';
    if (score >= 0.6 || usage < 5) return 'caution';
    return 'not_recommended';
  }

  clone(newName: string, createdBy: string): Partial<FixTemplateEntity> {
    return {
      name: newName,
      description: this.description,
      category: this.category,
      fixMethod: this.fixMethod,
      parameters: { ...this.parameters },
      confidenceThreshold: this.confidenceThreshold,
      riskLevel: this.riskLevel,
      applicableFieldTypes: this.applicableFieldTypes ? [...this.applicableFieldTypes] : undefined,
      tags: this.tags ? [...this.tags] : undefined,
      createdBy,
      isActive: true,
      usageCount: 0,
      successRate: undefined,
      lastUsedAt: undefined
    };
  }
}