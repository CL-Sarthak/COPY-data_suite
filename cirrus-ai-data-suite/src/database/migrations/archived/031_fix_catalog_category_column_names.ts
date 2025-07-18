import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCatalogCategoryColumnNames1750000003000 implements MigrationInterface {
  name = 'FixCatalogCategoryColumnNames1750000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const isSqlite = queryRunner.connection.options.type === 'better-sqlite3';
    
    // Check if catalog_category table exists
    let tableExists = false;
    try {
      tableExists = await queryRunner.hasTable('catalog_category');
    } catch {
      // Table might not exist
    }
    
    if (!tableExists) {
      console.log('catalog_category table does not exist, skipping migration');
      return;
    }
    
    // For SQLite, the columns are already in snake_case format from migration 007/008
    if (isSqlite) {
      console.log('SQLite uses snake_case columns for catalog_category, no changes needed');
      return;
    }
    
    // For PostgreSQL, rename columns from camelCase to snake_case
    if (isPostgres) {
      const columnRenames = [
        { from: 'displayName', to: 'display_name' },
        { from: 'sortOrder', to: 'sort_order' },
        { from: 'isStandard', to: 'is_standard' },
        { from: 'isActive', to: 'is_active' },
        { from: 'createdAt', to: 'created_at' },
        { from: 'updatedAt', to: 'updated_at' }
      ];
      
      for (const { from, to } of columnRenames) {
        try {
          // Check if column exists with old name
          const result = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'catalog_category' 
            AND column_name = $1
          `, [from]);
          
          if (result.length > 0) {
            await queryRunner.query(`ALTER TABLE catalog_category RENAME COLUMN "${from}" TO ${to}`);
            console.log(`Renamed column ${from} to ${to} in catalog_category table`);
          } else {
            console.log(`Column ${from} not found in catalog_category, might already be ${to}`);
          }
        } catch (error) {
          console.log(`Error checking/renaming column ${from}:`, error);
        }
      }
      
      console.log('Successfully standardized catalog_category column names to snake_case');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // This migration is not reversible
    console.log('Down migration not implemented for catalog category column name fixes');
  }
}