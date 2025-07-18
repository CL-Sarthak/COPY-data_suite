import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPatternTypeColumn1735790400000 implements MigrationInterface {
  name = 'FixPatternTypeColumn1735790400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the column exists as 'pattern_type' and rename it to 'type'
    const hasPatternType = await queryRunner.hasColumn('patterns', 'pattern_type');
    const hasType = await queryRunner.hasColumn('patterns', 'type');
    
    if (hasPatternType && !hasType) {
      await queryRunner.query(`ALTER TABLE "patterns" RENAME COLUMN "pattern_type" TO "type"`);
    } else if (!hasPatternType && !hasType) {
      // If neither exists, create the type column
      await queryRunner.query(`ALTER TABLE "patterns" ADD COLUMN "type" VARCHAR NOT NULL DEFAULT 'CUSTOM'`);
    }
    // If 'type' already exists, do nothing
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert by renaming 'type' back to 'pattern_type' if it exists
    const hasType = await queryRunner.hasColumn('patterns', 'type');
    const hasPatternType = await queryRunner.hasColumn('patterns', 'pattern_type');
    
    if (hasType && !hasPatternType) {
      await queryRunner.query(`ALTER TABLE "patterns" RENAME COLUMN "type" TO "pattern_type"`);
    }
  }
}