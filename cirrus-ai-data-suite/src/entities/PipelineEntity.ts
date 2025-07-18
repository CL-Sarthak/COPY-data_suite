import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pipeline')
export class PipelineEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column({ name: 'name', type: 'varchar' })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'nodes', type: 'text', nullable: true })
  nodes?: string; // JSON string of PipelineNode[]

  @Column({ name: 'edges', type: 'text', nullable: true })
  edges?: string; // JSON string of PipelineEdge[]

  @Column({ name: 'triggers', type: 'text', nullable: true })
  triggers?: string; // JSON string of PipelineTrigger[]

  @Column({ name: 'schedule', type: 'text', nullable: true })
  schedule?: string; // JSON string of PipelineSchedule

  @Column({ name: 'status', type: 'varchar', default: 'draft' })
  status!: 'draft' | 'active' | 'paused' | 'error' | 'completed';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'created_by', type: 'varchar' })
  createdBy!: string;

  @Column({ name: 'tags', type: 'text', nullable: true })
  tags?: string; // JSON string of string[]

  @Column({ name: 'version', type: 'integer', default: 1 })
  version!: number;
}