import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixConfidenceThresholdType1750000004000 implements MigrationInterface {
  name = 'FixConfidenceThresholdType1750000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL: Change confidence_threshold from integer to float
    await queryRunner.query(`
      ALTER TABLE "patterns" 
      ALTER COLUMN "confidence_threshold" TYPE FLOAT USING confidence_threshold::float
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to integer (data loss possible)
    await queryRunner.query(`
      ALTER TABLE "patterns" 
      ALTER COLUMN "confidence_threshold" TYPE INTEGER USING confidence_threshold::integer
    `);
  }
}