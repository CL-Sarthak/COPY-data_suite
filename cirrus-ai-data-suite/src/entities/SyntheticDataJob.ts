import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SyntheticDataset } from './SyntheticDataset';

@Entity('synthetic_data_jobs')
export class SyntheticDataJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'dataset_id', type: 'uuid' })
  datasetId!: string;

  @ManyToOne(() => SyntheticDataset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dataset_id' })
  dataset!: SyntheticDataset;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: 'pending' | 'running' | 'completed' | 'failed';

  @Column({ type: 'integer', default: 0 })
  progress!: number;

  @Column({ name: 'records_generated', type: 'integer', default: 0 })
  recordsGenerated!: number;

  @Column({ name: 'output_file', type: 'text', nullable: true })
  outputFile?: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'start_time' })
  startTime!: Date;

  @Column({ name: 'end_time', nullable: true })
  endTime?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}