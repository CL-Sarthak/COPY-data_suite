import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCatalogFieldSnakeCase1735354800000 implements MigrationInterface {
  name = 'FixCatalogFieldSnakeCase1735354800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'catalog_field'
      );
    `).then(result => result[0].exists);

    if (!tableExists) {
      console.log('catalog_field table does not exist, skipping migration');
      return;
    }

    // Rename camelCase columns to snake_case
    const columnRenames = [
      { from: 'displayName', to: 'display_name' },
      { from: 'dataType', to: 'data_type' },
      { from: 'isRequired', to: 'is_required' },
      { from: 'isStandard', to: 'is_standard' },
      { from: 'validationRules', to: 'validation_rules' },
      { from: 'createdAt', to: 'created_at' },
      { from: 'updatedAt', to: 'updated_at' }
    ];

    for (const { from, to } of columnRenames) {
      try {
        // Check if the camelCase column exists
        const oldColumnExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'catalog_field' 
            AND column_name = '${from}'
          );
        `).then(result => result[0].exists);

        // Check if the snake_case column already exists
        const newColumnExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'catalog_field' 
            AND column_name = '${to}'
          );
        `).then(result => result[0].exists);

        if (oldColumnExists && !newColumnExists) {
          await queryRunner.query(
            `ALTER TABLE catalog_field RENAME COLUMN "${from}" TO "${to}"`
          );
          console.log(`Renamed column ${from} to ${to}`);
        }
      } catch (error) {
        console.log(`Error renaming column ${from} to ${to}:`, error);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert snake_case columns back to camelCase
    const columnRenames = [
      { from: 'display_name', to: 'displayName' },
      { from: 'data_type', to: 'dataType' },
      { from: 'is_required', to: 'isRequired' },
      { from: 'is_standard', to: 'isStandard' },
      { from: 'validation_rules', to: 'validationRules' },
      { from: 'created_at', to: 'createdAt' },
      { from: 'updated_at', to: 'updatedAt' }
    ];

    for (const { from, to } of columnRenames) {
      try {
        const columnExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'catalog_field' 
            AND column_name = '${from}'
          );
        `).then(result => result[0].exists);

        if (columnExists) {
          await queryRunner.query(
            `ALTER TABLE catalog_field RENAME COLUMN "${from}" TO "${to}"`
          );
        }
      } catch (error) {
        console.log(`Error reverting column ${from} to ${to}:`, error);
      }
    }
  }
}