import { QueryRunner } from 'typeorm';

export class FixMissingColumns1750000006000 {
  name = 'FixMissingColumns1750000006000';
  
  async up(queryRunner: QueryRunner): Promise<void> {
  // Add name column to catalog_field if it doesn't exist
  try {
    // Check if we have the old schema
    const hasFieldName = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'catalog_field' 
      AND column_name = 'field_name'
    `);
    
    if (hasFieldName.length > 0) {
      console.log('Migrating catalog_field from old schema to new schema...');
      
      // Drop the table and recreate with correct schema
      await queryRunner.query(`DROP TABLE IF EXISTS catalog_field CASCADE`);
      
      // Create with new schema matching the entity
      await queryRunner.query(`
        CREATE TABLE catalog_field (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) UNIQUE NOT NULL,
          display_name VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          data_type VARCHAR(50) NOT NULL,
          category VARCHAR(100) NOT NULL,
          is_required BOOLEAN DEFAULT false,
          is_standard BOOLEAN DEFAULT false,
          validation_rules TEXT,
          tags TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('Recreated catalog_field table with correct schema');
    }
  } catch (error) {
    console.log('Could not fix catalog_field schema:', error);
  }

  // Add sort_order column to catalog_category if it doesn't exist
  try {
    const hasSortOrder = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'catalog_category' 
      AND column_name = 'sort_order'
    `);
    
    if (hasSortOrder.length === 0) {
      await queryRunner.query(`
        ALTER TABLE catalog_category 
        ADD COLUMN sort_order INTEGER DEFAULT 999
      `);
      console.log('Added sort_order column to catalog_category table');
    }
  } catch (error) {
    console.log('Could not add sort_order column:', error);
  }

  // Ensure schema column in synthetic_datasets is nullable
  try {
    await queryRunner.query(`
      ALTER TABLE synthetic_datasets 
      ALTER COLUMN schema DROP NOT NULL
    `);
    console.log('Made schema column nullable in synthetic_datasets table');
  } catch (error) {
    console.log('Could not alter schema column:', error);
  }

  // Fix pipeline table to match entity expectations
  try {
    // Check if we have the old schema
    const hasConfiguration = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pipeline' 
      AND column_name = 'configuration'
    `);
    
    if (hasConfiguration.length > 0) {
      console.log('Migrating pipeline from old schema to new schema...');
      
      // Drop the old table and recreate with correct schema
      await queryRunner.query(`DROP TABLE IF EXISTS pipeline CASCADE`);
      
      // Create with new schema matching the entity
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
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(255) NOT NULL,
          tags TEXT,
          version INTEGER DEFAULT 1
        )
      `);
      
      console.log('Recreated pipeline table with correct schema');
    }
  } catch (error) {
    console.log('Could not fix pipeline schema:', error);
  }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async down(_queryRunner: QueryRunner): Promise<void> {
    // Revert changes if needed
  }
}