import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllMissingPatternColumns1735791000000 implements MigrationInterface {
  name = 'AddAllMissingPatternColumns1735791000000';

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
      
      // Define all required columns that should exist (based on PatternEntity)
      const requiredColumns = [
        { name: 'accuracy_metrics', type: 'TEXT', nullable: true },
        { name: 'last_refined_at', type: 'TIMESTAMP', nullable: true },
        { name: 'feedback_count', type: 'INTEGER', nullable: false, default: '0' },
        { name: 'positive_count', type: 'INTEGER', nullable: false, default: '0' },
        { name: 'negative_count', type: 'INTEGER', nullable: false, default: '0' },
        { name: 'excluded_examples', type: 'TEXT', nullable: true },
        { name: 'confidence_threshold', type: 'DECIMAL(5,2)', nullable: false, default: '0.75' },
        { name: 'auto_refine_threshold', type: 'INTEGER', nullable: false, default: '3' }
      ];
      
      // Add any missing columns
      for (const col of requiredColumns) {
        if (!columnNames.includes(col.name)) {
          console.log(`Adding missing column: ${col.name}`);
          const nullableClause = col.nullable ? '' : ' NOT NULL';
          const defaultClause = col.default ? ` DEFAULT ${col.default}` : '';
          await queryRunner.query(`ALTER TABLE "patterns" ADD COLUMN "${col.name}" ${col.type}${nullableClause}${defaultClause}`);
        } else {
          console.log(`Column ${col.name} already exists`);
        }
      }
      
    } catch (error) {
      console.error('Error in all missing pattern columns migration:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columnsToRemove = [
      'accuracy_metrics', 
      'last_refined_at', 
      'feedback_count', 
      'positive_count', 
      'negative_count', 
      'excluded_examples', 
      'confidence_threshold', 
      'auto_refine_threshold'
    ];
    
    for (const col of columnsToRemove) {
      try {
        await queryRunner.query(`ALTER TABLE "patterns" DROP COLUMN IF EXISTS "${col}"`);
      } catch (error) {
        console.log(`Failed to drop column ${col}:`, error);
      }
    }
  }
}