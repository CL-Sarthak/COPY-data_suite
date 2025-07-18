import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddDataQualityTables1736500000000 implements MigrationInterface {
  name = 'AddDataQualityTables1736500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create quality_rules table
    await queryRunner.createTable(
      new Table({
        name: 'quality_rules',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: false,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'rule_type',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'conditions',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'actions',
            type: 'jsonb',
            isNullable: false,
            default: "'[]'",
          },
          {
            name: 'severity',
            type: 'varchar',
            isNullable: false,
            default: "'medium'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create rule_executions table
    await queryRunner.createTable(
      new Table({
        name: 'rule_executions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: false,
          },
          {
            name: 'rule_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'data_source_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'total_records',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'violations_found',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'execution_time_ms',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'violations',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create remediation_jobs table
    await queryRunner.createTable(
      new Table({
        name: 'remediation_jobs',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: false,
          },
          {
            name: 'data_source_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'rule_execution_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'total_violations',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'fixed_violations',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'rejected_count',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'skipped_count',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'total_actions',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'auto_apply_threshold',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: false,
            default: 0.9,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create remediation_actions table
    await queryRunner.createTable(
      new Table({
        name: 'remediation_actions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: false,
          },
          {
            name: 'job_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'violation_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'original_value',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'suggested_value',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'applied_value',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'fix_method',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'confidence',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'reasoning',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'risk_assessment',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'applied_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Create remediation_history table
    await queryRunner.createTable(
      new Table({
        name: 'remediation_history',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: false,
          },
          {
            name: 'action_id',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'event_type',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'old_status',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'new_status',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'old_value',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'new_value',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'performed_by',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create fix_templates table
    await queryRunner.createTable(
      new Table({
        name: 'fix_templates',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: false,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'fix_method',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'parameters',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'applicable_field_types',
            type: 'text[]',
            isNullable: true,
          },
          {
            name: 'confidence_threshold',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: false,
            default: 0.7,
          },
          {
            name: 'usage_count',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'success_rate',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'is_system_template',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'cloned_from',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create data_quality_templates table
    await queryRunner.createTable(
      new Table({
        name: 'data_quality_templates',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: false,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'template_type',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'category',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'method_name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'parameters',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'configuration',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'applicable_data_types',
            type: 'text[]',
            isNullable: true,
          },
          {
            name: 'applicable_field_patterns',
            type: 'text[]',
            isNullable: true,
          },
          {
            name: 'confidence_threshold',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: false,
            default: 0.8,
          },
          {
            name: 'priority',
            type: 'integer',
            isNullable: false,
            default: 50,
          },
          {
            name: 'is_system_template',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'usage_count',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'success_rate',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'varchar',
            isNullable: false,
            default: "'system'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex('rule_executions', new TableIndex({
      name: 'IDX_rule_executions_rule_id',
      columnNames: ['rule_id'],
    }));

    await queryRunner.createIndex('rule_executions', new TableIndex({
      name: 'IDX_rule_executions_data_source_id',
      columnNames: ['data_source_id'],
    }));

    await queryRunner.createIndex('remediation_actions', new TableIndex({
      name: 'IDX_remediation_actions_job_id',
      columnNames: ['job_id'],
    }));

    await queryRunner.createIndex('remediation_history', new TableIndex({
      name: 'IDX_remediation_history_action_id',
      columnNames: ['action_id'],
    }));

    await queryRunner.createIndex('fix_templates', new TableIndex({
      name: 'IDX_fix_templates_category',
      columnNames: ['category'],
    }));

    await queryRunner.createIndex('data_quality_templates', new TableIndex({
      name: 'IDX_data_quality_templates_category',
      columnNames: ['category'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('data_quality_templates', 'IDX_data_quality_templates_category');
    await queryRunner.dropIndex('fix_templates', 'IDX_fix_templates_category');
    await queryRunner.dropIndex('remediation_history', 'IDX_remediation_history_action_id');
    await queryRunner.dropIndex('remediation_actions', 'IDX_remediation_actions_job_id');
    await queryRunner.dropIndex('rule_executions', 'IDX_rule_executions_data_source_id');
    await queryRunner.dropIndex('rule_executions', 'IDX_rule_executions_rule_id');

    // Drop tables
    await queryRunner.dropTable('data_quality_templates');
    await queryRunner.dropTable('fix_templates');
    await queryRunner.dropTable('remediation_history');
    await queryRunner.dropTable('remediation_actions');
    await queryRunner.dropTable('remediation_jobs');
    await queryRunner.dropTable('rule_executions');
    await queryRunner.dropTable('quality_rules');
  }
}