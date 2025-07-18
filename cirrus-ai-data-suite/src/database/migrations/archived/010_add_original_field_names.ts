import { QueryRunner } from 'typeorm';

export const migration010AddOriginalFieldNames = {
  name: 'AddOriginalFieldNames1733673700000',
  
  async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Running migration 010: Adding originalFieldNames column to data_source_entity table');
    
    try {
      // Check if column already exists (handle case sensitivity issues)
      const hasColumn = await queryRunner.hasColumn('data_source_entity', 'originalFieldNames');
      
      if (!hasColumn) {
        // Add originalFieldNames column to store original field names for field mapping
        // Use quotes to preserve case sensitivity in PostgreSQL
        await queryRunner.query(`
          ALTER TABLE data_source_entity 
          ADD COLUMN "originalFieldNames" TEXT DEFAULT NULL
        `);
        console.log('Migration 010 completed: originalFieldNames column added');
      } else {
        console.log('Migration 010 skipped: originalFieldNames column already exists');
      }
    } catch (error) {
      console.error('Migration 010 error:', error);
      // Try without quotes for backwards compatibility
      try {
        await queryRunner.query(`
          ALTER TABLE data_source_entity 
          ADD COLUMN originalFieldNames TEXT DEFAULT NULL
        `);
        console.log('Migration 010 completed: originalFieldNames column added (without quotes)');
      } catch (secondError) {
        console.error('Migration 010 failed completely:', secondError);
        throw error; // Throw original error
      }
    }
  },

  async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Rolling back migration 010: Removing originalFieldNames column');
    
    try {
      // Try to remove the column with quotes first
      await queryRunner.query(`
        ALTER TABLE data_source_entity 
        DROP COLUMN "originalFieldNames"
      `);
      console.log('Migration 010 rollback completed');
    } catch (error) {
      // Try without quotes as fallback
      try {
        await queryRunner.query(`
          ALTER TABLE data_source_entity 
          DROP COLUMN originalFieldNames
        `);
        console.log('Migration 010 rollback completed (without quotes)');
      } catch (secondError) {
        console.error('Migration 010 rollback failed:', secondError);
        throw error; // Throw original error
      }
    }
  }
};