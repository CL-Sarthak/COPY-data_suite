import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRegexPatternsColumn1735790900000 implements MigrationInterface {
  name = 'AddRegexPatternsColumn1735790900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    try {
      // Check if patterns table exists
      const tableExists = await queryRunner.hasTable('patterns');
      if (!tableExists) {
        console.log('Patterns table does not exist, skipping migration');
        return;
      }

      // Get all columns from patterns table
      const columns = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'patterns'
      `);
      
      const columnNames = columns.map((col: { column_name: string }) => col.column_name);
      console.log('Current pattern table columns:', columnNames);
      
      // Add regex_patterns column if it doesn't exist
      if (!columnNames.includes('regex_patterns')) {
        console.log('Adding regex_patterns column');
        await queryRunner.query(`ALTER TABLE "patterns" ADD COLUMN "regex_patterns" TEXT DEFAULT '[]'`);
      } else {
        console.log('Column regex_patterns already exists');
      }
      
    } catch (error) {
      console.error('Error in regex patterns column migration:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query(`ALTER TABLE "patterns" DROP COLUMN IF EXISTS "regex_patterns"`);
    } catch (error) {
      console.log('Failed to drop regex_patterns column:', error);
    }
  }
}