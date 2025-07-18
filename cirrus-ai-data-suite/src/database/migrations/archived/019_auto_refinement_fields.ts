import { QueryRunner } from 'typeorm';

export async function up(queryRunner: QueryRunner): Promise<void> {
  // Add auto-refinement fields to patterns table
  const isPostgres = queryRunner.connection.options.type === 'postgres';
  
  if (isPostgres) {
    // PostgreSQL: Use IF NOT EXISTS
    await queryRunner.query(`
      ALTER TABLE patterns 
      ADD COLUMN IF NOT EXISTS excluded_examples TEXT
    `);

    await queryRunner.query(`
      ALTER TABLE patterns 
      ADD COLUMN IF NOT EXISTS confidence_threshold FLOAT DEFAULT 0.7
    `);

    await queryRunner.query(`
      ALTER TABLE patterns 
      ADD COLUMN IF NOT EXISTS auto_refine_threshold INTEGER DEFAULT 3
    `);
  } else {
    // SQLite: Try to add columns, ignore if they exist
    try {
      await queryRunner.query(`
        ALTER TABLE patterns 
        ADD COLUMN excluded_examples TEXT
      `);
    } catch {
      console.log('Column excluded_examples already exists');
    }

    try {
      await queryRunner.query(`
        ALTER TABLE patterns 
        ADD COLUMN confidence_threshold FLOAT DEFAULT 0.7
      `);
    } catch {
      console.log('Column confidence_threshold already exists');
    }

    try {
      await queryRunner.query(`
        ALTER TABLE patterns 
        ADD COLUMN auto_refine_threshold INTEGER DEFAULT 3
      `);
    } catch {
      console.log('Column auto_refine_threshold already exists');
    }
  }
}

export async function down(queryRunner: QueryRunner): Promise<void> {
  // Remove columns from patterns table
  try {
    await queryRunner.query(`ALTER TABLE patterns DROP COLUMN excluded_examples`);
    await queryRunner.query(`ALTER TABLE patterns DROP COLUMN confidence_threshold`);
    await queryRunner.query(`ALTER TABLE patterns DROP COLUMN auto_refine_threshold`);
  } catch {
    // SQLite doesn't support DROP COLUMN, would need to recreate table
    console.log('Note: Column removal not supported in SQLite');
  }
}