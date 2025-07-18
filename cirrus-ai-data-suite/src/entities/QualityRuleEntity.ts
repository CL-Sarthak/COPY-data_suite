import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
// import { RuleType, RuleStatus, RulePriority, ConditionGroup, RuleAction } from '@/types/qualityRules';
import type { RuleType, RuleStatus, RulePriority } from '@/types/qualityRules';
import type { ConditionGroup, RuleAction } from '@/types/qualityRules';

@Entity('quality_rules')
@Index(['status', 'type'])
@Index(['created_by'])
export class QualityRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category!: string;

  @Column({
    type: 'enum',
    enum: ['validation', 'transformation', 'alert'],
    default: 'validation'
  })
  type!: RuleType;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'draft'],
    default: 'draft'
  })
  status!: RuleStatus;

  @Column({
    type: 'enum',
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  })
  priority!: RulePriority;

  @Column({ type: 'jsonb' })
  conditions!: ConditionGroup;

  @Column({ type: 'jsonb' })
  actions!: RuleAction[];

  @Column({ type: 'jsonb', nullable: true })
  config!: {
    enabled: boolean;
    runOnUpload: boolean;
    runOnDemand: boolean;
    stopOnFailure: boolean;
    maxViolations?: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  tags!: string[];

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  created_by!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  updated_by!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
}