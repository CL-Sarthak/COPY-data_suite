/**
 * Migration: Add storage fields to DataSourceEntity
 * Adds storageKeys and storageProvider fields to support external file storage
 */

import { QueryRunner } from 'typeorm';

export async function addStorageFields(queryRunner: QueryRunner): Promise<void> {
  try {
    // Check if we're using SQLite or PostgreSQL
    const dbType = queryRunner.connection.options.type;
    
    if (dbType === 'better-sqlite3') {
      // SQLite migrations
      await queryRunner.query(`
        ALTER TABLE data_source_entity 
        ADD COLUMN storageKeys TEXT DEFAULT NULL
      `);
      
      await queryRunner.query(`
        ALTER TABLE data_source_entity 
        ADD COLUMN storageProvider VARCHAR(255) DEFAULT NULL
      `);
      
      console.log('SQLite: Added storageKeys and storageProvider columns');
      
    } else if (dbType === 'postgres') {
      // PostgreSQL migrations
      await queryRunner.query(`
        ALTER TABLE data_source_entity 
        ADD COLUMN IF NOT EXISTS "storageKeys" TEXT DEFAULT NULL
      `);
      
      await queryRunner.query(`
        ALTER TABLE data_source_entity 
        ADD COLUMN IF NOT EXISTS "storageProvider" VARCHAR(255) DEFAULT NULL
      `);
      
      console.log('PostgreSQL: Added storageKeys and storageProvider columns');
    }
    
    console.log('Migration 006: Storage fields added successfully');
    
  } catch (error: unknown) {
    // Ignore errors if columns already exist
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('duplicate column') || 
        errorMessage.includes('already exists') ||
        errorMessage.includes('SQLITE_ERROR')) {
      console.log('Migration 006: Storage fields already exist, skipping');
      return;
    }
    
    console.error('Migration 006 failed:', error);
    throw error;
  }
}

// This migration is now run via the migration system with a QueryRunner
// No auto-run needed