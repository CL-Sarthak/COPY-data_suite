import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKeywordsToDataSources1736619000000 implements MigrationInterface {
  name = 'AddKeywordsToDataSources1736619000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add keywords columns to data_source_entity
    await queryRunner.query(`
      ALTER TABLE "data_source_entity" 
      ADD COLUMN IF NOT EXISTS "ai_keywords" TEXT
    `);
    
    await queryRunner.query(`
      ALTER TABLE "data_source_entity" 
      ADD COLUMN IF NOT EXISTS "keywords_generated_at" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "data_source_entity" DROP COLUMN IF EXISTS "keywords_generated_at"`);
    await queryRunner.query(`ALTER TABLE "data_source_entity" DROP COLUMN IF EXISTS "ai_keywords"`);
  }
}