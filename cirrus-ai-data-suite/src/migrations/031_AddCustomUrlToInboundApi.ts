import { QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddCustomUrlToInboundApi031 {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add custom_url column
    await queryRunner.addColumn(
      'inbound_api_connections',
      new TableColumn({
        name: 'custom_url',
        type: 'varchar',
        length: '255',
        isNullable: true,
        isUnique: true,
        comment: 'Custom URL path for the endpoint (e.g., "customer-data")'
      })
    );

    // Add api_key_header column for header-based authentication
    await queryRunner.addColumn(
      'inbound_api_connections',
      new TableColumn({
        name: 'api_key_header',
        type: 'varchar',
        length: '100',
        isNullable: true,
        default: "'X-API-Key'",
        comment: 'Header name for API key authentication'
      })
    );

    // Add require_api_key column
    await queryRunner.addColumn(
      'inbound_api_connections',
      new TableColumn({
        name: 'require_api_key',
        type: 'boolean',
        default: true,
        comment: 'Whether API key authentication is required'
      })
    );

    // Add index on custom_url for faster lookups
    await queryRunner.createIndex(
      'inbound_api_connections',
      new TableIndex({
        name: 'IDX_inbound_api_custom_url',
        columnNames: ['custom_url']
      })
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('inbound_api_connections', 'IDX_inbound_api_custom_url');
    await queryRunner.dropColumn('inbound_api_connections', 'require_api_key');
    await queryRunner.dropColumn('inbound_api_connections', 'api_key_header');
    await queryRunner.dropColumn('inbound_api_connections', 'custom_url');
  }
}