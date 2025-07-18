import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddApiConnections1736307600000 implements MigrationInterface {
  name = 'AddApiConnections1736307600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create api_connections table
    await queryRunner.createTable(
      new Table({
        name: 'api_connections',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255'
          },
          {
            name: 'endpoint',
            type: 'text'
          },
          {
            name: 'method',
            type: 'varchar',
            length: '10',
            default: "'GET'"
          },
          {
            name: 'auth_type',
            type: 'varchar',
            length: '20',
            default: "'none'"
          },
          {
            name: 'auth_config',
            type: 'text',
            isNullable: true
          },
          {
            name: 'headers',
            type: 'text',
            isNullable: true
          },
          {
            name: 'request_body',
            type: 'text',
            isNullable: true
          },
          {
            name: 'pagination_config',
            type: 'text',
            isNullable: true
          },
          {
            name: 'rate_limit',
            type: 'integer',
            isNullable: true
          },
          {
            name: 'timeout',
            type: 'integer',
            isNullable: true
          },
          {
            name: 'retry_count',
            type: 'integer',
            isNullable: true
          },
          {
            name: 'refresh_enabled',
            type: 'boolean',
            default: false
          },
          {
            name: 'refresh_interval',
            type: 'integer',
            isNullable: true
          },
          {
            name: 'last_refresh_at',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'next_refresh_at',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'last_tested_at',
            type: 'timestamp',
            isNullable: true
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'inactive'"
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true
          },
          {
            name: 'response_mapping',
            type: 'text',
            isNullable: true
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      }),
      true
    );

    // Create indexes with correct syntax
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_api_connections_name" ON "api_connections" ("name");
      CREATE INDEX IF NOT EXISTS "IDX_api_connections_status" ON "api_connections" ("status");
      CREATE INDEX IF NOT EXISTS "IDX_api_connections_created_at" ON "api_connections" ("created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_api_connections_created_at";
      DROP INDEX IF EXISTS "IDX_api_connections_status";
      DROP INDEX IF EXISTS "IDX_api_connections_name";
    `);
    
    // Drop table
    await queryRunner.dropTable('api_connections');
  }
}