import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsurePatternTypeColumn1735790500000 implements MigrationInterface {
  name = 'EnsurePatternTypeColumn1735790500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First check if pattern_type exists and rename it
    const hasPatternType = await queryRunner.hasColumn('patterns', 'pattern_type');
    if (hasPatternType) {
      await queryRunner.query(`ALTER TABLE "patterns" RENAME COLUMN "pattern_type" TO "type"`);
      return;
    }
    
    // Check if type column exists
    const hasType = await queryRunner.hasColumn('patterns', 'type');
    if (!hasType) {
      // Create the type column with a default value
      await queryRunner.query(`ALTER TABLE "patterns" ADD COLUMN "type" VARCHAR NOT NULL DEFAULT 'CUSTOM'`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No down migration needed as we want to keep the type column
  }
}