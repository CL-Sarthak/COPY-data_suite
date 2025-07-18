import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyntheticDatasets1733340001000 implements MigrationInterface {
  name = 'SyntheticDatasets1733340001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create synthetic_datasets table for PostgreSQL
    if (queryRunner.connection.options.type === 'postgres') {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "synthetic_datasets" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "name" varchar(255) NOT NULL,
          "description" text,
          "dataType" varchar(100) NOT NULL,
          "schema" jsonb NOT NULL,
          "recordCount" integer NOT NULL DEFAULT 0,
          "configuration" jsonb,
          "status" varchar(50) NOT NULL DEFAULT 'draft',
          "filePath" text,
          "outputFormat" varchar(20) NOT NULL DEFAULT 'json',
          "errorMessage" text,
          "createdAt" timestamp NOT NULL DEFAULT now(),
          "updatedAt" timestamp NOT NULL DEFAULT now()
        )
      `);
    } else {
      // Create synthetic_datasets table for SQLite
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "synthetic_datasets" (
          "id" varchar PRIMARY KEY,
          "name" varchar(255) NOT NULL,
          "description" text,
          "dataType" varchar(100) NOT NULL,
          "schema" text NOT NULL,
          "recordCount" integer NOT NULL DEFAULT 0,
          "configuration" text,
          "status" varchar(50) NOT NULL DEFAULT 'draft',
          "filePath" text,
          "outputFormat" varchar(20) NOT NULL DEFAULT 'json',
          "errorMessage" text,
          "createdAt" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "synthetic_datasets"`);
  }
}