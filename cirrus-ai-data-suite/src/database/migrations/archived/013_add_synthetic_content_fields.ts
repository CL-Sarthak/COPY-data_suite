import { DataSource } from 'typeorm';

export async function runMigration013(dataSource: DataSource): Promise<void> {
  console.log('Running migration 013: Adding synthetic content fields for production storage...');
  
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  
  try {
    // Check if table exists
    const tableExists = await queryRunner.hasTable('synthetic_datasets');
    
    if (tableExists) {
      // Check if columns already exist to avoid errors
      const table = await queryRunner.getTable('synthetic_datasets');
      const hasGeneratedContent = table?.columns.some(col => col.name === 'generatedContent' || col.name === 'generatedcontent');
      const hasGeneratedContentSize = table?.columns.some(col => col.name === 'generatedContentSize' || col.name === 'generatedcontentsize');
      
      if (!hasGeneratedContent) {
        // Use lowercase for PostgreSQL compatibility
        await queryRunner.query(`
          ALTER TABLE synthetic_datasets 
          ADD COLUMN generatedcontent TEXT
        `);
        console.log('Added generatedcontent column');
      }
      
      if (!hasGeneratedContentSize) {
        // Use lowercase for PostgreSQL compatibility
        await queryRunner.query(`
          ALTER TABLE synthetic_datasets 
          ADD COLUMN generatedcontentsize INTEGER
        `);
        console.log('Added generatedcontentsize column');
      }
      
      console.log('Migration 013 completed: Synthetic content fields added');
    } else {
      console.log('Migration 013 skipped: synthetic_datasets table does not exist');
    }
  } catch (error) {
    console.error('Migration 013 error:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}