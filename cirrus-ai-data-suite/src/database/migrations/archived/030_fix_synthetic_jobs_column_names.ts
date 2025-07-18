import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixSyntheticJobsColumnNames1750000002000 implements MigrationInterface {
  name = 'FixSyntheticJobsColumnNames1750000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const isSqlite = queryRunner.connection.options.type === 'better-sqlite3';
    
    // Check if synthetic_data_jobs table exists
    let tableExists = false;
    try {
      tableExists = await queryRunner.hasTable('synthetic_data_jobs');
    } catch {
      // Table might not exist
    }
    
    if (!tableExists) {
      console.log('synthetic_data_jobs table does not exist, skipping migration');
      return;
    }
    
    // For SQLite, we need to check if columns already have correct names
    if (isSqlite) {
      try {
        const result = await queryRunner.query(`PRAGMA table_info(synthetic_data_jobs)`);
        const columns = result.map((col: { name: string }) => col.name);
        if (columns.includes('dataset_id')) {
          console.log('Migration 030 already applied - snake_case columns exist');
          return;
        }
      } catch {
        // Table might not exist yet
      }
      
      // SQLite requires recreating the table to rename columns
      console.log('Recreating synthetic_data_jobs table for SQLite with correct column names');
      
      // Create temporary table with correct column names
      await queryRunner.query(`
        CREATE TABLE synthetic_data_jobs_temp (
          id VARCHAR PRIMARY KEY,
          dataset_id VARCHAR NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          progress INTEGER NOT NULL DEFAULT 0,
          records_generated INTEGER NOT NULL DEFAULT 0,
          output_file TEXT,
          error_message TEXT,
          start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          end_time DATETIME,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (dataset_id) REFERENCES synthetic_datasets(id) ON DELETE CASCADE
        )
      `);
      
      // Copy data from old table to new table
      await queryRunner.query(`
        INSERT INTO synthetic_data_jobs_temp (id, dataset_id, status, progress, records_generated, output_file, error_message, start_time, end_time, updated_at)
        SELECT id, 
               COALESCE(datasetId, dataset_id),
               status,
               progress,
               COALESCE(recordsGenerated, records_generated, 0),
               COALESCE(outputFile, output_file),
               COALESCE(errorMessage, error_message),
               COALESCE(startTime, start_time, CURRENT_TIMESTAMP),
               COALESCE(endTime, end_time),
               COALESCE(updatedAt, updated_at, CURRENT_TIMESTAMP)
        FROM synthetic_data_jobs
      `);
      
      // Drop old table and rename new table
      await queryRunner.query(`DROP TABLE synthetic_data_jobs`);
      await queryRunner.query(`ALTER TABLE synthetic_data_jobs_temp RENAME TO synthetic_data_jobs`);
      
      console.log('Successfully recreated synthetic_data_jobs table with snake_case columns');
      return;
    }
    
    // For PostgreSQL, rename columns if they exist with wrong names
    if (isPostgres) {
      const columnRenames = [
        { from: 'datasetId', to: 'dataset_id' },
        { from: 'recordsGenerated', to: 'records_generated' },
        { from: 'outputFile', to: 'output_file' },
        { from: 'errorMessage', to: 'error_message' },
        { from: 'startTime', to: 'start_time' },
        { from: 'endTime', to: 'end_time' },
        { from: 'updatedAt', to: 'updated_at' }
      ];
      
      for (const { from, to } of columnRenames) {
        try {
          // Check if column exists with old name
          const result = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'synthetic_data_jobs' 
            AND column_name = $1
          `, [from]);
          
          if (result.length > 0) {
            await queryRunner.query(`ALTER TABLE synthetic_data_jobs RENAME COLUMN "${from}" TO ${to}`);
            console.log(`Renamed column ${from} to ${to} in synthetic_data_jobs table`);
          }
        } catch {
          console.log(`Column ${from} might not exist or already renamed`);
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // This migration is not reversible for SQLite
    console.log('Down migration not implemented for synthetic jobs column name fixes');
  }
}