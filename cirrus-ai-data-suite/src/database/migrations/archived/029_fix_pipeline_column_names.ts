import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPipelineColumnNames1750000001000 implements MigrationInterface {
  name = 'FixPipelineColumnNames1750000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const isSqlite = queryRunner.connection.options.type === 'better-sqlite3';
    
    // Check if pipeline table exists
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
    } else if (isSqlite) {
      const result = await queryRunner.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='pipeline'
      `);
      tableExists = result.length > 0;
    }
    
    if (!tableExists) {
      console.log('Pipeline table does not exist, skipping migration');
      return;
    }
    
    // For SQLite, we need to check if columns already have correct names
    if (isSqlite) {
      try {
        const result = await queryRunner.query(`PRAGMA table_info(pipeline)`);
        const columns = result.map((col: { name: string }) => col.name);
        if (columns.includes('created_at')) {
          console.log('Migration 029 already applied - snake_case columns exist');
          return;
        }
      } catch {
        // Table might not exist yet
      }
      
      // SQLite requires recreating the table to rename columns
      console.log('Recreating pipeline table for SQLite with correct column names');
      
      // Create temporary table with correct column names
      await queryRunner.query(`
        CREATE TABLE pipeline_temp (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          nodes TEXT,
          edges TEXT,
          triggers TEXT,
          schedule TEXT,
          status VARCHAR(50) DEFAULT 'draft',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(255) NOT NULL,
          tags TEXT,
          version INTEGER DEFAULT 1
        )
      `);
      
      // Copy data from old table to new table
      await queryRunner.query(`
        INSERT INTO pipeline_temp (id, name, description, nodes, edges, triggers, schedule, status, created_at, updated_at, created_by, tags, version)
        SELECT id, name, description, nodes, edges, triggers, schedule, status, 
               COALESCE(createdAt, created_at, CURRENT_TIMESTAMP),
               COALESCE(updatedAt, updated_at, CURRENT_TIMESTAMP),
               COALESCE(createdBy, created_by, 'system'),
               tags, version
        FROM pipeline
      `);
      
      // Drop old table and rename new table
      await queryRunner.query(`DROP TABLE pipeline`);
      await queryRunner.query(`ALTER TABLE pipeline_temp RENAME TO pipeline`);
      
      console.log('Successfully recreated pipeline table with snake_case columns');
      return;
    }
    
    // For PostgreSQL, rename columns if they exist with wrong names
    if (isPostgres) {
      const columnRenames = [
        { from: 'createdAt', to: 'created_at' },
        { from: 'updatedAt', to: 'updated_at' },
        { from: 'createdBy', to: 'created_by' }
      ];
      
      for (const { from, to } of columnRenames) {
        try {
          // Check if column exists with old name
          const result = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'pipeline' 
            AND column_name = $1
          `, [from]);
          
          if (result.length > 0) {
            await queryRunner.query(`ALTER TABLE pipeline RENAME COLUMN "${from}" TO ${to}`);
            console.log(`Renamed column ${from} to ${to} in pipeline table`);
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
    console.log('Down migration not implemented for pipeline column name fixes');
  }
}