import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupPatternTypeColumn1735791100000 implements MigrationInterface {
  name = 'CleanupPatternTypeColumn1735791100000';

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
      
      // If both pattern_type and type columns exist, drop pattern_type
      if (columnNames.includes('pattern_type') && columnNames.includes('type')) {
        console.log('Both pattern_type and type columns exist, dropping pattern_type');
        await queryRunner.query(`ALTER TABLE "patterns" DROP COLUMN "pattern_type"`);
      } else if (columnNames.includes('pattern_type') && !columnNames.includes('type')) {
        // If only pattern_type exists, rename it to type
        console.log('Renaming pattern_type to type');
        await queryRunner.query(`ALTER TABLE "patterns" RENAME COLUMN "pattern_type" TO "type"`);
      } else {
        console.log('pattern_type cleanup not needed');
      }
      
    } catch (error) {
      console.error('Error in pattern type cleanup migration:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // In down migration, we could recreate pattern_type, but it's not necessary
    // since we're moving towards using 'type' column
    console.log('Down migration for pattern type cleanup - no action needed');
  }
}