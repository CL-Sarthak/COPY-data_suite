import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class EnsurePatternFeedbackTable1736639000024 implements MigrationInterface {
  name = 'EnsurePatternFeedbackTable1736639000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if pattern_feedback table exists
    const tableExists = await queryRunner.hasTable('pattern_feedback');
    
    if (!tableExists) {
      console.log('Creating pattern_feedback table...');
      
      // Create the table with snake_case columns
      await queryRunner.createTable(new Table({
        name: 'pattern_feedback',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: queryRunner.connection.options.type === 'postgres' ? 'uuid_generate_v4()' : undefined
          },
          {
            name: 'pattern_id',
            type: 'uuid',
            isNullable: false
          },
          {
            name: 'feedback_type',
            type: 'varchar',
            length: '10',
            isNullable: false
          },
          {
            name: 'context',
            type: 'varchar',
            length: '20',
            isNullable: false
          },
          {
            name: 'matched_text',
            type: 'text',
            isNullable: false
          },
          {
            name: 'surrounding_context',
            type: 'text',
            isNullable: true
          },
          {
            name: 'original_confidence',
            type: 'float',
            isNullable: true
          },
          {
            name: 'user_comment',
            type: 'text',
            isNullable: true
          },
          {
            name: 'data_source_id',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'session_id',
            type: 'uuid',
            isNullable: true
          },
          {
            name: 'user_id',
            type: 'varchar',
            default: "'system'"
          },
          {
            name: 'metadata',
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
        ],
        foreignKeys: [
          {
            columnNames: ['pattern_id'],
            referencedTableName: 'patterns',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE'
          }
        ]
      }), true);
      
      // Create indices
      await queryRunner.createIndex('pattern_feedback', new TableIndex({
        name: 'IDX_pattern_feedback_pattern_id',
        columnNames: ['pattern_id']
      }));
      
      await queryRunner.createIndex('pattern_feedback', new TableIndex({
        name: 'IDX_pattern_feedback_pattern_id_context',
        columnNames: ['pattern_id', 'context']
      }));
      
      await queryRunner.createIndex('pattern_feedback', new TableIndex({
        name: 'IDX_pattern_feedback_created_at',
        columnNames: ['created_at']
      }));
      
      console.log('pattern_feedback table created successfully');
    } else {
      console.log('pattern_feedback table already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pattern_feedback', true);
  }
}