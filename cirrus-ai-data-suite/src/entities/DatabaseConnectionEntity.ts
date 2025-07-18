import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('database_connections')
export class DatabaseConnectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar' })
  name!: string;

  @Column({ name: 'type', type: 'varchar' })
  type!: 'postgresql' | 'mysql' | 'mongodb' | 'mssql' | 'oracle' | 'db2' | 'snowflake' | 'redshift' | 'bigquery';

  @Column({ name: 'host', type: 'varchar' })
  host!: string;

  @Column({ name: 'port', type: 'integer' })
  port!: number;

  @Column({ name: 'database', type: 'varchar' })
  database!: string;

  @Column({ name: 'username', type: 'varchar' })
  username!: string;

  @Column({ name: 'password', type: 'varchar', nullable: true })
  password?: string; // Should be encrypted

  @Column({ name: 'ssl', type: 'boolean', default: false })
  ssl!: boolean;

  @Column({ name: 'ssl_cert', type: 'text', nullable: true })
  sslCert?: string;

  @Column({ name: 'additional_options', type: 'text', nullable: true })
  additionalOptions?: string; // JSON string

  @Column({ name: 'status', type: 'varchar', default: 'inactive' })
  status!: 'active' | 'inactive' | 'error';

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'last_tested_at', type: 'timestamp', nullable: true })
  lastTestedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy?: string;

  @Column({ name: 'tags', type: 'text', nullable: true })
  tags?: string; // JSON array of strings

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'refresh_enabled', type: 'boolean', default: false })
  refreshEnabled!: boolean;

  @Column({ name: 'refresh_interval', type: 'integer', nullable: true })
  refreshInterval?: number; // in minutes

  @Column({ name: 'last_refresh_at', type: 'timestamp', nullable: true })
  lastRefreshAt?: Date;

  @Column({ name: 'next_refresh_at', type: 'timestamp', nullable: true })
  nextRefreshAt?: Date;
}