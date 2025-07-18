import { QueryRunner } from 'typeorm';

export class AddTableLevelSummaries054 implements BaseMigration {
  public name = 'AddTableLevelSummaries054';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create table for storing table-level metadata
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS data_source_tables (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        data_source_id UUID NOT NULL REFERENCES data_source_entity(id) ON DELETE CASCADE,
        table_name VARCHAR NOT NULL,
        table_type VARCHAR, -- 'sheet', 'table', 'collection', etc.
        table_index INTEGER DEFAULT 0, -- For ordering sheets/tables
        record_count INTEGER,
        schema_info TEXT, -- JSON string of field information
        ai_summary TEXT,
        user_summary TEXT,
        summary_generated_at TIMESTAMP,
        summary_updated_at TIMESTAMP,
        summary_version INTEGER DEFAULT 1,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(data_source_id, table_name)
      )
    `);

    // Add index for faster queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_data_source_tables_source_id 
      ON data_source_tables(data_source_id)
    `);

    // Add table count column to data sources
    await queryRunner.query(`
      ALTER TABLE data_source_entity 
      ADD COLUMN IF NOT EXISTS table_count INTEGER DEFAULT 1
    `);

    // Add has_multiple_tables flag
    await queryRunner.query(`
      ALTER TABLE data_source_entity 
      ADD COLUMN IF NOT EXISTS has_multiple_tables BOOLEAN DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from data_source_entity
    await queryRunner.query(`ALTER TABLE data_source_entity DROP COLUMN IF EXISTS table_count`);
    await queryRunner.query(`ALTER TABLE data_source_entity DROP COLUMN IF EXISTS has_multiple_tables`);
    
    // Drop the tables table
    await queryRunner.query(`DROP TABLE IF EXISTS data_source_tables`);
  }
}

interface BaseMigration {
  name: string;
  up(queryRunner: QueryRunner): Promise<void>;
  down(queryRunner: QueryRunner): Promise<void>;
}