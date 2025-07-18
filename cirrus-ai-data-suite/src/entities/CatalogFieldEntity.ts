import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('catalog_field')
@Index(['category'])
@Index(['isStandard'])
export class CatalogFieldEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ name: 'display_name' })
  displayName!: string;

  @Column({ name: 'description', type: 'text' })
  description!: string;

  @Column({ name: 'data_type' })
  dataType!: string; // 'string' | 'number' | 'currency' | 'boolean' | 'date' | 'datetime' | 'json' | 'array'

  @Column({ name: 'category' })
  category!: string;

  @Column({ name: 'is_required', default: false })
  isRequired!: boolean;

  @Column({ name: 'is_standard', default: false })
  isStandard!: boolean; // True for built-in fields, false for custom fields

  @Column({ name: 'validation_rules', type: 'text', nullable: true })
  validationRules?: string; // JSON string of validation rules

  @Column({ name: 'tags', type: 'text' })
  tags!: string; // JSON array of tags

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}