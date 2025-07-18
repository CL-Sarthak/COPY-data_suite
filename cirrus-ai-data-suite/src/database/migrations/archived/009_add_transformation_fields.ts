import { DataSource } from 'typeorm';

export async function runMigration009(dataSource: DataSource): Promise<void> {
  console.log('Running migration 009: Adding transformation fields to data_source_entity...');
  
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  
  try {
    // Check if columns already exist (handle case sensitivity for PostgreSQL)
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    let hasTransformationStatus = false;
    
    try {
      hasTransformationStatus = await queryRunner.hasColumn('data_source_entity', 'transformationStatus');
    } catch {
      // Fallback: check manually for PostgreSQL case sensitivity issues
      if (isPostgres) {
        const result = await queryRunner.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'data_source_entity' 
          AND column_name IN ('transformationStatus', 'transformationstatus')
        `);
        hasTransformationStatus = result.length > 0;
      }
      // Ignore error if no alternative fallback is available
    }
    
    if (!hasTransformationStatus) {
      // Add transformation status tracking fields with error handling
      const timestampType = isPostgres ? 'TIMESTAMP' : 'DATETIME';
      
      try {
        await queryRunner.query(`
          ALTER TABLE data_source_entity 
          ADD COLUMN transformationStatus TEXT DEFAULT 'not_started'
        `);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('already exists')) {
          throw error;
        }
        console.log('transformationStatus column already exists, continuing...');
      }
      
      try {
        await queryRunner.query(`
          ALTER TABLE data_source_entity 
          ADD COLUMN transformationAppliedAt ${timestampType}
        `);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('already exists')) {
          throw error;
        }
        console.log('transformationAppliedAt column already exists, continuing...');
      }
      
      try {
        await queryRunner.query(`
          ALTER TABLE data_source_entity 
          ADD COLUMN transformationErrors TEXT
        `);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('already exists')) {
          throw error;
        }
        console.log('transformationErrors column already exists, continuing...');
      }

      console.log('Migration 009 completed: Added transformation fields');
    } else {
      console.log('Migration 009 skipped: Transformation fields already exist');
    }
  } catch (error) {
    console.error('Transformation fields migration warning:', error);
    // Don't throw the error if it's just about columns already existing
    if (error instanceof Error && error.message && !error.message.includes('already exists')) {
      throw error;
    }
  } finally {
    await queryRunner.release();
  }
}