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
import { RemediationActionEntity } from './RemediationActionEntity';
import { DataSourceEntity } from './DataSourceEntity';
// Using lazy import to avoid circular dependency
import type { RemediationJobStatus, Complexity, RiskLevel } from '@/types/remediation';

@Entity('remediation_jobs')
@Index(['dataSourceId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['riskLevel'])
@Index(['complexity'])
export class RemediationJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'data_source_id', type: 'uuid' })
  @Index()
  dataSourceId!: string;

  @Column({ name: 'rule_execution_id', type: 'uuid', nullable: true })
  ruleExecutionId?: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled', 'paused'],
    default: 'pending'
  })
  status!: RemediationJobStatus;

  @Column({ name: 'total_violations', type: 'integer', default: 0 })
  totalViolations!: number;

  @Column({ name: 'fixed_violations', type: 'integer', default: 0 })
  fixedViolations!: number;

  @Column({ name: 'manual_review_required', type: 'integer', default: 0 })
  manualReviewRequired!: number;

  @Column({ name: 'auto_fixed_count', type: 'integer', default: 0 })
  autoFixedCount!: number;

  @Column({ name: 'rejected_count', type: 'integer', default: 0 })
  rejectedCount!: number;

  @Column({ name: 'skipped_count', type: 'integer', default: 0 })
  skippedCount!: number;

  @Column({ name: 'estimated_time_minutes', type: 'integer', nullable: true })
  estimatedTimeMinutes?: number;

  @Column({ name: 'actual_time_minutes', type: 'integer', nullable: true })
  actualTimeMinutes?: number;

  @Column({
    name: 'complexity',
    type: 'enum',
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  })
  complexity!: Complexity;

  @Column({
    name: 'risk_level',
    type: 'enum',
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  })
  riskLevel!: RiskLevel;

  @Column({ name: 'metadata', type: 'jsonb', default: '{}' })
  metadata!: {
    triggerSource?: 'manual' | 'rule_execution' | 'scheduled' | 'api';
    priority?: 'urgent' | 'high' | 'normal' | 'low';
    tags?: string[];
    configuration?: {
      autoApplyThreshold?: number;
      requireReviewThreshold?: number;
      maxRiskLevel?: RiskLevel;
      allowDestructiveChanges?: boolean;
    };
  };

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ name: 'started_at', type: 'timestamp with time zone', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamp with time zone', nullable: true })
  completedAt?: Date;

  @Column({ name: 'paused_at', type: 'timestamp with time zone', nullable: true })
  pausedAt?: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 255 })
  createdBy!: string;

  @Column({ name: 'assigned_to', type: 'varchar', length: 255, nullable: true })
  assignedTo?: string;

  // Relations
  @ManyToOne(() => DataSourceEntity)
  @JoinColumn({ name: 'data_source_id' })
  dataSource?: DataSourceEntity;

  @OneToMany(() => RemediationActionEntity, action => action.job, { lazy: true })
  actions?: Promise<RemediationActionEntity[]>;

  // Helper methods
  getProgressPercentage(): number {
    if (this.totalViolations === 0) return 0;
    const processed = this.fixedViolations + this.rejectedCount + this.skippedCount;
    return Math.round((processed / this.totalViolations) * 100);
  }

  isActive(): boolean {
    return ['pending', 'in_progress', 'paused'].includes(this.status);
  }

  isComplete(): boolean {
    return ['completed', 'failed', 'cancelled'].includes(this.status);
  }

  getActualDurationMinutes(): number | null {
    if (!this.startedAt) return null;
    const endTime = this.completedAt || new Date();
    return Math.round((endTime.getTime() - this.startedAt.getTime()) / (1000 * 60));
  }

  getTotalProcessedCount(): number {
    return this.fixedViolations + this.rejectedCount + this.skippedCount;
  }

  getRemainingCount(): number {
    return this.totalViolations - this.getTotalProcessedCount();
  }
}