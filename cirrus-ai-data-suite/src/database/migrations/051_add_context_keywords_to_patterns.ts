import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContextKeywordsToPatterns1736307700000 implements MigrationInterface {
  name = 'AddContextKeywordsToPatterns1736307700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add context_keywords column to patterns table
    await queryRunner.query(`
      ALTER TABLE "patterns"
      ADD COLUMN IF NOT EXISTS "context_keywords" text;
    `);
    
    // Add comment for clarity
    await queryRunner.query(`
      COMMENT ON COLUMN "patterns"."context_keywords" IS 'JSON array of keywords that should appear near matches for context validation';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the column
    await queryRunner.query(`
      ALTER TABLE "patterns"
      DROP COLUMN IF EXISTS "context_keywords";
    `);
  }
}