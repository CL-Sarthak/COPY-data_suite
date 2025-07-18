import { } from 'typeorm';
import { 
  RemediationJob, 
  RemediationJobStatus, 
  RemediationAction, 
  RemediationActionStatus,
  CreateRemediationJobRequest
} from '@/types/remediation';
import { RemediationJobEntity } from '@/entities/RemediationJobEntity';
import { RemediationActionEntity } from '@/entities/RemediationActionEntity';
import { FixTemplateEntity } from '@/entities/FixTemplateEntity';
import { RuleExecutionEntity } from '@/entities/RuleExecutionEntity';
import { AutoFixEngine, FixResult, FixContext } from './autoFixEngine';
import { ConfidenceScoringService } from './confidenceScoringService';
import { getDatabase } from '@/database/connection';

/**
 * Remediation Job Service
 * Manages the lifecycle of data quality remediation jobs
 */
export class RemediationJobService {
  private async getRepositories() {
    const db = await getDatabase();
    return {
      jobRepository: db.getRepository(RemediationJobEntity),
      actionRepository: db.getRepository(RemediationActionEntity),
      templateRepository: db.getRepository(FixTemplateEntity),
      ruleExecutionRepository: db.getRepository(RuleExecutionEntity)
    };
  }

  // ==================== JOB MANAGEMENT ====================

  /**
   * Create a new remediation job from rule execution results
   */
  async createJob(request: CreateRemediationJobRequest): Promise<RemediationJob> {
    const { jobRepository, actionRepository } = await this.getRepositories();
    
    const job = new RemediationJobEntity();
    job.id = crypto.randomUUID();
    job.dataSourceId = request.dataSourceId;
    job.ruleExecutionId = request.ruleExecutionId;
    job.name = request.name;
    job.description = request.description;
    job.status = 'pending';
    job.totalViolations = request.violations?.length || 0;
    job.fixedViolations = 0;
    job.manualReviewRequired = 0;
    job.autoFixedCount = 0;
    job.rejectedCount = 0;
    job.skippedCount = 0;
    job.complexity = 'medium';
    job.riskLevel = 'medium';
    job.createdBy = 'system';
    job.metadata = {
      configuration: request.configuration || {
        autoApplyThreshold: 0.9
      }
    };
    job.createdAt = new Date();
    job.updatedAt = new Date();

    // Save the job first
    const savedJob = await jobRepository.save(job);

    // Create remediation actions for each violation
    const actions: RemediationActionEntity[] = [];
    
    for (const violation of request.violations || []) {
      // Generate fix suggestions for this violation
      const context: FixContext = {
        fieldName: violation.fieldName,
        recordId: violation.recordId
      };

      const suggestions = AutoFixEngine.suggestFixMethods(violation.originalValue, context);
      
      for (const suggestion of suggestions) {
        // Apply the fix to get detailed results
        const fixResult = await this.applyFixMethod(
          violation.originalValue, 
          suggestion.method, 
          context
        );

        // Calculate confidence score
        const confidenceResult = ConfidenceScoringService.calculateConfidence(
          fixResult, 
          context
        );

        const action = new RemediationActionEntity();
        action.id = crypto.randomUUID();
        action.jobId = savedJob.id;
        action.violationId = violation.id;
        action.status = 'pending';
        action.originalValue = violation.originalValue ? String(violation.originalValue) : undefined;
        action.suggestedValue = fixResult.fixedValue ? String(fixResult.fixedValue) : undefined;
        action.fixMethod = suggestion.method;
        action.confidence = confidenceResult.finalScore;
        action.riskAssessment = confidenceResult.riskLevel;
        action.metadata = {
          reasoning: confidenceResult.reasoning.join('; '),
          fixResult,
          confidenceFactors: confidenceResult.factors,
          recommendation: confidenceResult.recommendation,
          fieldContext: context
        };
        action.createdAt = new Date();
        action.updatedAt = new Date();

        actions.push(action);
      }
    }

    // Save all actions
    if (actions.length > 0) {
      await actionRepository.save(actions);
    }

    // Update job with action count (no totalActions field in entity)
    await jobRepository.save(savedJob);

    return this.convertToRemediationJob(savedJob);
  }

  /**
   * Get remediation job by ID
   */
  async getJobById(jobId: string): Promise<RemediationJob | null> {
    const { jobRepository } = await this.getRepositories();
    const job = await jobRepository.findOne({
      where: { id: jobId },
      relations: ['actions']
    });

    if (!job) return null;
    return this.convertToRemediationJob(job);
  }

