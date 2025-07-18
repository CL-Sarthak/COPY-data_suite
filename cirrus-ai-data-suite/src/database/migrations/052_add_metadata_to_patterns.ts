import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMetadataToPatterns1736307800000 implements MigrationInterface {
  name = 'AddMetadataToPatterns1736307800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add metadata column to patterns table
    await queryRunner.query(`
      ALTER TABLE "patterns"
      ADD COLUMN IF NOT EXISTS "metadata" text;
    `);
    
    // Add comment for clarity
    await queryRunner.query(`
      COMMENT ON COLUMN "patterns"."metadata" IS 'JSON string for additional pattern metadata (e.g., cluster information)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the column
    await queryRunner.query(`
      ALTER TABLE "patterns"
      DROP COLUMN IF EXISTS "metadata";
    `);
  }
}