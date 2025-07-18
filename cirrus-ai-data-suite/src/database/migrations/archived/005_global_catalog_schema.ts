import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class GlobalCatalogSchema1735872580000 implements MigrationInterface {
  name = 'GlobalCatalogSchema1735872580000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create catalog_field table
    await queryRunner.createTable(new Table({
      name: 'catalog_field',
      columns: [
        {
          name: 'id',
          type: 'varchar',
          isPrimary: true,
          generationStrategy: 'uuid'
        },
        {
          name: 'name',
          type: 'varchar',
          isUnique: true
        },
        {
          name: 'displayName',
          type: 'varchar'
        },
        {
          name: 'description',
          type: 'text'
        },
        {
          name: 'dataType',
          type: 'varchar'
        },
        {
          name: 'category',
          type: 'varchar'
        },
        {
          name: 'isRequired',
          type: 'boolean',
          default: false
        },
        {
          name: 'isStandard',
          type: 'boolean',
          default: false
        },
        {
          name: 'validationRules',
          type: 'text',
          isNullable: true
        },
        {
          name: 'tags',
          type: 'text'
        },
        {
          name: 'createdAt',
          type: 'datetime',
          default: 'CURRENT_TIMESTAMP'
        },
        {
          name: 'updatedAt',
          type: 'datetime',
          default: 'CURRENT_TIMESTAMP'
        }
      ]
    }));

    // Create indexes for catalog_field
    await queryRunner.createIndex('catalog_field', new TableIndex({
      name: 'IDX_catalog_field_category',
      columnNames: ['category']
    }));
    await queryRunner.createIndex('catalog_field', new TableIndex({
      name: 'IDX_catalog_field_isStandard',
      columnNames: ['isStandard']
    }));

    // Create field_mapping table
    await queryRunner.createTable(new Table({
      name: 'field_mapping',
      columns: [
        {
          name: 'id',
          type: 'varchar',
          isPrimary: true,
          generationStrategy: 'uuid'
        },
        {
          name: 'sourceId',
          type: 'varchar'
        },
        {
          name: 'sourceFieldName',
          type: 'varchar'
        },
        {
          name: 'catalogFieldId',
          type: 'varchar'
        },
        {
          name: 'transformationRule',
          type: 'text',
          isNullable: true
        },
        {
          name: 'confidence',
          type: 'decimal',
          precision: 3,
          scale: 2,
          default: 0.0
        },
        {
          name: 'isManual',
          type: 'boolean',
          default: false
        },
        {
          name: 'isActive',
          type: 'boolean',
          default: true
        },
        {
          name: 'createdAt',
          type: 'datetime',
          default: 'CURRENT_TIMESTAMP'
        },
        {
          name: 'updatedAt',
          type: 'datetime',
          default: 'CURRENT_TIMESTAMP'
        }
      ]
    }));

    // Create indexes for field_mapping
    await queryRunner.createIndex('field_mapping', new TableIndex({
      name: 'IDX_field_mapping_sourceId',
      columnNames: ['sourceId']
    }));
    await queryRunner.createIndex('field_mapping', new TableIndex({
      name: 'IDX_field_mapping_catalogFieldId',
      columnNames: ['catalogFieldId']
    }));
    await queryRunner.createIndex('field_mapping', new TableIndex({
      name: 'IDX_field_mapping_source_field',
      columnNames: ['sourceId', 'sourceFieldName'],
      isUnique: true
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('field_mapping');
    await queryRunner.dropTable('catalog_field');
  }
}