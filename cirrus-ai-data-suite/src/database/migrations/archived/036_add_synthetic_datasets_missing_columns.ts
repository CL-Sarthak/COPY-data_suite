import { QueryRunner } from 'typeorm';

export class AddSyntheticDatasetsMissingColumns1750000008000 {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing columns to synthetic_datasets table
    await queryRunner.query(`
      ALTER TABLE synthetic_datasets 
      ADD COLUMN IF NOT EXISTS examples TEXT,
      ADD COLUMN IF NOT EXISTS parameters TEXT,
      ADD COLUMN IF NOT EXISTS content TEXT,
      ADD COLUMN IF NOT EXISTS generation_status VARCHAR(50) DEFAULT 'draft'
    `);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async down(_queryRunner: QueryRunner): Promise<void> {
    // We don't drop columns in production
  }
}