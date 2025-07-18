import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('field_mapping')
@Index(['sourceId'])
@Index(['catalogFieldId'])
@Index(['sourceId', 'sourceFieldName'], { unique: true })
export class FieldMappingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'source_id' })
  sourceId!: string; // Reference to DataSourceEntity

  @Column({ name: 'source_field_name' })
  sourceFieldName!: string;

  @Column({ name: 'catalog_field_id' })
  catalogFieldId!: string; // Reference to CatalogFieldEntity

  @Column({ name: 'transformation_rule', type: 'text', nullable: true })
  transformationRule?: string; // JSON string of transformation rules

  @Column({ name: 'confidence', type: 'decimal', precision: 3, scale: 2, default: 0.0 })
  confidence!: number; // 0.0 to 1.0

  @Column({ name: 'is_manual', default: false })
  isManual!: boolean; // True if manually mapped, false if auto-detected

  @Column({ name: 'is_active', default: true })
  isActive!: boolean; // False if mapping is disabled

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}