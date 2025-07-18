import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('synthetic_datasets')
export class SyntheticDataset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'data_type', type: 'varchar', length: 100 })
  dataType!: string; // 'users', 'financial', 'medical', 'general', etc.

  @Column({ type: 'json', nullable: true })
  schema?: Record<string, unknown>; // JSON schema for the generated data

  @Column({ name: 'records_count', type: 'integer', default: 0 })
  recordCount!: number;

  @Column({ type: 'text', nullable: true })
  examples?: string; // Examples from database

  @Column({ type: 'text', nullable: true })
  parameters?: string; // Parameters from database

  // Configuration stored in parameters column as JSON string
  // @Column({ type: 'json', nullable: true })
  // configuration?: Record<string, unknown>; // Faker.js configuration options

  @Column({ name: 'generation_status', type: 'varchar', length: 50, default: 'draft' })
  status!: 'draft' | 'generating' | 'completed' | 'failed';

  @Column({ type: 'text', nullable: true })
  content?: string; // Content from database

  // These columns don't exist in the current database
  // @Column({ name: 'file_path', type: 'text', nullable: true })
  // filePath?: string; // Path to generated file (JSON, CSV, etc.)

  // @Column({ name: 'output_format', type: 'varchar', length: 20, default: 'json' })
  // outputFormat!: 'json' | 'csv' | 'sql';

  // @Column({ name: 'error_message', type: 'text', nullable: true })
  // errorMessage?: string;

  @Column({ type: 'text', nullable: true, name: 'generated_content' })
  generatedContent?: string; // Store generated content for production environments

  @Column({ type: 'integer', nullable: true, name: 'generated_content_size' })
  generatedContentSize?: number; // Size of generated content in bytes

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Getters for properties that the service expects but don't exist in DB
  get configuration(): Record<string, unknown> | undefined {
    if (this.parameters) {
      try {
        return JSON.parse(this.parameters);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  get outputFormat(): 'json' | 'csv' | 'sql' {
    return 'json'; // Default value
  }

  get filePath(): string | undefined {
    return undefined; // Not stored in DB
  }

  get errorMessage(): string | undefined {
    return undefined; // Not stored in DB
  }
}