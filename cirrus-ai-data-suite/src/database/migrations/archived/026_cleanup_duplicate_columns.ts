import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupDuplicateColumns1736700500026 implements MigrationInterface {
  name = '026_cleanup_duplicate_columns';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    
    if (isPostgres) {
      console.log('Cleaning up duplicate columns in patterns table...');
      
      // First, check which columns exist
      const columns = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'patterns'
        AND column_name IN ('regex_patterns', 'regexPatterns', 'regexpatterns')
      `);
      
      const existingColumns = columns.map((c: { column_name: string }) => c.column_name);
      console.log('Found columns:', existingColumns);
      
      // If we have duplicates, we need to consolidate the data
      if (existingColumns.length > 1) {
        // First, update regex_patterns with any data from the duplicate columns
        if (existingColumns.includes('regexPatterns') && existingColumns.includes('regex_patterns')) {
          await queryRunner.query(`
            UPDATE patterns 
            SET regex_patterns = COALESCE(
              NULLIF(regex_patterns, ''), 
              NULLIF(regex_patterns, '[]'),
              "regexPatterns"
            )
            WHERE regex_patterns IS NULL OR regex_patterns = '' OR regex_patterns = '[]'
          `);
        }
        
        if (existingColumns.includes('regexpatterns') && existingColumns.includes('regex_patterns')) {
          await queryRunner.query(`
            UPDATE patterns 
            SET regex_patterns = COALESCE(
              NULLIF(regex_patterns, ''), 
              NULLIF(regex_patterns, '[]'),
              regexpatterns
            )
            WHERE regex_patterns IS NULL OR regex_patterns = '' OR regex_patterns = '[]'
          `);
        }
        
        // Drop the duplicate columns
        if (existingColumns.includes('regexPatterns')) {
          await queryRunner.query(`ALTER TABLE patterns DROP COLUMN "regexPatterns"`);
          console.log('Dropped column: regexPatterns');
        }
        
        if (existingColumns.includes('regexpatterns')) {
          await queryRunner.query(`ALTER TABLE patterns DROP COLUMN regexpatterns`);
          console.log('Dropped column: regexpatterns');
        }
      }
      
      // Ensure regex_patterns has proper default
      await queryRunner.query(`
        UPDATE patterns 
        SET regex_patterns = '[]' 
        WHERE regex_patterns IS NULL OR regex_patterns = ''
      `);
      
      console.log('Cleanup completed');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No down migration - we don't want to recreate duplicate columns
  }
}