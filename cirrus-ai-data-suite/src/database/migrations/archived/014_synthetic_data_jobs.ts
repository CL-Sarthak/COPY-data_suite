import { DataSource } from 'typeorm';

export async function runMigration014(dataSource: DataSource): Promise<void> {
  console.log('Running migration 014: Creating/updating synthetic_data_jobs table...');
  
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  
  try {
    // Check if table exists
    const tableExists = await queryRunner.hasTable('synthetic_data_jobs');
    
    if (!tableExists) {
      // Create the table
      if (dataSource.options.type === 'postgres') {
        await queryRunner.query(`
          CREATE TABLE "synthetic_data_jobs" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "dataset_id" uuid NOT NULL,
            "status" varchar(50) NOT NULL DEFAULT 'pending',
            "progress" integer NOT NULL DEFAULT 0,
            "records_generated" integer NOT NULL DEFAULT 0,
            "output_file" text,
            "error_message" text,
            "start_time" timestamp NOT NULL DEFAULT now(),
            "end_time" timestamp,
            "updated_at" timestamp NOT NULL DEFAULT now(),
            CONSTRAINT "FK_synthetic_data_jobs_dataset" FOREIGN KEY ("dataset_id") 
              REFERENCES "synthetic_datasets"("id") ON DELETE CASCADE
          )
        `);
      } else {
        // SQLite version
        await queryRunner.query(`
          CREATE TABLE "synthetic_data_jobs" (
            "id" varchar PRIMARY KEY,
            "dataset_id" varchar NOT NULL,
            "status" varchar(50) NOT NULL DEFAULT 'pending',
            "progress" integer NOT NULL DEFAULT 0,
            "records_generated" integer NOT NULL DEFAULT 0,
            "output_file" text,
            "error_message" text,
            "start_time" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "end_time" datetime,
            "updated_at" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("dataset_id") REFERENCES "synthetic_datasets"("id") ON DELETE CASCADE
          )
        `);
      }
      console.log('Created synthetic_data_jobs table');
    } else {
      // Check if recordsGenerated column exists
      const table = await queryRunner.getTable('synthetic_data_jobs');
      const hasRecordsGenerated = table?.columns.some(col => 
        col.name === 'records_generated' || col.name === 'recordsGenerated' || col.name === 'recordsgenerated'
      );
      
      if (!hasRecordsGenerated) {
        // Add the column
        await queryRunner.query(`
          ALTER TABLE synthetic_data_jobs 
          ADD COLUMN records_generated INTEGER NOT NULL DEFAULT 0
        `);
        console.log('Added recordsGenerated column to synthetic_data_jobs');
      }
    }
    
    console.log('Migration 014 completed: synthetic_data_jobs table ready');
  } catch (error) {
    console.error('Migration 014 error:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}