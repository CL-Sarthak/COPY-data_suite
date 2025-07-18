import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SensitivePattern, FileData } from '@/types';

@Entity('annotation_sessions')
export class AnnotationSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name' })
  name!: string;

  @Column({ name: 'description', nullable: true })
  description?: string;

  @Column({ name: 'patterns', type: 'simple-json' })
  patterns!: SensitivePattern[];

  @Column({ name: 'training_files', type: 'simple-json', nullable: true })
  trainingFiles?: FileData[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}