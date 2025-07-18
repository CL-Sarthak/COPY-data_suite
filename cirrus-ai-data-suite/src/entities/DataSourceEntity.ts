import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('data_source_entity')
export class DataSourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  type!: string; // 'database' | 'api' | 'filesystem' | 's3' | 'azure' | 'gcp' | 'json_transformed'

  @Column({ type: 'varchar', nullable: true })
  path?: string; // Path/URL for the data source

  @Column({ type: 'text' })
  configuration!: string; // JSON string of configuration

  @Column({ type: 'text', nullable: true })
  metadata?: string; // JSON string of metadata

  @Column({ type: 'integer', nullable: true, name: 'record_count' })
  recordCount?: number;

  @Column({ type: 'text', nullable: true })
  tags?: string; // JSON array of tags like ["customer-data", "pii", "production"]

  @Column({ type: 'text', nullable: true, name: 'transformed_data' })
  transformedData?: string; // JSON string of UnifiedDataCatalog

  @Column({ nullable: true, name: 'transformed_at' })
  transformedAt?: Date;

  @Column({ nullable: true, name: 'original_path' })
  originalPath?: string; // Path to original file storage (legacy)

  @Column({ type: 'text', nullable: true, name: 'storage_keys' })
  storageKeys?: string; // JSON array of storage keys for files

  @Column({ nullable: true, name: 'storage_provider' })
  storageProvider?: string; // Storage provider used (local, vercel, s3)

  @Column({ nullable: true, default: 'not_started', name: 'transformation_status' })
  transformationStatus?: string; // 'not_started' | 'in_progress' | 'completed' | 'completed_with_errors' | 'failed'

  @Column({ nullable: true, name: 'transformation_applied_at' })
  transformationAppliedAt?: Date; // When field mappings were last applied

  @Column({ type: 'text', nullable: true, name: 'transformation_errors' })
  transformationErrors?: string; // JSON string of validation errors

  @Column({ type: 'text', nullable: true, name: 'original_field_names' })
  originalFieldNames?: string; // JSON array of original field names from source data

  @Column({ type: 'text', nullable: true, name: 'ai_summary' })
  aiSummary?: string; // LLM-generated summary of the data source

  @Column({ type: 'text', nullable: true, name: 'user_summary' })
  userSummary?: string; // User-edited summary/description

  @Column({ nullable: true, name: 'summary_generated_at' })
  summaryGeneratedAt?: Date; // When AI summary was generated

  @Column({ nullable: true, name: 'summary_updated_at' })
  summaryUpdatedAt?: Date; // When user summary was last edited

  @Column({ type: 'integer', nullable: true, default: 1, name: 'summary_version' })
  summaryVersion?: number; // Version tracking for summaries

  @Column({ type: 'integer', nullable: true, default: 1, name: 'table_count' })
  tableCount?: number; // Number of tables/sheets in this data source

  @Column({ type: 'boolean', nullable: true, default: false, name: 'has_multiple_tables' })
  hasMultipleTables?: boolean; // Whether this source contains multiple tables/sheets

  @Column({ type: 'text', nullable: true, name: 'ai_keywords' })
  aiKeywords?: string; // JSON array of AI-generated keywords for query routing

  @Column({ nullable: true, name: 'keywords_generated_at' })
  keywordsGeneratedAt?: Date; // When keywords were generated

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Virtual properties for backward compatibility
  get connectionStatus(): string {
    // Default to 'connected' for existing data sources
    return 'connected';
  }

  get lastSync(): Date {
    return this.updatedAt;
  }
}