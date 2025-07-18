import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDataModeToInboundApi030 implements MigrationInterface {
  name = 'AddDataModeToInboundApi030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "inbound_api_connections" 
      ADD COLUMN IF NOT EXISTS "data_mode" varchar(50) NOT NULL DEFAULT 'append'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "inbound_api_connections" 
      DROP COLUMN IF EXISTS "data_mode"
    `);
  }
}