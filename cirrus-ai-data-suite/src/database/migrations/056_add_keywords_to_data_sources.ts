import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKeywordsToDataSources056 implements MigrationInterface {
  name = 'AddKeywordsToDataSources056';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add keyword fields to data_source_entity table
    await queryRunner.query(`
      ALTER TABLE data_source_entity
      ADD COLUMN IF NOT EXISTS ai_keywords TEXT,
      ADD COLUMN IF NOT EXISTS keywords_generated_at TIMESTAMP
    `);

    // Add index for better query performance on keywords generation date
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_data_source_keywords_generated_at
      ON data_source_entity(keywords_generated_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove index
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_data_source_keywords_generated_at
    `);

    // Remove columns
    await queryRunner.query(`
      ALTER TABLE data_source_entity
      DROP COLUMN IF EXISTS ai_keywords,
      DROP COLUMN IF EXISTS keywords_generated_at
    `);
  }
}