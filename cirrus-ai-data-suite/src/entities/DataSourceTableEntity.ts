import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DataSourceEntity } from './DataSourceEntity';

@Entity('data_source_tables')
export class DataSourceTableEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'data_source_id' })
  dataSourceId!: string;

  @ManyToOne(() => DataSourceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'data_source_id' })
  dataSource!: DataSourceEntity;

  @Column({ type: 'varchar', name: 'table_name' })
  tableName!: string;

  @Column({ type: 'varchar', nullable: true, name: 'table_type' })
  tableType?: string; // 'sheet', 'table', 'collection', etc.

  @Column({ type: 'integer', default: 0, name: 'table_index' })
  tableIndex!: number; // For ordering sheets/tables

  @Column({ type: 'integer', nullable: true, name: 'record_count' })
  recordCount?: number;

  @Column({ type: 'text', nullable: true, name: 'schema_info' })
  schemaInfo?: string; // JSON string of field information

  @Column({ type: 'text', nullable: true, name: 'ai_summary' })
  aiSummary?: string; // LLM-generated summary of the table

  @Column({ type: 'text', nullable: true, name: 'user_summary' })
  userSummary?: string; // User-edited summary/description

  @Column({ nullable: true, name: 'summary_generated_at' })
  summaryGeneratedAt?: Date; // When AI summary was generated

  @Column({ nullable: true, name: 'summary_updated_at' })
  summaryUpdatedAt?: Date; // When user summary was last edited

  @Column({ type: 'integer', nullable: true, default: 1, name: 'summary_version' })
  summaryVersion?: number; // Version tracking for summaries

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}