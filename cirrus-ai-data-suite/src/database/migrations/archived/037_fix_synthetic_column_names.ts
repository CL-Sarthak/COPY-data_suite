import { QueryRunner } from 'typeorm';

export class FixSyntheticColumnNames1750000009000 {
  async up(queryRunner: QueryRunner): Promise<void> {
    // First check if we have record_count or records_count
    const result = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'synthetic_datasets' 
      AND column_name IN ('record_count', 'records_count')
    `);
    
    if (result.length > 0 && result[0].column_name === 'record_count') {
      // Rename record_count to records_count to match what's in dev
      await queryRunner.query(`
        ALTER TABLE synthetic_datasets 
        RENAME COLUMN record_count TO records_count
      `);
    }
    
    // Ensure all required columns exist with correct names
    await queryRunner.query(`
      ALTER TABLE synthetic_datasets 
      ADD COLUMN IF NOT EXISTS records_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS examples TEXT,
      ADD COLUMN IF NOT EXISTS parameters TEXT,
      ADD COLUMN IF NOT EXISTS content TEXT,
      ADD COLUMN IF NOT EXISTS generation_status VARCHAR(50) DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS description TEXT
    `);
    
    // Make examples and parameters nullable if they aren't already
    await queryRunner.query(`
      ALTER TABLE synthetic_datasets 
      ALTER COLUMN examples DROP NOT NULL,
      ALTER COLUMN parameters DROP NOT NULL
    `);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async down(_queryRunner: QueryRunner): Promise<void> {
    // We don't reverse column renames in production
  }
}