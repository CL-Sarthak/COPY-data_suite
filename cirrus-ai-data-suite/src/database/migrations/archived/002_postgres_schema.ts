import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostgresSchema1733280001000 implements MigrationInterface {
  name = 'PostgresSchema1733280001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if we're running on PostgreSQL
    if (queryRunner.connection.options.type !== 'postgres') {
      return; // Skip for non-PostgreSQL databases
    }

    // Create annotation_session table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "annotation_session" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "description" varchar,
        "patterns" text NOT NULL,
        "trainingFiles" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create processed_file table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "processed_file" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "type" varchar NOT NULL,
        "content" text NOT NULL,
        "sessionId" uuid,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        FOREIGN KEY ("sessionId") REFERENCES "annotation_session" ("id") ON DELETE CASCADE
      )
    `);

    // Create data_source_entity table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "data_source_entity" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "type" varchar NOT NULL,
        "path" varchar,
        "configuration" text NOT NULL,
        "metadata" text,
        "recordCount" integer,
        "tags" text,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create pattern_entity table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pattern_entity" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "type" varchar NOT NULL,
        "category" varchar NOT NULL,
        "regex" varchar NOT NULL DEFAULT '',
        "examples" text NOT NULL,
        "description" varchar NOT NULL,
        "color" varchar NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type !== 'postgres') {
      return;
    }

    await queryRunner.query(`DROP TABLE IF EXISTS "pattern_entity"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "data_source_entity"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "processed_file"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "annotation_session"`);
  }
}