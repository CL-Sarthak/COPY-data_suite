import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1733280000000 implements MigrationInterface {
  name = 'InitialSchema1733280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create annotation_session table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "annotation_session" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar NOT NULL,
        "description" varchar,
        "patterns" text NOT NULL,
        "trainingFiles" text,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create processed_file table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "processed_file" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar NOT NULL,
        "type" varchar NOT NULL,
        "content" text NOT NULL,
        "sessionId" varchar,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY ("sessionId") REFERENCES "annotation_session" ("id") ON DELETE CASCADE
      )
    `);

    // Create data_source_entity table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "data_source_entity" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar NOT NULL,
        "type" varchar NOT NULL,
        "path" varchar,
        "configuration" text NOT NULL,
        "metadata" text,
        "recordCount" integer,
        "tags" text,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create pattern_entity table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pattern_entity" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" varchar NOT NULL,
        "type" varchar NOT NULL,
        "category" varchar NOT NULL,
        "regex" varchar NOT NULL DEFAULT '',
        "examples" text NOT NULL,
        "description" varchar NOT NULL,
        "color" varchar NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pattern_entity"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "data_source_entity"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "processed_file"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "annotation_session"`);
  }
}