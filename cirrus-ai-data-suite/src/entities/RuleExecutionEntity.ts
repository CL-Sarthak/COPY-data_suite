import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { QualityRuleEntity } from './QualityRuleEntity';
import { DataSourceEntity } from './DataSourceEntity';
import { RuleViolation } from '@/types/qualityRules';

@Entity('rule_executions')
@Index(['rule_id', 'execution_time'])
@Index(['data_source_id', 'execution_time'])
@Index(['status'])
export class RuleExecutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  rule_id!: string;

  @Column({ type: 'varchar', length: 255 })
  rule_name!: string;

  @Column({ type: 'uuid' })
  data_source_id!: string;

  @Column({ type: 'varchar', length: 255 })
  data_source_name!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  execution_time!: Date;

  @Column({ type: 'int' })
  duration_ms!: number;

  @Column({
    type: 'enum',
    enum: ['success', 'failed', 'partial'],
    default: 'success'
  })
  status!: 'success' | 'failed' | 'partial';

  @Column({ type: 'int', default: 0 })
  records_processed!: number;

  @Column({ type: 'int', default: 0 })
  records_passed!: number;

  @Column({ type: 'int', default: 0 })
  records_failed!: number;

  @Column({ type: 'int', default: 0 })
  violations_found!: number;

  @Column({ type: 'int', default: 0 })
  actions_executed!: number;

  @Column({ type: 'jsonb', nullable: true })
  violations!: RuleViolation[];

  @Column({ type: 'text', nullable: true })
  error_message!: string;

  @Column({ type: 'jsonb', nullable: true })
  execution_metadata!: {
    dry_run?: boolean;
    limit?: number;
    offset?: number;
    triggered_by?: 'manual' | 'upload' | 'scheduled' | 'api';
    user_id?: string;
  };

  // Relations
  @ManyToOne(() => QualityRuleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule!: QualityRuleEntity;

  @ManyToOne(() => DataSourceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'data_source_id' })
  dataSource!: DataSourceEntity;
}