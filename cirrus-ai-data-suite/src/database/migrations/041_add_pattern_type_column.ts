import { QueryRunner } from 'typeorm';

export class AddPatternTypeColumn1750000041000 {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Check if type column already exists
    const columns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patterns' 
      AND column_name = 'type'
    `);
    
    if (columns.length === 0) {
      // Add the type column
      await queryRunner.query(`
        ALTER TABLE patterns 
        ADD COLUMN IF NOT EXISTS type VARCHAR(255) DEFAULT 'CUSTOM'
      `);
      
      // If pattern_type column exists and has data, copy it to type
      const patternTypeExists = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'patterns' 
        AND column_name = 'pattern_type'
      `);
      
      if (patternTypeExists.length > 0) {
        // Copy data from pattern_type to type
        await queryRunner.query(`
          UPDATE patterns 
          SET type = pattern_type 
          WHERE pattern_type IS NOT NULL
        `);
      }
      
      console.log('Added type column to patterns table');
    }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async down(_queryRunner: QueryRunner): Promise<void> {
    // We don't remove the column in down migration as it's needed by the entity
    // This prevents accidental data loss
  }
}