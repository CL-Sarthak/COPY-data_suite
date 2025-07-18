import { getDatabase } from '@/database/connection';
import { QualityRuleEntity } from '@/entities/QualityRuleEntity';
import { RuleExecutionEntity } from '@/entities/RuleExecutionEntity';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import {
  QualityRule,
  RuleExecution,
  CreateRuleRequest,
  UpdateRuleRequest,
  TestRuleRequest,
  TestRuleResponse,
  ExecuteRuleRequest,
  RuleViolation,
  RuleAnalytics
} from '@/types/qualityRules';
import { DataTransformationService } from './dataTransformationService';
import { convertEntityToDataSource } from '@/utils/dataSourceConverter';
import { logger } from '@/utils/logger';

class QualityRulesService {
  /**
   * Create a new quality rule
   */
  async createRule(request: CreateRuleRequest, userId?: string): Promise<QualityRule> {
    const dataSource = await getDatabase();
    const ruleRepository = dataSource.getRepository(QualityRuleEntity);

    const ruleEntity = ruleRepository.create({
      ...request.rule,
      created_by: userId,
      updated_by: userId,
      version: 1,
      config: request.rule.config || {
        enabled: true,
        runOnUpload: false,
        runOnDemand: true,
        stopOnFailure: false
      }
    });

    const savedRule = await ruleRepository.save(ruleEntity);
    return this.entityToQualityRule(savedRule);
  }

  /**
   * Get all quality rules
   */
  async getRules(filters?: {
    status?: string;
    type?: string;
    category?: string;
  }): Promise<QualityRule[]> {
    const dataSource = await getDatabase();
    const ruleRepository = dataSource.getRepository(QualityRuleEntity);

    const query = ruleRepository.createQueryBuilder('rule');

    if (filters?.status) {
      query.andWhere('rule.status = :status', { status: filters.status });
    }
    if (filters?.type) {
      query.andWhere('rule.type = :type', { type: filters.type });
    }
    if (filters?.category) {
      query.andWhere('rule.category = :category', { category: filters.category });
    }

    const rules = await query.orderBy('rule.priority', 'ASC').getMany();
    return rules.map(rule => this.entityToQualityRule(rule));
  }

  /**
   * Get a single rule by ID
   */
  async getRule(ruleId: string): Promise<QualityRule | null> {
    const dataSource = await getDatabase();
    const ruleRepository = dataSource.getRepository(QualityRuleEntity);

    const rule = await ruleRepository.findOne({ where: { id: ruleId } });
    return rule ? this.entityToQualityRule(rule) : null;
  }

  /**
   * Update a quality rule
   */
  async updateRule(ruleId: string, request: UpdateRuleRequest, userId?: string): Promise<QualityRule | null> {
    const dataSource = await getDatabase();
    const ruleRepository = dataSource.getRepository(QualityRuleEntity);

    const existingRule = await ruleRepository.findOne({ where: { id: ruleId } });
    if (!existingRule) {
      return null;
    }

    const updatedRule = ruleRepository.merge(existingRule, {
      ...request.rule,
      updated_by: userId,
      version: existingRule.version + 1
    });

    const savedRule = await ruleRepository.save(updatedRule);
    return this.entityToQualityRule(savedRule);
  }

