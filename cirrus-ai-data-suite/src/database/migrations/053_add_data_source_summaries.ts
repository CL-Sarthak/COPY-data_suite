import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDataSourceSummaries053 implements MigrationInterface {
  name = 'AddDataSourceSummaries053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add summary fields to data_source_entity table
    await queryRunner.query(`
      ALTER TABLE data_source_entity
      ADD COLUMN IF NOT EXISTS ai_summary TEXT,
      ADD COLUMN IF NOT EXISTS user_summary TEXT,
      ADD COLUMN IF NOT EXISTS summary_generated_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS summary_updated_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS summary_version INTEGER DEFAULT 1
    `);

    // Add indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_data_source_summary_generated_at
      ON data_source_entity(summary_generated_at)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_data_source_summary_updated_at
      ON data_source_entity(summary_updated_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_data_source_summary_updated_at
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_data_source_summary_generated_at
    `);

    // Remove columns
    await queryRunner.query(`
      ALTER TABLE data_source_entity
      DROP COLUMN IF EXISTS ai_summary,
      DROP COLUMN IF EXISTS user_summary,
      DROP COLUMN IF EXISTS summary_generated_at,
      DROP COLUMN IF EXISTS summary_updated_at,
      DROP COLUMN IF EXISTS summary_version
    `);
  }
}