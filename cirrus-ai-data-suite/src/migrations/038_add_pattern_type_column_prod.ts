import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatternTypeColumnProd1735790600000 implements MigrationInterface {
  name = 'AddPatternTypeColumnProd1735790600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First check if we have pattern_type column
    const columns = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patterns' 
      AND column_name IN ('type', 'pattern_type')
    `);
    
    const hasType = columns.some((col: { column_name: string }) => col.column_name === 'type');
    const hasPatternType = columns.some((col: { column_name: string }) => col.column_name === 'pattern_type');
    
    if (!hasType && !hasPatternType) {
      // Neither column exists, create type column
      await queryRunner.query(`
        ALTER TABLE "patterns" 
        ADD COLUMN "type" VARCHAR NOT NULL DEFAULT 'CUSTOM'
      `);
      console.log('Added type column to patterns table');
    } else if (hasPatternType && !hasType) {
      // pattern_type exists but not type, rename it
      await queryRunner.query(`
        ALTER TABLE "patterns" 
        RENAME COLUMN "pattern_type" TO "type"
      `);
      console.log('Renamed pattern_type to type in patterns table');
    }
    // If type already exists, do nothing
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No down migration - we want to keep the type column
  }
}