  /**
   * Delete a quality rule
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    const dataSource = await getDatabase();
    const ruleRepository = dataSource.getRepository(QualityRuleEntity);

    const result = await ruleRepository.delete({ id: ruleId });
    return result.affected ? result.affected > 0 : false;
  }

  /**
   * Test a rule against sample data
   */
  async testRule(request: TestRuleRequest): Promise<TestRuleResponse> {
    const startTime = Date.now();
    let sampleData = request.sampleData || [];

    // If no sample data provided, fetch from data source
    if (!sampleData.length && request.dataSourceId) {
      const dataSource = await getDatabase();
      const dataSourceRepo = dataSource.getRepository(DataSourceEntity);
      const dataSourceEntity = await dataSourceRepo.findOne({ where: { id: request.dataSourceId } });

      if (dataSourceEntity) {
        // Convert entity to DataSource type
        const dataSourceObj = convertEntityToDataSource(dataSourceEntity);
        
        // Get transformed data
        const catalog = await DataTransformationService.transformDataSource(dataSourceObj);
        sampleData = catalog.records.slice(0, request.sampleSize || 100).map(r => r.data);
      }
    }

    const violations: RuleViolation[] = [];
    let passed = 0;
    let failed = 0;

    // Execute rule on each record
    for (let i = 0; i < sampleData.length; i++) {
      const record = sampleData[i];
      const recordViolations = await this.evaluateRuleOnRecord(request.rule, record, i);
      
      if (recordViolations.length > 0) {
        violations.push(...recordViolations);
        failed++;
      } else {
        passed++;
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      results: {
        passed,
        failed,
        violations,
        executionTime
      },
      sampleViolations: violations.slice(0, 10) // First 10 violations
    };
  }

  /**
   * Execute a rule on a data source
   */
  async executeRule(request: ExecuteRuleRequest, userId?: string): Promise<RuleExecution> {
    const startTime = Date.now();
    const dataSource = await getDatabase();
    const ruleRepository = dataSource.getRepository(QualityRuleEntity);
    const executionRepository = dataSource.getRepository(RuleExecutionEntity);
    const dataSourceRepo = dataSource.getRepository(DataSourceEntity);

    // Get rule and data source
    const [rule, dataSourceEntity] = await Promise.all([
      ruleRepository.findOne({ where: { id: request.ruleId } }),
      dataSourceRepo.findOne({ where: { id: request.dataSourceId } })
    ]);

    if (!rule || !dataSourceEntity) {
      throw new Error('Rule or data source not found');
    }

    // Convert entity to DataSource type
    const dataSourceObj = convertEntityToDataSource(dataSourceEntity);

    // Get transformed data
    const catalog = await DataTransformationService.transformDataSource(dataSourceObj);
    const records = catalog.records.map(r => r.data);

    // Apply limit and offset if provided
    const startIndex = request.options?.offset || 0;
    const endIndex = request.options?.limit 
      ? startIndex + request.options.limit 
      : records.length;
    const recordsToProcess = records.slice(startIndex, endIndex);

    let recordsProcessed = 0;
    let recordsPassed = 0;
    let recordsFailed = 0;
    let violationsFound = 0;
    let actionsExecuted = 0;
    const violations: RuleViolation[] = [];

    try {
      // Process each record
      for (let i = 0; i < recordsToProcess.length; i++) {
        const record = recordsToProcess[i];
        const recordViolations = await this.evaluateRuleOnRecord(
          this.entityToQualityRule(rule), 
          record, 
          startIndex + i
        );
        
        recordsProcessed++;
        
        if (recordViolations.length > 0) {
          violations.push(...recordViolations);
          violationsFound += recordViolations.length;
          recordsFailed++;

          // Execute actions if not dry run
          if (!request.options?.dryRun) {
            actionsExecuted += await this.executeRuleActions(
              this.entityToQualityRule(rule),
              recordViolations,
              record
            );
          }

          // Stop if max violations reached
          if (rule.config?.maxViolations && violationsFound >= rule.config.maxViolations) {
            break;
          }
        } else {
          recordsPassed++;
        }

        // Stop on failure if configured
        if (rule.config?.stopOnFailure && recordViolations.length > 0) {
          break;
        }
      }

      // Save execution record
      const execution = executionRepository.create({
        rule_id: rule.id,
        rule_name: rule.name,
        data_source_id: dataSourceEntity.id,
        data_source_name: dataSourceEntity.name,
        duration_ms: Date.now() - startTime,
        status: 'success',
        records_processed: recordsProcessed,
        records_passed: recordsPassed,
        records_failed: recordsFailed,
        violations_found: violationsFound,
        actions_executed: actionsExecuted,
        violations: violations.slice(0, 1000), // Store first 1000 violations
        execution_metadata: {
          dry_run: request.options?.dryRun,
          limit: request.options?.limit,
          offset: request.options?.offset,
          triggered_by: 'manual',
          user_id: userId
        }
      });

      const savedExecution = await executionRepository.save(execution);
      return this.entityToRuleExecution(savedExecution);

    } catch (error) {
      // Save failed execution
      const execution = executionRepository.create({
        rule_id: rule.id,
        rule_name: rule.name,
        data_source_id: dataSourceEntity.id,
        data_source_name: dataSourceEntity.name,
        duration_ms: Date.now() - startTime,
        status: 'failed',
        records_processed: recordsProcessed,
        records_passed: recordsPassed,
        records_failed: recordsFailed,
        violations_found: violationsFound,
        actions_executed: actionsExecuted,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_metadata: {
          dry_run: request.options?.dryRun,
          limit: request.options?.limit,
          offset: request.options?.offset,
          triggered_by: 'manual',
          user_id: userId
        }
      });

      await executionRepository.save(execution);
      throw error;
    }
  }

  /**
   * Get rule execution history
   */
  async getRuleExecutions(filters?: {
    ruleId?: string;
    dataSourceId?: string;
    status?: string;
    limit?: number;
  }): Promise<RuleExecution[]> {
    const dataSource = await getDatabase();
    const executionRepository = dataSource.getRepository(RuleExecutionEntity);

    const query = executionRepository.createQueryBuilder('execution');

    if (filters?.ruleId) {
      query.andWhere('execution.rule_id = :ruleId', { ruleId: filters.ruleId });
    }
    if (filters?.dataSourceId) {
      query.andWhere('execution.data_source_id = :dataSourceId', { dataSourceId: filters.dataSourceId });
    }
    if (filters?.status) {
      query.andWhere('execution.status = :status', { status: filters.status });
    }

    query.orderBy('execution.execution_time', 'DESC');

    if (filters?.limit) {
      query.limit(filters.limit);
    }

    const executions = await query.getMany();
    return executions.map(exec => this.entityToRuleExecution(exec));
  }

  /**
   * Get rule analytics
   */
  async getRuleAnalytics(ruleId: string, days: number = 30): Promise<RuleAnalytics> {
    const dataSource = await getDatabase();
    const executionRepository = dataSource.getRepository(RuleExecutionEntity);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const executions = await executionRepository
      .createQueryBuilder('execution')
      .where('execution.rule_id = :ruleId', { ruleId })
      .andWhere('execution.execution_time >= :startDate', { startDate })
      .andWhere('execution.execution_time <= :endDate', { endDate })
      .orderBy('execution.execution_time', 'ASC')
      .getMany();

    // Calculate metrics
    const metrics = {
      executionCount: executions.length,
      avgExecutionTime: executions.reduce((sum, e) => sum + e.duration_ms, 0) / executions.length || 0,
      totalViolations: executions.reduce((sum, e) => sum + e.violations_found, 0),
      violationRate: 0,
      effectiveness: 0
    };

    const totalRecords = executions.reduce((sum, e) => sum + e.records_processed, 0);
    if (totalRecords > 0) {
      metrics.violationRate = metrics.totalViolations / totalRecords;
      metrics.effectiveness = 1 - metrics.violationRate; // Simple effectiveness score
    }

    // Daily trends
    const trends = executions.map(e => ({
      date: e.execution_time.toISOString(),
      violations: e.violations_found,
      executionTime: e.duration_ms
    }));

    // Top violations (aggregate from stored violations)
    const violationCounts = new Map<string, number>();
    executions.forEach(e => {
      if (e.violations) {
        e.violations.forEach(v => {
          const key = `${v.field}:${v.value}`;
          violationCounts.set(key, (violationCounts.get(key) || 0) + 1);
        });
      }
    });

    const topViolations = Array.from(violationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => {
        const [field, value] = key.split(':');
        return {
          value: { field, value },
          count,
          percentage: (count / metrics.totalViolations) * 100
        };
      });

    return {
      ruleId,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      metrics,
      trends,
      topViolations
    };
  }

  /**
   * Evaluate a rule on a single record
   */
  private async evaluateRuleOnRecord(
    rule: Partial<QualityRule>, 
    record: Record<string, unknown>, 
    recordIndex: number
  ): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];

