import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureRegexPatternsColumn1736626800021 implements MigrationInterface {
  name = 'EnsureRegexPatternsColumn1736626800021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the column exists in different table name variations
    const tables = ['patterns', 'pattern_entity', 'pattern'];
    
    for (const tableName of tables) {
      try {
        // Check if table exists
        const tableExists = await queryRunner.hasTable(tableName);
        if (!tableExists) continue;
        
        // Check if regexPatterns column exists
        const hasColumn = await queryRunner.hasColumn(tableName, 'regexPatterns');
        
        if (!hasColumn) {
          console.log(`Adding regexPatterns column to ${tableName} table`);
          
          // Add the column
          await queryRunner.query(`
            ALTER TABLE ${tableName} 
            ADD COLUMN regexPatterns TEXT
          `);
          
          // Migrate existing regex to regexPatterns array if needed
          await queryRunner.query(`
            UPDATE ${tableName} 
            SET regexPatterns = CASE 
              WHEN regex IS NOT NULL AND regex != '' THEN '[' || '"' || regex || '"' || ']'
              ELSE '[]'
            END
            WHERE regexPatterns IS NULL
          `);
        }
      } catch (error) {
        console.log(`Error processing table ${tableName}:`, error);
      }
    }
    
    // Ensure the patterns table is the one being used
    const patternEntityExists = await queryRunner.hasTable('pattern_entity');
    const patternsExists = await queryRunner.hasTable('patterns');
    
    if (patternEntityExists && !patternsExists) {
      console.log('Detected pattern_entity table, ensuring it has regexPatterns column');
      
      const hasColumn = await queryRunner.hasColumn('pattern_entity', 'regexPatterns');
      if (!hasColumn) {
        await queryRunner.query(`
          ALTER TABLE pattern_entity 
          ADD COLUMN regexPatterns TEXT
        `);
        
        await queryRunner.query(`
          UPDATE pattern_entity 
          SET regexPatterns = CASE 
            WHEN regex IS NOT NULL AND regex != '' THEN '[' || '"' || regex || '"' || ']'
            ELSE '[]'
          END
          WHERE regexPatterns IS NULL
        `);
      }
    }
  }

  public async down(): Promise<void> {
    // Don't remove the column on rollback as it might contain data
    console.log('Rollback not implemented - preserving regexPatterns column');
  }
}