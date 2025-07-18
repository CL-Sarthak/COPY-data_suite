import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddUploadSessions1706000000000 implements MigrationInterface {
  name = 'AddUploadSessions1706000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'upload_sessions',
        columns: [
          {
            name: 'upload_id',
            type: 'varchar',
            isPrimary: true,
          },
          {
            name: 'file_name',
            type: 'varchar',
          },
          {
            name: 'file_size',
            type: 'bigint',
          },
          {
            name: 'mime_type',
            type: 'varchar',
          },
          {
            name: 'chunk_size',
            type: 'integer',
          },
          {
            name: 'total_chunks',
            type: 'integer',
          },
          {
            name: 'uploaded_chunks',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'active'",
          },
          {
            name: 'storage_key',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'start_time',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'last_activity',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('upload_sessions');
  }
}