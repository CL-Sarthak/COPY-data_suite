import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRegexPatterns1736445600017 implements MigrationInterface {
  name = 'AddRegexPatterns1736445600017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add regexPatterns column to store multiple regex patterns
    await queryRunner.query(`
      ALTER TABLE patterns 
      ADD COLUMN regexPatterns TEXT
    `);

    // Migrate existing regex to regexPatterns array
    // Use JSON array syntax that works in SQLite
    await queryRunner.query(`
      UPDATE patterns 
      SET regexPatterns = '[' || '"' || regex || '"' || ']'
      WHERE regex IS NOT NULL AND regex != ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE patterns 
      DROP COLUMN regexPatterns
    `);
  }
}