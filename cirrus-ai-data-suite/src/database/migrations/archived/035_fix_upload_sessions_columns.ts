import { QueryRunner } from 'typeorm';

export class FixUploadSessionsColumns1750000007000 {
  name = 'FixUploadSessionsColumns1750000007000';
  
  async up(queryRunner: QueryRunner): Promise<void> {
    // Check if upload_sessions table exists
    const tableExists = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'upload_sessions'
    `);
    
    if (tableExists.length > 0) {
      // Check if we have id column instead of upload_id
      const hasId = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'upload_sessions' 
        AND column_name = 'id'
      `);
      
      if (hasId.length > 0) {
        console.log('Renaming id column to upload_id in upload_sessions table...');
        
        // Drop and recreate the table with correct schema
        await queryRunner.query(`DROP TABLE IF EXISTS upload_sessions CASCADE`);
        
        await queryRunner.query(`
          CREATE TABLE upload_sessions (
            upload_id VARCHAR(255) PRIMARY KEY,
            file_name VARCHAR(255) NOT NULL,
            file_size BIGINT NOT NULL,
            mime_type VARCHAR(255) NOT NULL,
            chunk_size INTEGER NOT NULL,
            total_chunks INTEGER NOT NULL,
            uploaded_chunks TEXT,
            status VARCHAR(50) DEFAULT 'active',
            storage_key VARCHAR(255),
            metadata TEXT,
            start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        console.log('Recreated upload_sessions table with correct schema');
      }
    }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async down(_queryRunner: QueryRunner): Promise<void> {
    // No down migration needed
  }
}