import { DataSource } from 'typeorm';
import { logger } from './logger';

/**
 * Validates database compatibility and column naming before running migrations
 */
export async function validateDatabaseCompatibility(dataSource: DataSource): Promise<void> {
  const dbType = dataSource.options.type;
  
  if (dbType === 'postgres') {
    logger.info('Validating PostgreSQL column naming...');
    
    try {
      // Check if any columns have mixed case names that might cause issues
      const tables = await dataSource.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      for (const table of tables) {
        const columns = await dataSource.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1
        `, [table.table_name]);
        
        for (const col of columns) {
          if (col.column_name !== col.column_name.toLowerCase()) {
            logger.warn(`Column "${col.column_name}" in table "${table.table_name}" has mixed case. Consider renaming to lowercase.`);
          }
        }
      }
    } catch (error) {
      // If information_schema is not available, skip validation
      logger.debug('Could not validate column names:', error);
    }
  }
}

/**
 * Ensures critical columns exist with correct types
 */
export async function ensureCriticalColumns(dataSource: DataSource): Promise<void> {
  // Define critical columns that must exist
  const criticalColumns = [
    { table: 'patterns', column: 'id' },
    { table: 'patterns', column: 'name' },
    { table: 'patterns', column: 'is_active', fallback: 'isActive' },
    { table: 'patterns', column: 'regex_patterns', fallback: 'regexPatterns' },
  ];
  
  for (const { table, column, fallback } of criticalColumns) {
    try {
      // Try to query the column
      await dataSource.query(`SELECT ${column} FROM ${table} LIMIT 0`);
    } catch {
      if (fallback) {
        try {
          // Try the fallback column name
          await dataSource.query(`SELECT ${fallback} FROM ${table} LIMIT 0`);
          logger.warn(`Column "${column}" not found in ${table}, but "${fallback}" exists. Consider renaming.`);
        } catch {
          logger.error(`Neither "${column}" nor "${fallback}" found in ${table}`);
        }
      } else {
        logger.error(`Critical column "${column}" not found in ${table}`);
      }
    }
  }
}