import { QueryRunner } from 'typeorm';

export class FixPipelineTable1750000039000 {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old pipeline table if it exists
    await queryRunner.query(`DROP TABLE IF EXISTS pipeline`);
    
    // Create the correct pipeline table structure
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
        created_by VARCHAR(255),
        tags TEXT,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS pipeline`);
  }
}