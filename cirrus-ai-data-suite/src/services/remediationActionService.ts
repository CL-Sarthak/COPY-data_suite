import { Repository, In } from 'typeorm';
import { 
  RemediationAction, 
  RemediationActionStatus, 
  BulkActionRequest,
  BulkActionResult,
  ActionRollbackRequest,
  ActionRollbackResult,
  ActionFilter
} from '@/types/remediation';
import { RemediationActionEntity } from '@/entities/RemediationActionEntity';
import { RemediationHistoryEntity, RemediationEventType } from '@/entities/RemediationHistoryEntity';
import { RemediationJobEntity } from '@/entities/RemediationJobEntity';
import { getDatabase } from '@/database/connection';

/**
 * Remediation Action Service
 * Advanced management of remediation actions with bulk operations, rollback, and tracking
 */
export class RemediationActionService {
  private async getRepositories() {
    const dataSource = await getDatabase();
    return {
      actionRepository: dataSource.getRepository(RemediationActionEntity),
      historyRepository: dataSource.getRepository(RemediationHistoryEntity),
      jobRepository: dataSource.getRepository(RemediationJobEntity)
    };
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Apply multiple actions in bulk
   */
  async bulkApplyActions(request: BulkActionRequest): Promise<BulkActionResult> {
    const { actionIds, performedBy, reason, batchId } = request;
    const results: { actionId: string; success: boolean; error?: string }[] = [];
    const batchIdInternal = batchId || crypto.randomUUID();

    // Start transaction for bulk operation
    const dataSource = await getDatabase();
    return await dataSource.transaction(async manager => {
      const actionRepo = manager.getRepository(RemediationActionEntity);
      const historyRepo = manager.getRepository(RemediationHistoryEntity);

      // Fetch all actions to validate they can be applied
      const actions = await actionRepo.find({
        where: { id: In(actionIds) },
        relations: ['job']
      });

      const foundActionIds = actions.map(a => a.id);
      const missingActionIds = actionIds.filter(id => !foundActionIds.includes(id));

      // Add missing actions to results
      missingActionIds.forEach(id => {
        results.push({
          actionId: id,
          success: false,
          error: 'Action not found'
        });
      });

      // Process valid actions
      for (const action of actions) {
        try {
          // Validate action can be applied
          if (!action.canBeApplied()) {
            results.push({
              actionId: action.id,
              success: false,
              error: `Action cannot be applied: status is ${action.status}`
            });
            continue;
          }

          // Apply the action
          const oldStatus = action.status;
          action.status = 'applied';
          action.appliedAt = new Date();
          action.appliedValue = action.suggestedValue;
          action.updatedAt = new Date();

          await actionRepo.save(action);

          // Create history entry
          await this.createHistoryEntry(historyRepo, {
            actionId: action.id,
            eventType: 'approved',
            oldStatus,
            newStatus: action.status,
            oldValue: action.originalValue,
            newValue: action.appliedValue,
            performedBy,
            reason,
            metadata: {
              source: 'api',
              batchId: batchIdInternal
            }
          });

          results.push({
            actionId: action.id,
            success: true
          });

        } catch (error) {
          results.push({
            actionId: action.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Update job progress for affected jobs
      const affectedJobIds = [...new Set(actions.map(a => a.jobId))];
      await this.updateJobsProgress(manager, affectedJobIds);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return {
        batchId: batchIdInternal,
        totalRequested: actionIds.length,
        successCount,
        failureCount,
        results,
        message: `Bulk apply completed: ${successCount} succeeded, ${failureCount} failed`
      };
    });
  }

  /**
   * Reject multiple actions in bulk
   */
  async bulkRejectActions(request: BulkActionRequest): Promise<BulkActionResult> {
    const { actionIds, performedBy, reason, batchId } = request;
    const results: { actionId: string; success: boolean; error?: string }[] = [];
    const batchIdInternal = batchId || crypto.randomUUID();

    const dataSource = await getDatabase();
    return await dataSource.transaction(async manager => {
      const actionRepo = manager.getRepository(RemediationActionEntity);
      const historyRepo = manager.getRepository(RemediationHistoryEntity);

      const actions = await actionRepo.find({
        where: { id: In(actionIds) },
        relations: ['job']
      });

      const foundActionIds = actions.map(a => a.id);
      const missingActionIds = actionIds.filter(id => !foundActionIds.includes(id));

      missingActionIds.forEach(id => {
        results.push({
          actionId: id,
          success: false,
          error: 'Action not found'
        });
      });

      for (const action of actions) {
        try {
          if (!action.canBeApplied()) {
            results.push({
              actionId: action.id,
              success: false,
              error: `Action cannot be rejected: status is ${action.status}`
            });
            continue;
          }

          const oldStatus = action.status;
          action.status = 'rejected';
          action.metadata = {
            ...action.metadata,
            rejectionReason: reason
          };
          action.updatedAt = new Date();

          await actionRepo.save(action);

          await this.createHistoryEntry(historyRepo, {
            actionId: action.id,
            eventType: 'rejected',
            oldStatus,
            newStatus: action.status,
            performedBy,
            reason,
            metadata: {
              source: 'api',
              batchId: batchIdInternal
            }
          });

          results.push({
            actionId: action.id,
            success: true
          });

        } catch (error) {
          results.push({
            actionId: action.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const affectedJobIds = [...new Set(actions.map(a => a.jobId))];
      await this.updateJobsProgress(manager, affectedJobIds);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return {
        batchId: batchIdInternal,
        totalRequested: actionIds.length,
        successCount,
        failureCount,
        results,
        message: `Bulk reject completed: ${successCount} succeeded, ${failureCount} failed`
      };
    });
  }

  /**
   * Update status of multiple actions
   */
  async bulkUpdateStatus(
    actionIds: string[], 
    status: RemediationActionStatus,
    performedBy: string,
    reason?: string
  ): Promise<BulkActionResult> {
    const results: { actionId: string; success: boolean; error?: string }[] = [];
    const batchId = crypto.randomUUID();

    const dataSource = await getDatabase();
    return await dataSource.transaction(async manager => {
      const actionRepo = manager.getRepository(RemediationActionEntity);
      const historyRepo = manager.getRepository(RemediationHistoryEntity);

      const actions = await actionRepo.find({
        where: { id: In(actionIds) }
      });

      const foundActionIds = actions.map(a => a.id);
      const missingActionIds = actionIds.filter(id => !foundActionIds.includes(id));

      missingActionIds.forEach(id => {
        results.push({
          actionId: id,
          success: false,
          error: 'Action not found'
        });
      });

      for (const action of actions) {
        try {
          const oldStatus = action.status;
          
          // Validate status transition
          if (!this.isValidStatusTransition(oldStatus, status)) {
            results.push({
              actionId: action.id,
              success: false,
              error: `Invalid status transition from ${oldStatus} to ${status}`
            });
            continue;
          }

          action.status = status;
          action.updatedAt = new Date();

          if (status === 'applied') {
            action.appliedAt = new Date();
            action.appliedValue = action.suggestedValue;
          } else if (status === 'rejected') {
            action.metadata = {
              ...action.metadata,
              rejectionReason: reason
            };
          }

          await actionRepo.save(action);

          await this.createHistoryEntry(historyRepo, {
            actionId: action.id,
            eventType: this.getEventTypeFromStatus(status),
            oldStatus,
            newStatus: status,
            performedBy,
            reason,
            metadata: {
              source: 'api',
              batchId
            }
          });

          results.push({
            actionId: action.id,
            success: true
          });

        } catch (error) {
          results.push({
            actionId: action.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const affectedJobIds = [...new Set(actions.map(a => a.jobId))];
      await this.updateJobsProgress(manager, affectedJobIds);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return {
        batchId,
        totalRequested: actionIds.length,
        successCount,
        failureCount,
        results,
        message: `Bulk status update completed: ${successCount} succeeded, ${failureCount} failed`
      };
    });
  }

  // ==================== ROLLBACK OPERATIONS ====================

  /**
   * Rollback a single applied action
   */
  async rollbackAction(actionId: string, request: ActionRollbackRequest): Promise<ActionRollbackResult> {
    const { performedBy, reason } = request;

    const dataSource = await getDatabase();
    return await dataSource.transaction(async manager => {
      const actionRepo = manager.getRepository(RemediationActionEntity);
      const historyRepo = manager.getRepository(RemediationHistoryEntity);

      const action = await actionRepo.findOne({
        where: { id: actionId },
        relations: ['job']
      });

      if (!action) {
        throw new Error('Action not found');
      }

      if (action.status !== 'applied') {
        throw new Error(`Cannot rollback action with status: ${action.status}`);
      }

      const fixResult = action.metadata?.fixResult as { metadata?: { reversible?: boolean } } | undefined;
      if (!fixResult?.metadata?.reversible) {
        throw new Error('Action is not reversible');
      }

      // Perform rollback
      const oldStatus = action.status;
      const oldValue = action.appliedValue;

      action.status = 'pending';
      action.appliedValue = undefined;
      action.appliedAt = undefined;
      action.updatedAt = new Date();

      await actionRepo.save(action);

      // Create rollback history entry
      await this.createHistoryEntry(historyRepo, {
        actionId: action.id,
        eventType: 'rolled_back',
        oldStatus,
        newStatus: action.status,
        oldValue,
        newValue: action.originalValue,
        performedBy,
        reason,
        metadata: {
          source: 'api',
          rollbackTimestamp: new Date().toISOString()
        }
      });

      // Update job progress
      if (action.job) {
        const job = await action.job; // Resolve lazy-loaded promise
        await this.updateJobsProgress(manager, [job.id]);
      }

      return {
        actionId,
        success: true,
        previousValue: oldValue,
        restoredValue: action.originalValue,
        message: 'Action successfully rolled back'
      };
    });
  }

  /**
   * Rollback multiple actions in bulk
   */
  async bulkRollbackActions(
    actionIds: string[], 
    request: ActionRollbackRequest
  ): Promise<{ results: ActionRollbackResult[]; summary: BulkActionResult }> {
    const { performedBy, reason } = request;
    const results: ActionRollbackResult[] = [];
    const batchId = crypto.randomUUID();

    const dataSource = await getDatabase();
    return await dataSource.transaction(async manager => {
      const actionRepo = manager.getRepository(RemediationActionEntity);
      const historyRepo = manager.getRepository(RemediationHistoryEntity);

      const actions = await actionRepo.find({
        where: { id: In(actionIds) },
        relations: ['job']
      });

      const foundActionIds = actions.map(a => a.id);
      const missingActionIds = actionIds.filter(id => !foundActionIds.includes(id));

      // Handle missing actions
      missingActionIds.forEach(id => {
        results.push({
          actionId: id,
          success: false,
          message: 'Action not found'
        });
      });

      // Process existing actions
      for (const action of actions) {
        try {
          if (action.status !== 'applied') {
            results.push({
              actionId: action.id,
              success: false,
              message: `Cannot rollback action with status: ${action.status}`
            });
            continue;
          }

          const fixResult = action.metadata?.fixResult as { metadata?: { reversible?: boolean } } | undefined;
          if (!fixResult?.metadata?.reversible) {
            results.push({
              actionId: action.id,
              success: false,
              message: 'Action is not reversible'
            });
            continue;
          }

          const oldStatus = action.status;
          const oldValue = action.appliedValue;

          action.status = 'pending';
          action.appliedValue = undefined;
          action.appliedAt = undefined;
          action.updatedAt = new Date();

          await actionRepo.save(action);

          await this.createHistoryEntry(historyRepo, {
            actionId: action.id,
            eventType: 'rolled_back',
            oldStatus,
            newStatus: action.status,
            oldValue,
            newValue: action.originalValue,
            performedBy,
            reason,
            metadata: {
              source: 'api',
              batchId,
              rollbackTimestamp: new Date().toISOString()
            }
          });

          results.push({
            actionId: action.id,
            success: true,
            previousValue: oldValue,
            restoredValue: action.originalValue,
            message: 'Action successfully rolled back'
          });

        } catch (error) {
          results.push({
            actionId: action.id,
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Update job progress for affected jobs
      const affectedJobIds = [...new Set(actions.map(a => a.jobId))];
      await this.updateJobsProgress(manager, affectedJobIds);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      const summary: BulkActionResult = {
        batchId,
        totalRequested: actionIds.length,
        successCount,
        failureCount,
        results: results.map(r => ({
          actionId: r.actionId,
          success: r.success,
          error: r.success ? undefined : r.message
        })),
        message: `Bulk rollback completed: ${successCount} succeeded, ${failureCount} failed`
      };

      return { results, summary };
    });
  }

  // ==================== ACTION TRACKING & STATUS ====================

  /**
   * Get detailed action history
   */
  async getActionHistory(
    actionId: string,
    filters: {
      eventType?: string;
      performedBy?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ history: unknown[]; total: number }> {
    const { historyRepository } = await this.getRepositories();
    const queryBuilder = historyRepository.createQueryBuilder('history')
      .where('history.actionId = :actionId', { actionId })
      .orderBy('history.createdAt', 'DESC');

    if (filters.eventType) {
      queryBuilder.andWhere('history.eventType = :eventType', { 
        eventType: filters.eventType 
      });
    }

    if (filters.performedBy) {
      queryBuilder.andWhere('history.performedBy = :performedBy', { 
        performedBy: filters.performedBy 
      });
    }

    if (filters.limit) {
      queryBuilder.limit(filters.limit);
    }

    if (filters.offset) {
      queryBuilder.offset(filters.offset);
    }

    const [history, total] = await queryBuilder.getManyAndCount();

    return {
      history: history.map(h => this.convertHistoryToResponse(h)),
      total
    };
  }

  /**
   * Get action status timeline
   */
  async getActionStatusTimeline(actionId: string): Promise<{
    actionId: string;
    currentStatus: RemediationActionStatus;
    timeline: Array<{
      status: RemediationActionStatus;
      timestamp: Date;
      performedBy: string;
      duration?: number;
      eventType: string;
    }>;
  }> {
    const { actionRepository, historyRepository } = await this.getRepositories();
    const action = await actionRepository.findOne({
      where: { id: actionId }
    });

    if (!action) {
      throw new Error('Action not found');
    }

    const history = await historyRepository.find({
      where: { actionId },
      order: { createdAt: 'ASC' }
    });

    const timeline: Array<{
      status: RemediationActionStatus;
      timestamp: Date;
      performedBy: string;
      duration?: number;
      eventType: string;
    }> = [];
    let previousTimestamp: Date | null = null;

    for (const entry of history) {
      const duration = previousTimestamp 
        ? entry.createdAt.getTime() - previousTimestamp.getTime()
        : undefined;

      timeline.push({
        status: (entry.newStatus || entry.oldStatus) as RemediationActionStatus,
        timestamp: entry.createdAt,
        performedBy: entry.performedBy,
        duration,
        eventType: entry.eventType
      });

      previousTimestamp = entry.createdAt;
    }

    return {
      actionId,
      currentStatus: action.status,
      timeline
    };
  }

  /**
   * Get actions by filter with advanced querying
   */
  async getActionsByFilter(filter: ActionFilter): Promise<{
    actions: RemediationAction[];
    total: number;
    summary: {
      statusBreakdown: Record<RemediationActionStatus, number>;
      confidenceStats: {
        average: number;
        high: number;
        medium: number;
        low: number;
      };
    };
  }> {
    const { actionRepository } = await this.getRepositories();
    const queryBuilder = actionRepository.createQueryBuilder('action')
      .leftJoinAndSelect('action.job', 'job')
      .orderBy('action.createdAt', 'DESC');

    // Apply filters
    if (filter.jobId) {
      queryBuilder.andWhere('action.jobId = :jobId', { jobId: filter.jobId });
    }

    if (filter.status) {
      if (Array.isArray(filter.status)) {
        queryBuilder.andWhere('action.status IN (:...statuses)', { 
          statuses: filter.status 
        });
      } else {
        queryBuilder.andWhere('action.status = :status', { status: filter.status });
      }
    }

    if (filter.fixMethod) {
      if (Array.isArray(filter.fixMethod)) {
        queryBuilder.andWhere('action.fixMethod IN (:...methods)', { 
          methods: filter.fixMethod 
        });
      } else {
        queryBuilder.andWhere('action.fixMethod = :method', { method: filter.fixMethod });
      }
    }

    if (filter.confidenceRange) {
      queryBuilder.andWhere('action.confidence >= :minConfidence', { 
        minConfidence: filter.confidenceRange.min 
      });
      queryBuilder.andWhere('action.confidence <= :maxConfidence', { 
        maxConfidence: filter.confidenceRange.max 
      });
    }

    if (filter.riskLevel) {
      if (Array.isArray(filter.riskLevel)) {
        queryBuilder.andWhere('action.riskAssessment IN (:...risks)', { 
          risks: filter.riskLevel 
        });
      } else {
        queryBuilder.andWhere('action.riskAssessment = :risk', { risk: filter.riskLevel });
      }
    }

    if (filter.dateRange) {
      if (filter.dateRange.start) {
        queryBuilder.andWhere('action.createdAt >= :startDate', { 
          startDate: filter.dateRange.start 
        });
      }
      if (filter.dateRange.end) {
        queryBuilder.andWhere('action.createdAt <= :endDate', { 
          endDate: filter.dateRange.end 
        });
      }
    }

    // Pagination
    if (filter.limit) {
      queryBuilder.limit(filter.limit);
    }

    if (filter.offset) {
      queryBuilder.offset(filter.offset);
    }

    const [actions, total] = await queryBuilder.getManyAndCount();

    // Calculate summary statistics
    const statusBreakdown = actions.reduce((breakdown, action) => {
      breakdown[action.status] = (breakdown[action.status] || 0) + 1;
      return breakdown;
    }, {} as Record<RemediationActionStatus, number>);

    const confidences = actions.map(a => a.confidence).filter(c => c !== undefined);
    const averageConfidence = confidences.length > 0 
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length 
      : 0;

    const confidenceStats = {
      average: Math.round(averageConfidence * 1000) / 1000,
      high: confidences.filter(c => c >= 0.8).length,
      medium: confidences.filter(c => c >= 0.5 && c < 0.8).length,
      low: confidences.filter(c => c < 0.5).length
    };

    return {
      actions: actions.map(action => this.convertActionToResponse(action)),
      total,
      summary: {
        statusBreakdown,
        confidenceStats
      }
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Create history entry
   */
  private async createHistoryEntry(
    historyRepo: Repository<RemediationHistoryEntity>,
    data: {
      actionId: string;
      eventType: string;
      oldStatus?: RemediationActionStatus;
      newStatus?: RemediationActionStatus;
      oldValue?: unknown;
      newValue?: unknown;
      performedBy: string;
      reason?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<RemediationHistoryEntity> {
    const history = new RemediationHistoryEntity();
    history.id = crypto.randomUUID();
    history.actionId = data.actionId;
    history.eventType = data.eventType as RemediationEventType;
    history.oldStatus = data.oldStatus;
    history.newStatus = data.newStatus;
    history.oldValue = data.oldValue ? String(data.oldValue) : undefined;
    history.newValue = data.newValue ? String(data.newValue) : undefined;
    history.performedBy = data.performedBy;
    history.reason = data.reason;
    history.metadata = data.metadata || {};
    history.createdAt = new Date();

    return await historyRepo.save(history);
  }

  /**
   * Update progress for multiple jobs
   */
  private async updateJobsProgress(
    manager: unknown,
    jobIds: string[]
  ): Promise<void> {
    const jobRepo = (manager as { getRepository: (entity: unknown) => Repository<RemediationJobEntity> }).getRepository(RemediationJobEntity);
    const actionRepo = (manager as { getRepository: (entity: unknown) => Repository<RemediationActionEntity> }).getRepository(RemediationActionEntity);

    for (const jobId of jobIds) {
      const job = await jobRepo.findOne({ where: { id: jobId } });
      if (!job) continue;

      const actions = await actionRepo.find({ where: { jobId } });
      
      const actionCounts = actions.reduce((counts, action) => {
        counts[action.status] = (counts[action.status] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      job.fixedViolations = actionCounts.applied || 0;
      job.rejectedCount = actionCounts.rejected || 0;
      job.skippedCount = actionCounts.skipped || 0;
      job.updatedAt = new Date();

      // Check if job is complete
      const totalProcessed = job.fixedViolations + job.rejectedCount + job.skippedCount;
      if (totalProcessed >= job.totalViolations && job.status === 'in_progress') {
        job.status = 'completed';
        job.completedAt = new Date();
      }

      await jobRepo.save(job);
    }
  }

  /**
   * Validate status transition
   */
  private isValidStatusTransition(
    from: RemediationActionStatus, 
    to: RemediationActionStatus
  ): boolean {
    const validTransitions: Record<RemediationActionStatus, RemediationActionStatus[]> = {
      'pending': ['applied', 'rejected', 'requires_review', 'skipped'],
      'requires_review': ['applied', 'rejected', 'skipped'],
      'applied': ['pending'], // Only for rollback
      'rejected': ['pending'], // Only for retry
      'skipped': ['pending'] // Only for retry
    };

    return validTransitions[from]?.includes(to) || false;
  }

  /**
   * Get event type from status
   */
  private getEventTypeFromStatus(status: RemediationActionStatus): string {
    switch (status) {
      case 'applied': return 'approved';
      case 'rejected': return 'rejected';
      case 'requires_review': return 'reviewed';
      case 'skipped': return 'skipped';
      default: return 'started';
    }
  }

  /**
   * Convert action entity to response
   */
  private convertActionToResponse(entity: RemediationActionEntity): RemediationAction {
    return {
      id: entity.id,
      jobId: entity.jobId,
      violationId: entity.violationId,
      recordId: entity.recordId,
      fieldName: entity.fieldName,
      actionType: entity.actionType,
      status: entity.status,
      originalValue: entity.originalValue,
      suggestedValue: entity.suggestedValue,
      appliedValue: entity.appliedValue,
      fixMethod: entity.fixMethod,
      confidence: entity.confidence || 0,
      riskAssessment: entity.riskAssessment,
      reviewedBy: entity.reviewedBy,
      reviewedAt: entity.reviewedAt,
      rollbackData: entity.rollbackData,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      appliedAt: entity.appliedAt
    };
  }

  /**
   * Convert history entity to response
   */
  private convertHistoryToResponse(entity: RemediationHistoryEntity): unknown {
    return {
      id: entity.id,
      actionId: entity.actionId,
      eventType: entity.eventType,
      oldStatus: entity.oldStatus,
      newStatus: entity.newStatus,
      oldValue: entity.oldValue,
      newValue: entity.newValue,
      performedBy: entity.performedBy,
      reason: entity.reason,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      description: entity.getChangeDescription(),
      isUserAction: entity.isUserAction(),
      isSystemAction: entity.isSystemAction(),
      duration: entity.getDurationMs(),
      source: entity.getSource()
    };
  }
}