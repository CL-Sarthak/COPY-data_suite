import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCatalogFieldColumns1736700000025 implements MigrationInterface {
  name = '025_fix_catalog_field_columns';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    
    // Check if catalog_field table exists
    const tableExists = isPostgres
      ? await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'catalog_field'
          );
        `).then(result => result[0].exists)
      : await queryRunner.query(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='catalog_field'`
        ).then(result => result.length > 0);

    if (!tableExists) {
      console.log('catalog_field table does not exist, skipping migration');
      return;
    }

    if (isPostgres) {
      // PostgreSQL: Rename columns to snake_case
      const columnRenames = [
        ['displayName', 'display_name'],
        ['dataType', 'data_type'],
        ['isRequired', 'is_required'],
        ['isStandard', 'is_standard'],
        ['validationRules', 'validation_rules'],
        ['createdAt', 'created_at'],
        ['updatedAt', 'updated_at']
      ];

      for (const [oldName, newName] of columnRenames) {
        // Check if old column exists
        const oldColumnExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'catalog_field' 
            AND column_name = $1
          );
        `, [oldName]).then(result => result[0].exists);

        // Check if new column already exists
        const newColumnExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'catalog_field' 
            AND column_name = $1
          );
        `, [newName]).then(result => result[0].exists);

        if (oldColumnExists && !newColumnExists) {
          await queryRunner.query(
            `ALTER TABLE catalog_field RENAME COLUMN "${oldName}" TO ${newName}`
          );
        }
      }
    } else {
      // SQLite: Need to recreate table with new column names
      // First, check current table structure
      const tableInfo = await queryRunner.query(`PRAGMA table_info(catalog_field)`);
      const hasOldColumns = tableInfo.some((col: { name: string }) => col.name === 'displayName');

      if (hasOldColumns) {
        // Create temporary table with new column names
        await queryRunner.query(`
          CREATE TABLE catalog_field_temp (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            display_name TEXT NOT NULL,
            description TEXT NOT NULL,
            data_type TEXT NOT NULL,
            category TEXT NOT NULL,
            is_required INTEGER DEFAULT 0,
            is_standard INTEGER DEFAULT 0,
            validation_rules TEXT,
            tags TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Copy data
        await queryRunner.query(`
          INSERT INTO catalog_field_temp (
            id, name, display_name, description, data_type, 
            category, is_required, is_standard, validation_rules, 
            tags, created_at, updated_at
          )
          SELECT 
            id, name, displayName, description, dataType,
            category, isRequired, isStandard, validationRules,
            tags, createdAt, updatedAt
          FROM catalog_field
        `);

        // Drop old table and rename
        await queryRunner.query(`DROP TABLE catalog_field`);
        await queryRunner.query(`ALTER TABLE catalog_field_temp RENAME TO catalog_field`);

        // Recreate indexes
        await queryRunner.query(`CREATE INDEX idx_catalog_field_category ON catalog_field (category)`);
        await queryRunner.query(`CREATE INDEX idx_catalog_field_is_standard ON catalog_field (is_standard)`);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Not implementing down migration as we want to keep snake_case
  }
}