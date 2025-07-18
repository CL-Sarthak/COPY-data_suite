import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingPatternColumns1735790800000 implements MigrationInterface {
  name = 'AddMissingPatternColumns1735790800000';

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
      
      // Define all required columns that should exist
      const requiredColumns = [
        { name: 'category', type: 'VARCHAR(255)', nullable: true },
        { name: 'regex', type: 'VARCHAR(255)', nullable: true },
        { name: 'regex_patterns', type: 'TEXT', nullable: true, default: "'[]'" },
        { name: 'examples', type: 'TEXT', nullable: false },
        { name: 'description', type: 'TEXT', nullable: false },
        { name: 'color', type: 'VARCHAR(50)', nullable: false }
      ];
      
      // Add any missing columns
      for (const col of requiredColumns) {
        if (!columnNames.includes(col.name)) {
          console.log(`Adding missing column: ${col.name}`);
          const nullableClause = col.nullable ? '' : ' NOT NULL';
          const defaultClause = (col as { default?: string }).default ? ` DEFAULT ${(col as { default?: string }).default}` : '';
          await queryRunner.query(`ALTER TABLE "patterns" ADD COLUMN "${col.name}" ${col.type}${nullableClause}${defaultClause}`);
        } else {
          console.log(`Column ${col.name} already exists`);
        }
      }
      
    } catch (error) {
      console.error('Error in missing pattern columns migration:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the columns we added
    const columnsToRemove = ['category', 'regex', 'regex_patterns', 'examples', 'description', 'color'];
    
    for (const col of columnsToRemove) {
      try {
        await queryRunner.query(`ALTER TABLE "patterns" DROP COLUMN IF EXISTS "${col}"`);
      } catch (error) {
        console.log(`Failed to drop column ${col}:`, error);
      }
    }
  }
}