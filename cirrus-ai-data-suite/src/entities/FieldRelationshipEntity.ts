import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { FieldAnnotationEntity } from './FieldAnnotationEntity';

@Entity('field_relationships')
@Index(['sourceFieldId', 'targetFieldId'], { unique: true })
export class FieldRelationshipEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'source_field_id' })
  sourceFieldId!: string;

  @ManyToOne(() => FieldAnnotationEntity, { onDelete: 'CASCADE' })
  sourceField!: FieldAnnotationEntity;

  @Column({ name: 'target_field_id' })
  targetFieldId!: string;

  @ManyToOne(() => FieldAnnotationEntity, { onDelete: 'CASCADE' })
  targetField!: FieldAnnotationEntity;

  @Column({ name: 'relationship_type' })
  relationshipType!: string; // 'foreign_key', 'same_entity', 'derived', 'related'

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: 1.0 })
  confidence!: number; // 0-1 confidence score for auto-detected relationships

  @Column({ name: 'is_verified', default: false })
  isVerified!: boolean; // User-verified relationship

  @Column({ type: 'simple-json', nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}