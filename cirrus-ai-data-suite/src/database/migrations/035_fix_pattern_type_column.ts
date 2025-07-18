import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPatternTypeColumn1735823000000 implements MigrationInterface {
  name = 'FixPatternTypeColumn1735823000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if pattern_type column exists and type column doesn't exist
    const hasPatternType = await queryRunner.hasColumn('patterns', 'pattern_type');
    const hasType = await queryRunner.hasColumn('patterns', 'type');
    
    if (hasPatternType && !hasType) {
      console.log('Renaming pattern_type column to type in patterns table');
      await queryRunner.renameColumn('patterns', 'pattern_type', 'type');
    } else if (!hasType) {
      console.log('Adding type column to patterns table');
      await queryRunner.query(`
        ALTER TABLE patterns 
        ADD COLUMN IF NOT EXISTS type VARCHAR(100) NOT NULL DEFAULT 'CUSTOM'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rename back to pattern_type for rollback
    const hasType = await queryRunner.hasColumn('patterns', 'type');
    const hasPatternType = await queryRunner.hasColumn('patterns', 'pattern_type');
    
    if (hasType && !hasPatternType) {
      await queryRunner.renameColumn('patterns', 'type', 'pattern_type');
    }
  }
}