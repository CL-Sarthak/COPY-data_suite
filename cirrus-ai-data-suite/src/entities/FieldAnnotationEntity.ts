import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { DataSourceEntity } from './DataSourceEntity';

@Entity('field_annotations')
@Index(['dataSourceId', 'fieldPath'], { unique: true })
export class FieldAnnotationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'data_source_id' })
  dataSourceId!: string;

  @ManyToOne(() => DataSourceEntity, { onDelete: 'CASCADE' })
  dataSource!: DataSourceEntity;

  @Column({ name: 'field_path' })
  fieldPath!: string;

  @Column({ name: 'field_name' })
  fieldName!: string;

  @Column({ name: 'semantic_type', nullable: true })
  semanticType?: string; // 'identifier', 'pii', 'metric', 'dimension', 'timestamp', etc.

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'business_context', type: 'text', nullable: true })
  businessContext?: string;

  @Column({ name: 'data_type', nullable: true })
  dataType?: string; // Detected or user-defined data type

  @Column({ name: 'is_pii', default: false })
  isPII!: boolean;

  @Column({ name: 'pii_type', nullable: true })
  piiType?: string; // 'email', 'phone', 'ssn', 'name', etc.

  @Column({ name: 'sensitivity_level', nullable: true })
  sensitivityLevel?: string; // 'public', 'internal', 'confidential', 'restricted'

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ name: 'is_nullable', default: true })
  isNullable!: boolean;

  @Column({ name: 'is_unique', default: false })
  isUnique!: boolean;

  @Column({ name: 'example_values', type: 'simple-json', nullable: true })
  exampleValues?: string[];

  @Column({ type: 'simple-json', nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;
}