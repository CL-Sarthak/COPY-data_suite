import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsurePatternTypeColumnFinal1735790700000 implements MigrationInterface {
  name = 'EnsurePatternTypeColumnFinal1735790700000';

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
      const hasType = columnNames.includes('type');
      const hasPatternType = columnNames.includes('pattern_type');
      
      console.log('Pattern table columns:', columnNames);
      
      if (!hasType && hasPatternType) {
        // Rename pattern_type to type
        console.log('Renaming pattern_type to type');
        await queryRunner.query(`ALTER TABLE "patterns" RENAME COLUMN "pattern_type" TO "type"`);
      } else if (!hasType && !hasPatternType) {
        // Create type column
        console.log('Creating type column');
        await queryRunner.query(`ALTER TABLE "patterns" ADD COLUMN "type" VARCHAR(100) NOT NULL DEFAULT 'CUSTOM'`);
      } else if (hasType) {
        console.log('Type column already exists');
        // Ensure it has a default value
        await queryRunner.query(`ALTER TABLE "patterns" ALTER COLUMN "type" SET DEFAULT 'CUSTOM'`);
      }
      
      // Ensure all required columns exist with proper types
      const requiredColumns = [
        { name: 'category', type: 'VARCHAR(255)', default: null },
        { name: 'regex', type: 'VARCHAR(255)', default: null },
        { name: 'regex_patterns', type: 'TEXT', default: "'[]'" },
        { name: 'examples', type: 'TEXT', default: null },
        { name: 'description', type: 'TEXT', default: null },
        { name: 'color', type: 'VARCHAR(50)', default: null },
        { name: 'is_active', type: 'BOOLEAN', default: 'true' },
        { name: 'accuracy_metrics', type: 'TEXT', default: null },
        { name: 'last_refined_at', type: 'TIMESTAMP', default: null },
        { name: 'feedback_count', type: 'INTEGER', default: '0' },
        { name: 'positive_count', type: 'INTEGER', default: '0' },
        { name: 'negative_count', type: 'INTEGER', default: '0' },
        { name: 'excluded_examples', type: 'TEXT', default: null },
        { name: 'confidence_threshold', type: 'DECIMAL(5,2)', default: '0.75' },
        { name: 'auto_refine_threshold', type: 'INTEGER', default: '3' }
      ];
      
      for (const col of requiredColumns) {
        if (!columnNames.includes(col.name)) {
          console.log(`Adding missing column: ${col.name}`);
          const defaultClause = col.default ? ` DEFAULT ${col.default}` : '';
          await queryRunner.query(`ALTER TABLE "patterns" ADD COLUMN "${col.name}" ${col.type}${defaultClause}`);
        }
      }
      
    } catch (error) {
      console.error('Error in pattern type migration:', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No down migration - we want to keep the type column
  }
}