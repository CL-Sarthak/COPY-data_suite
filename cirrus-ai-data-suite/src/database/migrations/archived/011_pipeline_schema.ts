import { DataSource } from 'typeorm';

export async function runMigration011(dataSource: DataSource): Promise<void> {
  console.log('Running migration 011: Creating pipeline table...');
  
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  
  try {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const timestampType = isPostgres ? 'TIMESTAMP' : 'DATETIME';
    
    // Check if pipeline table already exists
    let tableExists = false;
    
    if (isPostgres) {
      const result = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'pipeline'
        )
      `);
      tableExists = result[0].exists;
    } else {
      const result = await queryRunner.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='pipeline'
      `);
      tableExists = result.length > 0;
    }
    
    if (!tableExists) {
      if (isPostgres) {
        await queryRunner.query(`
          CREATE TABLE pipeline (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            nodes TEXT,
            edges TEXT,
            triggers TEXT,
            schedule TEXT,
            status VARCHAR(50) DEFAULT 'draft',
            created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
            updated_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(255) NOT NULL,
            tags TEXT,
            version INTEGER DEFAULT 1
          )
        `);
      } else {
        await queryRunner.query(`
          CREATE TABLE pipeline (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            nodes TEXT,
            edges TEXT,
            triggers TEXT,
            schedule TEXT,
            status VARCHAR(50) DEFAULT 'draft',
            created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
            updated_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(255) NOT NULL,
            tags TEXT,
            version INTEGER DEFAULT 1
          )
        `);
      }
      
      console.log('Migration 011 completed: Created pipeline table');
    } else {
      console.log('Migration 011 skipped: Pipeline table already exists');
    }
  } catch (error) {
    console.error('Pipeline table migration 011 failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}