  /**
   * Get all remediation jobs for a data source
   */
  async getJobsByDataSource(dataSourceId: string): Promise<RemediationJob[]> {
    const { jobRepository } = await this.getRepositories();
    const jobs = await jobRepository.find({
      where: { dataSourceId },
      order: { createdAt: 'DESC' },
      relations: ['actions']
    });

    return jobs.map(job => this.convertToRemediationJob(job));
  }

  /**
   * Get remediation jobs with filtering and pagination
   */
  async getJobs(filters: {
    dataSourceId?: string;
    status?: RemediationJobStatus;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ jobs: RemediationJob[]; total: number }> {
    const { jobRepository } = await this.getRepositories();
    const queryBuilder = jobRepository.createQueryBuilder('job')
      .leftJoinAndSelect('job.actions', 'actions')
      .orderBy('job.createdAt', 'DESC');

    if (filters.dataSourceId) {
      queryBuilder.andWhere('job.dataSourceId = :dataSourceId', { 
        dataSourceId: filters.dataSourceId 
      });
    }

    if (filters.status) {
      queryBuilder.andWhere('job.status = :status', { status: filters.status });
    }

    if (filters.limit) {
      queryBuilder.limit(filters.limit);
    }

    if (filters.offset) {
      queryBuilder.offset(filters.offset);
    }

    const [jobs, total] = await queryBuilder.getManyAndCount();

    return {
      jobs: jobs.map(job => this.convertToRemediationJob(job)),
      total
    };
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string, 
    status: RemediationJobStatus,
    metadata?: Record<string, unknown>
  ): Promise<RemediationJob | null> {
    const { jobRepository } = await this.getRepositories();
    const job = await jobRepository.findOne({ where: { id: jobId } });
    if (!job) return null;

    job.status = status;
    job.updatedAt = new Date();

    if (status === 'in_progress') {
      job.startedAt = new Date();
    } else if (status === 'completed' || status === 'failed') {
      job.completedAt = new Date();
    }

    if (metadata) {
      job.metadata = { ...job.metadata, ...metadata };
    }

    const savedJob = await jobRepository.save(job);
    return this.convertToRemediationJob(savedJob);
  }

  /**
   * Start a remediation job
   */
  async startJob(jobId: string): Promise<RemediationJob | null> {
    const { jobRepository } = await this.getRepositories();
    const job = await jobRepository.findOne({
      where: { id: jobId },
      relations: ['actions']
    });

    if (!job || job.status !== 'pending') {
      throw new Error(`Cannot start job ${jobId}: invalid status ${job?.status}`);
    }

    // Update job status to running
    job.status = 'in_progress';
    job.startedAt = new Date();
    job.updatedAt = new Date();
    await jobRepository.save(job);

    // Auto-apply high confidence fixes
    if (job.actions) {
      const actions = Array.isArray(job.actions) ? job.actions : await job.actions; // Handle both eager and lazy loading
      const highConfidenceActions = actions.filter((action: RemediationActionEntity) => 
        action.shouldAutoApply(job.metadata?.configuration?.autoApplyThreshold || 0.9)
      );

      for (const action of highConfidenceActions) {
        await this.applyAction(action.id);
      }
    }

    // Recalculate job progress
    await this.updateJobProgress(jobId);

    return this.convertToRemediationJob(job);
  }

  /**
   * Pause a running remediation job
   */
  async pauseJob(jobId: string): Promise<RemediationJob | null> {
    const { jobRepository } = await this.getRepositories();
    const job = await jobRepository.findOne({ where: { id: jobId } });
    if (!job || job.status !== 'in_progress') {
      throw new Error(`Cannot pause job ${jobId}: invalid status ${job?.status}`);
    }

    job.status = 'paused';
    job.updatedAt = new Date();
    const savedJob = await jobRepository.save(job);

    return this.convertToRemediationJob(savedJob);
  }

  /**
   * Resume a paused remediation job
   */
  async resumeJob(jobId: string): Promise<RemediationJob | null> {
    const { jobRepository } = await this.getRepositories();
    const job = await jobRepository.findOne({ where: { id: jobId } });
    if (!job || job.status !== 'paused') {
      throw new Error(`Cannot resume job ${jobId}: invalid status ${job?.status}`);
    }

    job.status = 'in_progress';
    job.updatedAt = new Date();
    const savedJob = await jobRepository.save(job);

    return this.convertToRemediationJob(savedJob);
  }

  /**
   * Cancel a remediation job
   */
  async cancelJob(jobId: string): Promise<RemediationJob | null> {
    const { jobRepository } = await this.getRepositories();
    const job = await jobRepository.findOne({ where: { id: jobId } });
    if (!job || !['pending', 'running', 'paused'].includes(job.status)) {
      throw new Error(`Cannot cancel job ${jobId}: invalid status ${job?.status}`);
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    job.updatedAt = new Date();
    const savedJob = await jobRepository.save(job);

    return this.convertToRemediationJob(savedJob);
  }

  /**
   * Delete a remediation job
   */
  async deleteJob(jobId: string): Promise<boolean> {
    const { jobRepository, actionRepository } = await this.getRepositories();
    const job = await jobRepository.findOne({ where: { id: jobId } });
    if (!job) return false;

    // Delete all associated actions first
    await actionRepository.delete({ jobId });

    // Delete the job
    await jobRepository.delete({ id: jobId });
    return true;
  }

  // ==================== ACTION MANAGEMENT ====================

  /**
   * Apply a remediation action
   */
  async applyAction(actionId: string): Promise<RemediationAction | null> {
    const { actionRepository } = await this.getRepositories();
    const action = await actionRepository.findOne({ 
      where: { id: actionId },
      relations: ['job']
    });

    if (!action || action.status !== 'pending') {
      throw new Error(`Cannot apply action ${actionId}: invalid status ${action?.status}`);
    }

    try {
      // Apply the fix (in a real implementation, this would update the actual data)
      // For now, we'll simulate the application
      action.status = 'applied';
      action.appliedAt = new Date();
      action.appliedValue = action.suggestedValue;
      action.updatedAt = new Date();

      const savedAction = await actionRepository.save(action);

      // Update job progress
      if (action.job) {
        const job = await action.job; // Resolve lazy-loaded promise
        await this.updateJobProgress(job.id);
      }

      return this.convertToRemediationAction(savedAction);
    } catch (error) {
      // Mark action as failed
      action.status = 'rejected';
      // Store error in metadata since errorMessage doesn't exist
      action.metadata = {
        ...action.metadata,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
      action.updatedAt = new Date();
      await actionRepository.save(action);

      throw error;
    }
  }

  /**
   * Reject a remediation action
   */
  async rejectAction(actionId: string, reason?: string): Promise<RemediationAction | null> {
    const { actionRepository } = await this.getRepositories();
    const action = await actionRepository.findOne({ 
      where: { id: actionId },
      relations: ['job']
    });

    if (!action || action.status !== 'pending') {
      throw new Error(`Cannot reject action ${actionId}: invalid status ${action?.status}`);
    }

    action.status = 'rejected';
    action.metadata = {
      ...action.metadata,
      rejectionReason: reason
    };
    action.updatedAt = new Date();
    const savedAction = await actionRepository.save(action);

    // Update job progress
    // TEMPORARILY DISABLED: if (action.job) {
    //   await this.updateJobProgress((action.job as { id: string }).id);
    // }

    return this.convertToRemediationAction(savedAction);
  }

  /**
   * Get actions for a job
   */
  async getJobActions(
    jobId: string,
    filters: {
      status?: RemediationActionStatus;
      method?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ actions: RemediationAction[]; total: number }> {
    const { actionRepository } = await this.getRepositories();
    const queryBuilder = actionRepository.createQueryBuilder('action')
      .where('action.jobId = :jobId', { jobId })
      .orderBy('action.createdAt', 'ASC');

    if (filters.status) {
      queryBuilder.andWhere('action.status = :status', { status: filters.status });
    }

    if (filters.method) {
      queryBuilder.andWhere('action.fixMethod = :method', { method: filters.method });
    }

    if (filters.limit) {
      queryBuilder.limit(filters.limit);
    }

    if (filters.offset) {
      queryBuilder.offset(filters.offset);
    }

    const [actions, total] = await queryBuilder.getManyAndCount();

    return {
      actions: actions.map(action => this.convertToRemediationAction(action)),
      total
    };
  }

  // ==================== PROGRESS TRACKING ====================

  /**
   * Update job progress based on action statuses
   */
  private async updateJobProgress(jobId: string): Promise<void> {
    const { jobRepository } = await this.getRepositories();
    const job = await jobRepository.findOne({
      where: { id: jobId },
      relations: ['actions']
    });

    if (!job) return;

    if (job.actions) {
      const actions = Array.isArray(job.actions) ? job.actions : await job.actions;
      const actionCounts = actions.reduce((counts: Record<string, number>, action: RemediationActionEntity) => {
        counts[action.status] = (counts[action.status] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      job.fixedViolations = actionCounts.applied || 0;
      job.rejectedCount = actionCounts.rejected || 0;
      job.skippedCount = actionCounts.skipped || 0;
    }
    job.updatedAt = new Date();

    // Check if job is complete
    const totalProcessed = job.fixedViolations + job.rejectedCount + job.skippedCount;
    if (totalProcessed >= job.totalViolations && job.status === 'in_progress') {
      job.status = 'completed';
      job.completedAt = new Date();
    }

    await jobRepository.save(job);
  }

  /**
   * Get job progress summary
   */
  async getJobProgress(jobId: string): Promise<{
    totalViolations: number;
    processedViolations: number;
    progressPercentage: number;
    actionBreakdown: Record<RemediationActionStatus, number>;
    estimatedCompletion?: Date;
  } | null> {
    const { jobRepository } = await this.getRepositories();
    const job = await jobRepository.findOne({
      where: { id: jobId },
      relations: ['actions']
    });

    if (!job) return null;

    let actionBreakdown = {} as Record<string, number>;
    if (job.actions) {
      const actions = Array.isArray(job.actions) ? job.actions : await job.actions;
      actionBreakdown = actions.reduce((breakdown: Record<string, number>, action: RemediationActionEntity) => {
        breakdown[action.status] = (breakdown[action.status] || 0) + 1;
        return breakdown;
      }, {} as Record<string, number>);
    }

    const processedViolations = (actionBreakdown.applied || 0) + 
                               (actionBreakdown.rejected || 0) + 
                               (actionBreakdown.skipped || 0);

    const progressPercentage = job.totalViolations > 0 
      ? Math.round((processedViolations / job.totalViolations) * 100)
      : 0;

    // Estimate completion time based on current processing rate
    let estimatedCompletion: Date | undefined;
    if (job.status === 'in_progress' && job.startedAt && processedViolations > 0) {
      const elapsedMs = Date.now() - job.startedAt.getTime();
      const processingRate = processedViolations / elapsedMs; // violations per ms
      const remainingViolations = job.totalViolations - processedViolations;
      const estimatedRemainingMs = remainingViolations / processingRate;
      estimatedCompletion = new Date(Date.now() + estimatedRemainingMs);
    }

    return {
      totalViolations: job.totalViolations,
      processedViolations,
      progressPercentage,
      actionBreakdown: actionBreakdown as Record<RemediationActionStatus, number>,
      estimatedCompletion
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Apply a fix method to a value
   */
  private async applyFixMethod(
    value: unknown, 
    method: string, 
    context: FixContext
  ): Promise<FixResult> {
    // This is a simplified implementation
    // In a real scenario, you'd have a more sophisticated routing system
    switch (method) {
      case 'trim_whitespace':
        return AutoFixEngine.trimWhitespace(value, context);
      case 'remove_extra_spaces':
        return AutoFixEngine.removeExtraSpaces(value, context);
      case 'standardize_email':
        return AutoFixEngine.standardizeEmail(value, context);
      case 'standardize_phone':
        return AutoFixEngine.standardizePhone(value, {}, context);
      case 'standardize_case':
        return AutoFixEngine.standardizeCase(value, 'title', context);
      case 'standardize_date':
        return AutoFixEngine.standardizeDate(value, 'YYYY-MM-DD', context);
      case 'standardize_country_code':
        return AutoFixEngine.standardizeCountryCode(value, 'iso2', context);
      case 'remove_special_chars':
        return AutoFixEngine.removeSpecialCharacters(value, {}, context);
      case 'validate_range':
        return AutoFixEngine.validateRange(value, 0, 100, 'clamp', context);
      case 'fill_missing_values':
        return AutoFixEngine.fillMissingValues(value, 'default', {}, context);
      default:
        throw new Error(`Unknown fix method: ${method}`);
    }
  }

  /**
   * Convert entity to domain object
   */
  private convertToRemediationJob(entity: RemediationJobEntity): RemediationJob {
    return {
      id: entity.id,
      dataSourceId: entity.dataSourceId,
      ruleExecutionId: entity.ruleExecutionId,
      name: entity.name,
      description: entity.description,
      status: entity.status,
      totalViolations: entity.totalViolations,
      fixedViolations: entity.fixedViolations,
      manualReviewRequired: entity.manualReviewRequired,
      autoFixedCount: entity.autoFixedCount,
      rejectedCount: entity.rejectedCount,
      skippedCount: entity.skippedCount,
      estimatedTimeMinutes: entity.estimatedTimeMinutes,
      actualTimeMinutes: entity.actualTimeMinutes,
      complexity: entity.complexity,
      riskLevel: entity.riskLevel,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      startedAt: entity.startedAt,
      completedAt: entity.completedAt,
      pausedAt: entity.pausedAt,
      createdBy: entity.createdBy,
      assignedTo: entity.assignedTo
    };
  }

  /**
   * Convert action entity to domain object
   */
  private convertToRemediationAction(entity: RemediationActionEntity): RemediationAction {
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
}