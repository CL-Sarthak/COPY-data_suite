import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AnnotationSession } from './AnnotationSession';

@Entity('processed_files')
export class ProcessedFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'file_name' })
  fileName!: string;

  @Column({ name: 'original_content' })
  originalContent!: string;

  @Column({ name: 'redacted_content' })
  redactedContent!: string;

  @Column({ name: 'redaction_count', type: 'int', default: 0 })
  redactionCount!: number;

  @Column({ name: 'file_type' })
  fileType!: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize!: number;

  @Column({ name: 'session_id' })
  sessionId!: string;

  @ManyToOne(() => AnnotationSession)
  @JoinColumn({ name: 'session_id' })
  session!: AnnotationSession;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}