import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTransformationFields1735871580000 implements MigrationInterface {
  name = 'AddTransformationFields1735871580000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add transformedData column
    await queryRunner.addColumn('data_source_entity', new TableColumn({
      name: 'transformedData',
      type: 'text',
      isNullable: true
    }));

    // Add transformedAt column
    await queryRunner.addColumn('data_source_entity', new TableColumn({
      name: 'transformedAt',
      type: 'datetime',
      isNullable: true
    }));

    // Add originalPath column
    await queryRunner.addColumn('data_source_entity', new TableColumn({
      name: 'originalPath',
      type: 'varchar',
      isNullable: true
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('data_source_entity', 'originalPath');
    await queryRunner.dropColumn('data_source_entity', 'transformedAt');
    await queryRunner.dropColumn('data_source_entity', 'transformedData');
  }
}