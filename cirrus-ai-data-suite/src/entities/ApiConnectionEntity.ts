import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ApiAuthType = 'none' | 'api-key' | 'bearer' | 'basic' | 'oauth2';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiConnectionStatus = 'active' | 'inactive' | 'error';

@Entity('api_connections')
export class ApiConnectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text' })
  endpoint!: string;

  @Column({ type: 'varchar', length: 10, default: 'GET' })
  method!: HttpMethod;

  @Column({ type: 'varchar', length: 20, default: 'none' })
  auth_type!: ApiAuthType;

  @Column({ type: 'text', nullable: true })
  auth_config?: string; // JSON string containing auth details (encrypted)

  @Column({ type: 'text', nullable: true })
  headers?: string; // JSON string of headers

  @Column({ type: 'text', nullable: true })
  request_body?: string; // For POST/PUT/PATCH requests

  @Column({ type: 'text', nullable: true })
  pagination_config?: string; // JSON config for pagination

  @Column({ type: 'integer', nullable: true })
  rate_limit?: number; // Requests per minute

  @Column({ type: 'integer', nullable: true })
  timeout?: number; // Request timeout in milliseconds

  @Column({ type: 'integer', nullable: true })
  retry_count?: number; // Number of retries on failure

  @Column({ type: 'boolean', default: false })
  refresh_enabled!: boolean;

  @Column({ type: 'integer', nullable: true })
  refresh_interval?: number; // in minutes

  @Column({ type: 'timestamp', nullable: true })
  last_refresh_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  next_refresh_at?: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_tested_at?: Date;

  @Column({ type: 'varchar', length: 20, default: 'inactive' })
  status!: ApiConnectionStatus;

  @Column({ type: 'text', nullable: true })
  error_message?: string;

  @Column({ type: 'text', nullable: true })
  response_mapping?: string; // JSON path or mapping config

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  tags?: string; // JSON array of tags

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}