    if (!rule.conditions) return violations;

    const conditionMet = this.evaluateConditionGroup(rule.conditions, record);

    if (conditionMet && rule.type === 'validation') {
      // For validation rules, meeting the condition means a violation
      violations.push({
        id: `${rule.id || 'test'}-${recordIndex}-${Date.now()}`,
        recordId: recordIndex,
        field: this.getFieldsFromConditions(rule.conditions).join(', '),
        value: JSON.stringify(record),
        condition: this.conditionGroupToString(rule.conditions),
        message: rule.actions?.[0]?.params?.message || `Rule "${rule.name}" violated`,
        severity: rule.actions?.[0]?.params?.severity || 'error',
        lineNumber: recordIndex + 1
      });
    }

    return violations;
  }

  /**
   * Evaluate a condition group
   */
  private evaluateConditionGroup(group: { conditions: unknown[]; operator?: 'AND' | 'OR' }, record: Record<string, unknown>): boolean {
    if (!group.conditions || group.conditions.length === 0) return false;

    const results = group.conditions.map((condition: unknown) => {
      if ((condition as { conditions?: unknown[] }).conditions) {
        // Nested condition group
        return this.evaluateConditionGroup(condition as { conditions: unknown[]; operator?: 'AND' | 'OR' }, record);
      } else {
        // Single condition
        return this.evaluateCondition(condition as { field?: string; operator?: string; value?: unknown; values?: unknown[]; caseSensitive?: boolean }, record);
      }
    });

    return group.operator === 'AND' 
      ? results.every(r => r) 
      : results.some(r => r);
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: { field?: string; operator?: string; value?: unknown; values?: unknown[]; caseSensitive?: boolean }, record: Record<string, unknown>): boolean {
    const fieldValue = record[condition.field || ''];
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not_equals':
        return fieldValue !== conditionValue;
      case 'contains':
        return String(fieldValue).includes(String(conditionValue));
      case 'not_contains':
        return !String(fieldValue).includes(String(conditionValue));
      case 'starts_with':
        return String(fieldValue).startsWith(String(conditionValue));
      case 'ends_with':
        return String(fieldValue).endsWith(String(conditionValue));
      case 'regex_match':
        try {
          const regex = new RegExp(String(conditionValue), condition.caseSensitive ? '' : 'i');
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      case 'greater_or_equal':
        return Number(fieldValue) >= Number(conditionValue);
      case 'less_or_equal':
        return Number(fieldValue) <= Number(conditionValue);
      case 'between':
        const [min, max] = condition.values || [0, 0];
        const numValue = Number(fieldValue);
        return numValue >= Number(min) && numValue <= Number(max);
      case 'in_list':
        return (condition.values || []).includes(fieldValue);
      case 'not_in_list':
        return !(condition.values || []).includes(fieldValue);
      case 'is_null':
        return fieldValue === null || fieldValue === undefined;
      case 'is_not_null':
        return fieldValue !== null && fieldValue !== undefined;
      case 'is_empty':
        return fieldValue === '' || fieldValue === null || fieldValue === undefined;
      case 'is_not_empty':
        return fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
      case 'date_before':
        return new Date(fieldValue as string | number) < new Date(conditionValue as string | number);
      case 'date_after':
        return new Date(fieldValue as string | number) > new Date(conditionValue as string | number);
      case 'date_between':
        const [startDate, endDate] = condition.values || ['', ''];
        const dateValue = new Date(fieldValue as string | number);
        return dateValue >= new Date(startDate as string | number) && dateValue <= new Date(endDate as string | number);
      default:
        return false;
    }
  }

  /**
   * Execute rule actions
   */
  private async executeRuleActions(
    rule: QualityRule,
    violations: RuleViolation[],
    record: Record<string, unknown>
  ): Promise<number> {
    let actionsExecuted = 0;

    for (const action of rule.actions) {
      switch (action.type) {
        case 'flag_violation':
          // Already flagged by creating violation
          actionsExecuted++;
          break;
        case 'log_issue':
          logger.warn(`Quality rule violation: ${rule.name}`, {
            ruleId: rule.id,
            violations: violations.length,
            record
          });
          actionsExecuted++;
          break;
        case 'send_alert':
          // TODO: Implement alert sending
          logger.info(`Alert would be sent to: ${action.params?.alertRecipients?.join(', ')}`);
          actionsExecuted++;
          break;
        // Other action types to be implemented
      }
    }

    return actionsExecuted;
  }

  /**
   * Get fields referenced in conditions
   */
  private getFieldsFromConditions(group: { conditions?: unknown[] }): string[] {
    const fields: string[] = [];

    if (group.conditions) {
      group.conditions.forEach((condition: unknown) => {
        const cond = condition as { conditions?: unknown[]; field?: string };
        if (cond.conditions) {
          fields.push(...this.getFieldsFromConditions(cond));
        } else if (cond.field) {
          fields.push(cond.field);
        }
      });
    }

    return [...new Set(fields)];
  }

  /**
   * Convert condition group to human-readable string
   */
  private conditionGroupToString(group: { conditions?: unknown[]; operator?: string }): string {
    if (!group.conditions) return '';

    const parts = group.conditions.map((condition: unknown) => {
      const cond = condition as { conditions?: unknown[]; field?: string; operator?: string; value?: unknown; values?: unknown[] };
      if (cond.conditions) {
        return `(${this.conditionGroupToString(cond)})`;
      } else {
        return `${cond.field} ${cond.operator} ${cond.value || (cond.values as unknown[])?.join(', ') || ''}`;
      }
    });

    return parts.join(` ${group.operator} `);
  }

  /**
   * Convert entity to QualityRule type
   */
  private entityToQualityRule(entity: QualityRuleEntity): QualityRule {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description || '',
      category: entity.category,
      type: entity.type,
      status: entity.status,
      priority: entity.priority,
      conditions: entity.conditions,
      actions: entity.actions,
      metadata: {
        createdBy: entity.created_by || '',
        createdAt: entity.created_at.toISOString(),
        updatedBy: entity.updated_by,
        updatedAt: entity.updated_at.toISOString(),
        version: entity.version,
        tags: entity.tags
      },
      config: entity.config || {
        enabled: true,
        runOnUpload: false,
        runOnDemand: true,
        stopOnFailure: false
      }
    };
  }

  /**
   * Convert entity to RuleExecution type
   */
  private entityToRuleExecution(entity: RuleExecutionEntity): RuleExecution {
    return {
      id: entity.id,
      ruleId: entity.rule_id,
      ruleName: entity.rule_name,
      dataSourceId: entity.data_source_id,
      dataSourceName: entity.data_source_name,
      executionTime: entity.execution_time.toISOString(),
      duration: entity.duration_ms,
      status: entity.status,
      summary: {
        recordsProcessed: entity.records_processed,
        recordsPassed: entity.records_passed,
        recordsFailed: entity.records_failed,
        violationsFound: entity.violations_found,
        actionsExecuted: entity.actions_executed
      },
      violations: entity.violations,
      error: entity.error_message
    };
  }
}

export const qualityRulesService = new QualityRulesService();