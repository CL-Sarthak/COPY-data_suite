import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshColumnsToDatabaseConnections1706200000046 implements MigrationInterface {
  name = 'AddRefreshColumnsToDatabaseConnections1706200000046';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if database_connections table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'database_connections'
      )
    `);
    
    if (!tableExists[0].exists) {
      console.log('database_connections table does not exist, skipping migration');
      return;
    }

    // Check which columns already exist
    const columns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'database_connections'
    `);
    
    const existingColumns = columns.map((col: { column_name: string }) => col.column_name);
    console.log('Existing columns in database_connections:', existingColumns);

    // Add missing refresh columns
    if (!existingColumns.includes('refresh_enabled')) {
      console.log('Adding refresh_enabled column');
      await queryRunner.query(`
        ALTER TABLE "database_connections" 
        ADD COLUMN "refresh_enabled" boolean DEFAULT false
      `);
    }

    if (!existingColumns.includes('refresh_interval')) {
      console.log('Adding refresh_interval column');
      await queryRunner.query(`
        ALTER TABLE "database_connections" 
        ADD COLUMN "refresh_interval" integer
      `);
    }

    if (!existingColumns.includes('last_refresh_at')) {
      console.log('Adding last_refresh_at column');
      await queryRunner.query(`
        ALTER TABLE "database_connections" 
        ADD COLUMN "last_refresh_at" timestamp
      `);
    }

    if (!existingColumns.includes('next_refresh_at')) {
      console.log('Adding next_refresh_at column');
      await queryRunner.query(`
        ALTER TABLE "database_connections" 
        ADD COLUMN "next_refresh_at" timestamp
      `);
    }

    // Create refresh index only if columns were added
    try {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_database_connections_refresh" 
        ON "database_connections" ("refresh_enabled", "next_refresh_at")
        WHERE refresh_enabled = true
      `);
      console.log('Created refresh index');
    } catch (error) {
      console.log('Could not create refresh index:', error);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index if it exists
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_database_connections_refresh"`);
    
    // Drop columns if they exist
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'database_connections'
      )
    `);
    
    if (tableExists[0].exists) {
      await queryRunner.query(`ALTER TABLE "database_connections" DROP COLUMN IF EXISTS "next_refresh_at"`);
      await queryRunner.query(`ALTER TABLE "database_connections" DROP COLUMN IF EXISTS "last_refresh_at"`);
      await queryRunner.query(`ALTER TABLE "database_connections" DROP COLUMN IF EXISTS "refresh_interval"`);
      await queryRunner.query(`ALTER TABLE "database_connections" DROP COLUMN IF EXISTS "refresh_enabled"`);
    }
  }
}