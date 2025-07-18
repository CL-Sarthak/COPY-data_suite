import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDatabaseConnections1706200000040 implements MigrationInterface {
  name = 'AddDatabaseConnections1706200000040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create database_connections table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "database_connections" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar NOT NULL,
        "type" varchar NOT NULL,
        "host" varchar NOT NULL,
        "port" integer NOT NULL,
        "database" varchar NOT NULL,
        "username" varchar NOT NULL,
        "password" varchar,
        "ssl" boolean DEFAULT false,
        "ssl_cert" text,
        "additional_options" text,
        "status" varchar DEFAULT 'inactive',
        "error_message" text,
        "last_tested_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        "created_by" varchar,
        "tags" text,
        "description" text,
        "refresh_enabled" boolean DEFAULT false,
        "refresh_interval" integer,
        "last_refresh_at" timestamp,
        "next_refresh_at" timestamp
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_database_connections_status" 
      ON "database_connections" ("status")
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_database_connections_type" 
      ON "database_connections" ("type")
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_database_connections_refresh" 
      ON "database_connections" ("refresh_enabled", "next_refresh_at")
      WHERE refresh_enabled = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_database_connections_refresh"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_database_connections_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_database_connections_status"`);
    
    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "database_connections"`);
  }
}