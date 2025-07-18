import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingColumns1750000005000 implements MigrationInterface {
  name = 'AddMissingColumns1750000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Running migration 033: Adding missing columns...');
    
    try {
      // Add tags column to data_source_entity if it doesn't exist
      const dataSourceTable = await queryRunner.getTable('data_source_entity');
      const hasTagsColumn = dataSourceTable?.columns.some(col => col.name === 'tags');
      
      if (!hasTagsColumn) {
        await queryRunner.query(`
          ALTER TABLE data_source_entity 
          ADD COLUMN tags text
        `);
        console.log('Added tags column to data_source_entity table');
      } else {
        console.log('tags column already exists in data_source_entity table');
      }

      // Add description column to synthetic_datasets if it doesn't exist
      const syntheticTable = await queryRunner.getTable('synthetic_datasets');
      const hasDescriptionColumn = syntheticTable?.columns.some(col => col.name === 'description');
      
      if (!hasDescriptionColumn) {
        await queryRunner.query(`
          ALTER TABLE synthetic_datasets 
          ADD COLUMN description text
        `);
        console.log('Added description column to synthetic_datasets table');
      } else {
        console.log('description column already exists in synthetic_datasets table');
      }

      // Add missing columns to data_source_entity if they don't exist
      const missingDataSourceColumns = [
        { name: 'transformation_applied_at', type: 'timestamp' },
        { name: 'transformation_errors', type: 'text' },
        { name: 'original_field_names', type: 'text' }
      ];

      for (const column of missingDataSourceColumns) {
        const hasColumn = dataSourceTable?.columns.some(col => col.name === column.name);
        
        if (!hasColumn) {
          await queryRunner.query(`
            ALTER TABLE data_source_entity 
            ADD COLUMN ${column.name} ${column.type}
          `);
          console.log(`Added ${column.name} column to data_source_entity table`);
        } else {
          console.log(`${column.name} column already exists in data_source_entity table`);
        }
      }

      console.log('Migration 033 completed: Added missing columns');
    } catch (error) {
      console.error('Migration 033 error:', error);
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Running migration 033 down: Removing added columns...');
    
    try {
      // Remove tags column from data_source_entity
      await queryRunner.query(`
        ALTER TABLE data_source_entity 
        DROP COLUMN IF EXISTS tags
      `);
      console.log('Removed tags column from data_source_entity table');

      // Remove description column from synthetic_datasets
      await queryRunner.query(`
        ALTER TABLE synthetic_datasets 
        DROP COLUMN IF EXISTS description
      `);
      console.log('Removed description column from synthetic_datasets table');

      // Remove the additional data_source_entity columns we added
      const additionalColumns = ['transformation_applied_at', 'transformation_errors', 'original_field_names'];
      
      for (const columnName of additionalColumns) {
        await queryRunner.query(`
          ALTER TABLE data_source_entity 
          DROP COLUMN IF EXISTS ${columnName}
        `);
        console.log(`Removed ${columnName} column from data_source_entity table`);
      }

      console.log('Migration 033 down completed');
    } catch (error) {
      console.error('Migration 033 down error:', error);
      throw error;
    }
  }
}