import { DataSource } from 'typeorm';
import { logger } from '@/utils/logger';

interface MigrationRecord {
  name: string;
  timestamp: number;
}

export class MigrationTracker {
  private static appliedMigrations: Set<string> = new Set();
  
  static async checkAndRunMigration(
    dataSource: DataSource,
    migrationName: string,
    migrationFunction: () => Promise<void>
  ): Promise<boolean> {
    try {
      // Check if dataSource is initialized
      if (!dataSource.isInitialized) {
        logger.warn(`DataSource not initialized for migration ${migrationName}, skipping`);
        return false;
      }

      // Skip if already applied in this session
      if (this.appliedMigrations.has(migrationName)) {
        logger.debug(`Migration ${migrationName} already applied in this session`);
        return true;
      }

      // Ensure migrations table exists
      await this.ensureMigrationsTable(dataSource);
      
      // Check if migration was already run
      const migrationCheck = await dataSource.query(
        dataSource.options.type === 'postgres' 
          ? `SELECT * FROM migrations WHERE name = $1`
          : `SELECT * FROM migrations WHERE name = ?`,
        [migrationName]
      );
      
      if (migrationCheck.length > 0) {
        logger.debug(`Migration ${migrationName} already applied`);
        this.appliedMigrations.add(migrationName);
        return true;
      }
      
      // Run the migration
      logger.info(`Running migration: ${migrationName}`);
      await migrationFunction();
      
      // Record the migration
      await dataSource.query(
        dataSource.options.type === 'postgres'
          ? `INSERT INTO migrations (name, timestamp) VALUES ($1, $2)`
          : `INSERT INTO migrations (name, timestamp) VALUES (?, ?)`,
        [migrationName, Date.now()]
      );
      
      this.appliedMigrations.add(migrationName);
      logger.info(`Migration ${migrationName} completed successfully`);
      return true;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for pool closed error
      if (errorMessage.includes('pool after calling end on the pool')) {
        logger.error(`Migration ${migrationName} failed: Database connection pool is closed. This might happen in serverless environments.`);
      } else {
        logger.error(`Migration ${migrationName} failed:`, error);
      }
      
      // Don't throw the error, just return false
      // This allows the app to continue even if migrations fail
      return false;
    }
  }
  
  static async ensureMigrationsTable(dataSource: DataSource): Promise<void> {
    try {
      // Check if dataSource is initialized
      if (!dataSource.isInitialized) {
        logger.warn('DataSource not initialized in ensureMigrationsTable, skipping');
        return;
      }

      if (dataSource.options.type === 'postgres') {
        // Check if table exists in PostgreSQL
        const tableExists = await dataSource.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'migrations'
          );
        `);
        
        if (!tableExists[0].exists) {
          await dataSource.query(`
            CREATE TABLE migrations (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL UNIQUE,
              timestamp BIGINT NOT NULL
            )
          `);
          logger.info('Created migrations table for PostgreSQL');
        }
      } else {
        // SQLite
        const result = await dataSource.query(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'`
        );
        
        if (result.length === 0) {
          await dataSource.query(`
            CREATE TABLE migrations (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name VARCHAR(255) NOT NULL UNIQUE,
              timestamp INTEGER NOT NULL
            )
          `);
          logger.info('Created migrations table for SQLite');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for pool closed error
      if (errorMessage.includes('pool after calling end on the pool')) {
        logger.warn('Cannot create migrations table: Database connection pool is closed');
      } else {
        logger.error('Error ensuring migrations table:', error);
      }
      
      // Don't throw the error - allow the app to continue
      // This is especially important for serverless environments
    }
  }
  
  static async getMigrationHistory(dataSource: DataSource): Promise<MigrationRecord[]> {
    try {
      await this.ensureMigrationsTable(dataSource);
      const result = await dataSource.query(
        `SELECT name, timestamp FROM migrations ORDER BY timestamp ASC`
      );
      return result as MigrationRecord[];
    } catch (error) {
      logger.debug('Error getting migration history:', error);
      return [];
    }
  }
}