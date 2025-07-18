import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CatalogFieldEntity } from './CatalogFieldEntity';

@Entity('catalog_category')
export class CatalogCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'color', default: '#6b7280' }) // Default gray color
  color!: string;

  @Column({ name: 'icon', nullable: true })
  icon?: string;

  @Column({ name: 'sort_order', type: 'int', default: 999 })
  sortOrder!: number;

  @Column({ name: 'is_standard', default: false })
  isStandard!: boolean;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relationship with catalog fields
  @OneToMany(() => CatalogFieldEntity, field => field.category)
  fields!: CatalogFieldEntity[];
}