import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInboundApiConnections029 implements MigrationInterface {
  name = 'CreateInboundApiConnections029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inbound_api_connections" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "api_key" varchar(255) NOT NULL UNIQUE,
        "status" varchar(50) NOT NULL DEFAULT 'active',
        "auth_config" jsonb,
        "data_schema" jsonb,
        "transformation_config" jsonb,
        "data_source_id" varchar,
        "request_count" integer NOT NULL DEFAULT 0,
        "last_request_at" timestamp,
        "metadata" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inbound_api_connections" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inbound_api_connections_api_key" 
      ON "inbound_api_connections" ("api_key")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inbound_api_connections_status" 
      ON "inbound_api_connections" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inbound_api_connections_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inbound_api_connections_api_key"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inbound_api_connections"`);
  }
}