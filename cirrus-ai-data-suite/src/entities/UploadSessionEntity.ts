import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('upload_sessions')
export class UploadSessionEntity {
  @PrimaryColumn({ name: 'upload_id' })
  uploadId!: string;

  @Column({ name: 'file_name' })
  fileName!: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize!: number;

  @Column({ name: 'mime_type' })
  mimeType!: string;

  @Column({ name: 'chunk_size' })
  chunkSize!: number;

  @Column({ name: 'total_chunks' })
  totalChunks!: number;

  @Column({ name: 'uploaded_chunks', type: 'simple-json', nullable: true })
  uploadedChunks!: number[];

  @Column({ name: 'status', default: 'active' })
  status!: 'active' | 'paused' | 'completed' | 'failed';

  @Column({ name: 'storage_key', nullable: true })
  storageKey?: string;

  @Column({ name: 'metadata', type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'start_time' })
  startTime!: Date;

  @UpdateDateColumn({ name: 'last_activity' })
  lastActivity!: Date;
}