import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddFieldAnnotations055 implements MigrationInterface {
  name = 'AddFieldAnnotations055';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create field_annotations table
    await queryRunner.createTable(
      new Table({
        name: 'field_annotations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()'
          },
          {
            name: 'data_source_id',
            type: 'uuid'
          },
          {
            name: 'field_path',
            type: 'varchar'
          },
          {
            name: 'field_name',
            type: 'varchar'
          },
          {
            name: 'semantic_type',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'business_context',
            type: 'text',
            isNullable: true
          },
          {
            name: 'data_type',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'is_pii',
            type: 'boolean',
            default: false
          },
          {
            name: 'pii_type',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'sensitivity_level',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true
          },
          {
            name: 'is_nullable',
            type: 'boolean',
            default: true
          },
          {
            name: 'is_unique',
            type: 'boolean',
            default: false
          },
          {
            name: 'example_values',
            type: 'jsonb',
            isNullable: true
          },
          {
            name: 'metadata',
            type: 'jsonb',
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
          },
          {
            name: 'created_by',
            type: 'varchar',
            isNullable: true
          },
          {
            name: 'updated_by',
            type: 'varchar',
            isNullable: true
          }
        ],
        foreignKeys: [
          {
            columnNames: ['data_source_id'],
            referencedTableName: 'data_source_entity',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create unique index on data_source_id and field_path  
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_field_annotations_source_path" 
      ON "field_annotations" ("data_source_id", "field_path")
    `);

    // Create field_relationships table
    await queryRunner.createTable(
      new Table({
        name: 'field_relationships',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()'
          },
          {
            name: 'source_field_id',
            type: 'uuid'
          },
          {
            name: 'target_field_id',
            type: 'uuid'
          },
          {
            name: 'relationship_type',
            type: 'varchar'
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true
          },
          {
            name: 'confidence',
            type: 'float',
            default: 1.0
          },
          {
            name: 'is_verified',
            type: 'boolean',
            default: false
          },
          {
            name: 'metadata',
            type: 'jsonb',
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
        ],
        foreignKeys: [
          {
            columnNames: ['source_field_id'],
            referencedTableName: 'field_annotations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          },
          {
            columnNames: ['target_field_id'],
            referencedTableName: 'field_annotations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }),
      true
    );

    // Create unique index on source and target fields
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_field_relationships_source_target" 
      ON "field_relationships" ("source_field_id", "target_field_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('field_relationships');
    await queryRunner.dropTable('field_annotations');
  }
}