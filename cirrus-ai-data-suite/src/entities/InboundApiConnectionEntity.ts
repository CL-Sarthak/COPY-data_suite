import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('inbound_api_connections')
@Index(['api_key'])
@Index(['status'])
export class InboundApiConnectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  api_key!: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status!: string; // active, inactive

  @Column({ type: 'jsonb', nullable: true })
  auth_config?: Record<string, unknown>; // For additional auth like IP whitelist

  @Column({ type: 'jsonb', nullable: true })
  data_schema?: Record<string, unknown>; // Expected data schema/validation

  @Column({ type: 'jsonb', nullable: true })
  transformation_config?: Record<string, unknown>; // How to transform incoming data

  @Column({ type: 'varchar', length: 50, default: 'append' })
  data_mode!: string; // append or replace

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  custom_url?: string; // Custom URL path like "customer-data"

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'X-API-Key' })
  api_key_header?: string; // Header name for API key

  @Column({ type: 'boolean', default: true })
  require_api_key!: boolean; // Whether to require API key

  @Column({ type: 'varchar', nullable: true })
  data_source_id?: string; // Associated data source

  @Column({ type: 'integer', default: 0 })
  request_count!: number;

  @Column({ type: 'timestamp', nullable: true })
  last_request_at?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}