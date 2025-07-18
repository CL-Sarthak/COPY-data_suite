import { getAppDataSource } from '@/database/connection';
import { PatternFeedback, FeedbackType, FeedbackContext } from '@/entities/PatternFeedback';
import { PatternEntity } from '@/entities/PatternEntity';
import { serializeMetadata } from '@/entities/PatternFeedbackHelpers';
import { logger } from '@/utils/logger';

export interface FeedbackData {
  patternId: string;
  feedbackType: FeedbackType;
  context: FeedbackContext;
  matchedText: string;
  surroundingContext?: string;
  originalConfidence?: number;
  userComment?: string;
  dataSourceId?: string;
  sessionId?: string;
  userId?: string;
  metadata?: {
    fieldName?: string;
    recordIndex?: number;
    detectionMethod?: string;
  };
}

export interface PatternAccuracyMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  lastUpdated: Date;
  confidenceThreshold?: number;
  commonFalsePositives?: string[];
  commonFalseNegatives?: string[];
}

export class PatternFeedbackService {
  /**
   * Submit feedback for a pattern match
   */
  static async submitFeedback(feedbackData: FeedbackData): Promise<PatternFeedback> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(feedbackData.patternId)) {
        throw new Error(`Invalid UUID format for pattern ID: ${feedbackData.patternId}`);
      }

      const dataSource = await getAppDataSource();
      const feedbackRepo = dataSource.getRepository(PatternFeedback);
      const patternRepo = dataSource.getRepository(PatternEntity);

      // Create feedback record
      const feedback = feedbackRepo.create({
        ...feedbackData,
        metadata: feedbackData.metadata ? serializeMetadata(feedbackData.metadata) : undefined,
        userId: feedbackData.userId || 'system'
      });

      await feedbackRepo.save(feedback);

      // Update pattern feedback counts
      const pattern = await patternRepo.findOne({ where: { id: feedbackData.patternId } });
      if (pattern) {
        await patternRepo.update(feedbackData.patternId, {
          feedbackCount: pattern.feedbackCount + 1,
          positiveCount: feedbackData.feedbackType === 'positive' ? pattern.positiveCount + 1 : pattern.positiveCount,
          negativeCount: feedbackData.feedbackType === 'negative' ? pattern.negativeCount + 1 : pattern.negativeCount
        });
      }

      // Recalculate accuracy metrics
      await this.updatePatternAccuracy(feedbackData.patternId);

      // Check if we need to auto-refine based on negative feedback
      if (feedbackData.feedbackType === 'negative' && pattern) {
        await this.checkAndApplyAutoRefinement(feedbackData.patternId, feedbackData.matchedText);
      }

      logger.info(`Feedback submitted for pattern ${feedbackData.patternId}:`, {
        type: feedbackData.feedbackType,
        context: feedbackData.context,
        matchedText: feedbackData.matchedText
      });

      return feedback;
    } catch (error) {
      logger.error('Error submitting pattern feedback:', error);
      throw error;
    }
  }

  /**
   * Get feedback history for a pattern
   */
  static async getPatternFeedback(
    patternId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ feedback: PatternFeedback[]; total: number }> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(patternId)) {
        logger.warn(`Invalid UUID format for pattern ID: ${patternId}`);
        return { feedback: [], total: 0 };
      }

      const dataSource = await getAppDataSource();
      const feedbackRepo = dataSource.getRepository(PatternFeedback);

      const [feedback, total] = await feedbackRepo.findAndCount({
        where: { patternId },
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset
      });

      return { feedback, total };
    } catch (error) {
      logger.error('Error fetching pattern feedback:', error);
      throw error;
    }
  }

  /**
   * Update pattern accuracy metrics based on feedback
   */
  static async updatePatternAccuracy(patternId: string): Promise<PatternAccuracyMetrics> {
    try {
      const dataSource = await getAppDataSource();
      const feedbackRepo = dataSource.getRepository(PatternFeedback);
      const patternRepo = dataSource.getRepository(PatternEntity);

      // Get all feedback for the pattern
      const feedback = await feedbackRepo.find({
        where: { patternId }
      });

      const totalFeedback = feedback.length;
      const positiveFeedback = feedback.filter(f => f.feedbackType === 'positive').length;
      const negativeFeedback = feedback.filter(f => f.feedbackType === 'negative').length;

      // Calculate metrics
      const precision = totalFeedback > 0 ? positiveFeedback / totalFeedback : 0;
      const recall = 0.8; // This would need actual false negative data to calculate properly
      const f1Score = precision > 0 && recall > 0 
        ? 2 * (precision * recall) / (precision + recall) 
        : 0;

      // Find common false positives
      const falsePositives = feedback
        .filter(f => f.feedbackType === 'negative')
        .map(f => f.matchedText)
        .filter((text): text is string => text !== undefined && text !== null);
      
      const fpCounts = falsePositives.reduce((acc, text) => {
        acc[text] = (acc[text] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const commonFalsePositives = Object.entries(fpCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([text]) => text);

      const metrics: PatternAccuracyMetrics = {
        precision,
        recall,
        f1Score,
        totalFeedback,
        positiveFeedback,
        negativeFeedback,
        lastUpdated: new Date(),
        commonFalsePositives
      };

      // Update pattern with metrics
      await patternRepo.update(patternId, {
        accuracyMetrics: JSON.stringify(metrics),
        lastRefinedAt: new Date()
      });

      logger.info(`Updated accuracy metrics for pattern ${patternId}:`, metrics);

      return metrics;
    } catch (error) {
      logger.error('Error updating pattern accuracy:', error);
      throw error;
    }
  }

  /**
   * Get pattern accuracy metrics
   */
  static async getPatternAccuracy(patternId: string): Promise<PatternAccuracyMetrics | null> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(patternId)) {
        logger.warn(`Invalid UUID format for pattern ID: ${patternId}`);
        return null;
      }

      const dataSource = await getAppDataSource();
      const patternRepo = dataSource.getRepository(PatternEntity);
      const pattern = await patternRepo.findOne({ where: { id: patternId } });

      if (!pattern || !pattern.accuracyMetrics) {
        return null;
      }

      return JSON.parse(pattern.accuracyMetrics);
    } catch (error) {
      logger.error('Error fetching pattern accuracy:', error);
      return null;
    }
  }

  /**
   * Get patterns that need refinement based on feedback
   */
  static async getPatternsNeedingRefinement(
    threshold: number = 0.7
  ): Promise<Array<{ pattern: PatternEntity; metrics: PatternAccuracyMetrics }>> {
    try {
      const dataSource = await getAppDataSource();
      const patternRepo = dataSource.getRepository(PatternEntity);
      
      // Get all patterns with feedback
      // Get all patterns and filter by feedback count in memory
      const allPatterns = await patternRepo.find();
      const patterns = allPatterns.filter(p => p.feedbackCount > 0);

      const patternsNeedingRefinement = [];

      for (const pattern of patterns) {
        if (pattern.accuracyMetrics) {
          const metrics = JSON.parse(pattern.accuracyMetrics) as PatternAccuracyMetrics;
          
          // Check if pattern needs refinement
          if (metrics.precision < threshold || metrics.f1Score < threshold) {
            patternsNeedingRefinement.push({ pattern, metrics });
          }
        }
      }

      return patternsNeedingRefinement;
    } catch (error) {
      logger.error('Error finding patterns needing refinement:', error);
      return [];
    }
  }

  /**
   * Suggest pattern refinements based on feedback
   */
  static async suggestRefinements(patternId: string): Promise<{
    suggestedRegex?: string;
    excludePatterns?: string[];
    confidenceAdjustment?: number;
    reasoning: string[];
  }> {
    try {
      const dataSource = await getAppDataSource();
      const feedbackRepo = dataSource.getRepository(PatternFeedback);
      const patternRepo = dataSource.getRepository(PatternEntity);

      const pattern = await patternRepo.findOne({ where: { id: patternId } });
      if (!pattern) {
        throw new Error('Pattern not found');
      }

      // Get recent negative feedback
      const negativeFeedback = await feedbackRepo.find({
        where: { 
          patternId,
          feedbackType: 'negative' as FeedbackType
        },
        order: { createdAt: 'DESC' },
        take: 50
      });

      const reasoning: string[] = [];
      const excludePatterns: string[] = [];

      // Analyze false positives
      const fpTexts = negativeFeedback
        .map(f => f.matchedText)
        .filter((text): text is string => text !== undefined && text !== null);
      const fpCounts = fpTexts.reduce((acc, text) => {
        acc[text] = (acc[text] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Find patterns to exclude
      for (const [text, count] of Object.entries(fpCounts)) {
        if (count >= 3) {
          excludePatterns.push(text);
          reasoning.push(`Exclude "${text}" - reported as false positive ${count} times`);
        }
      }

      // Suggest confidence adjustment if many false positives
      let confidenceAdjustment: number | undefined;
      const metrics = pattern.accuracyMetrics ? JSON.parse(pattern.accuracyMetrics) : null;
      
      if (metrics && metrics.precision < 0.7) {
        confidenceAdjustment = 0.1; // Increase confidence threshold
        reasoning.push(`Increase confidence threshold by 10% due to precision of ${(metrics.precision * 100).toFixed(1)}%`);
      }

      // TODO: Implement more sophisticated regex refinement based on false positive patterns

      return {
        excludePatterns: excludePatterns.length > 0 ? excludePatterns : undefined,
        confidenceAdjustment,
        reasoning
      };
    } catch (error) {
      logger.error('Error suggesting refinements:', error);
      throw error;
    }
  }

  /**
   * Apply suggested refinements to a pattern
   */
  static async applyRefinements(
    patternId: string,
    refinements: {
      newRegex?: string;
      excludePatterns?: string[];
      confidenceThreshold?: number;
    }
  ): Promise<PatternEntity> {
    try {
      const dataSource = await getAppDataSource();
      const patternRepo = dataSource.getRepository(PatternEntity);
      const pattern = await patternRepo.findOne({ where: { id: patternId } });
      
      if (!pattern) {
        throw new Error('Pattern not found');
      }

      const updates: Partial<PatternEntity> = {
        lastRefinedAt: new Date()
      };

      // Update regex if provided
      if (refinements.newRegex) {
        updates.regex = refinements.newRegex;
      }

      // Store exclude patterns and confidence in accuracyMetrics
      if (pattern.accuracyMetrics) {
        const metrics = JSON.parse(pattern.accuracyMetrics);
        if (refinements.excludePatterns) {
          metrics.excludePatterns = refinements.excludePatterns;
        }
        if (refinements.confidenceThreshold !== undefined) {
          metrics.confidenceThreshold = refinements.confidenceThreshold;
        }
        updates.accuracyMetrics = JSON.stringify(metrics);
      }

      await patternRepo.update(patternId, updates);

      logger.info(`Applied refinements to pattern ${patternId}:`, refinements);

      return (await patternRepo.findOne({ where: { id: patternId } }))!;
    } catch (error) {
      logger.error('Error applying refinements:', error);
      throw error;
    }
  }

  /**
   * Check and apply auto-refinement based on negative feedback threshold
   */
  static async checkAndApplyAutoRefinement(patternId: string, matchedText: string): Promise<void> {
    try {
      const dataSource = await getAppDataSource();
      const feedbackRepo = dataSource.getRepository(PatternFeedback);
      const patternRepo = dataSource.getRepository(PatternEntity);

      const pattern = await patternRepo.findOne({ where: { id: patternId } });
      if (!pattern) return;

      // Count how many times this exact text has been marked as false positive
      const negativeCount = await feedbackRepo.count({
        where: {
          patternId,
          feedbackType: 'negative' as FeedbackType,
          matchedText
        }
      });

      logger.info(`Checking auto-refinement for pattern ${patternId}: "${matchedText}" has ${negativeCount} negative feedback`);

      // If this text has reached the auto-refine threshold, add it to exclusions
      if (negativeCount >= pattern.autoRefineThreshold) {
        const excludedExamples: string[] = pattern.excludedExamples 
          ? (typeof pattern.excludedExamples === 'string' ? JSON.parse(pattern.excludedExamples) : pattern.excludedExamples) 
          : [];

        // Add to exclusions if not already there
        if (!excludedExamples.includes(matchedText)) {
          excludedExamples.push(matchedText);
          
          await patternRepo.update(patternId, {
            excludedExamples: JSON.stringify(excludedExamples),
            lastRefinedAt: new Date()
          });

          logger.info(`Auto-refined pattern ${patternId}: Added "${matchedText}" to exclusions`);
        }
      }

      // Also check if overall accuracy has dropped below threshold
      const metrics = pattern.accuracyMetrics ? JSON.parse(pattern.accuracyMetrics) : null;
      if (metrics && metrics.precision < 0.5 && pattern.confidenceThreshold < 0.9) {
        // Increase confidence threshold if accuracy is very low
        await patternRepo.update(patternId, {
          confidenceThreshold: Math.min(pattern.confidenceThreshold + 0.1, 0.95)
        });
        
        logger.info(`Auto-refined pattern ${patternId}: Increased confidence threshold to ${pattern.confidenceThreshold + 0.1}`);
      }
    } catch (error) {
      logger.error('Error applying auto-refinement:', error);
    }
  }

  /**
   * Get excluded examples for a pattern
   */
  static async getExcludedExamples(patternId: string): Promise<string[]> {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(patternId)) {
        logger.warn(`Invalid UUID format for pattern ID: ${patternId}`);
        return [];
      }

      const dataSource = await getAppDataSource();
      const patternRepo = dataSource.getRepository(PatternEntity);
      const pattern = await patternRepo.findOne({ where: { id: patternId } });
      
      if (!pattern || !pattern.excludedExamples) {
        return [];
      }

      return typeof pattern.excludedExamples === 'string' ? JSON.parse(pattern.excludedExamples) : pattern.excludedExamples;
    } catch (error) {
      logger.error('Error fetching excluded examples:', error);
      return [];
    }
  }

  /**
   * Get feedback statistics for all patterns
   */
  static async getFeedbackStatistics(): Promise<{
    totalFeedback: number;
    positiveFeedback: number;
    negativeFeedback: number;
    patternStats: Array<{
      patternId: string;
      patternName: string;
      feedbackCount: number;
      positiveCount: number;
      negativeCount: number;
      accuracy: number;
    }>;
  }> {
    try {
      const dataSource = await getAppDataSource();
      const feedbackRepo = dataSource.getRepository(PatternFeedback);
      const patternRepo = dataSource.getRepository(PatternEntity);

      // Get overall statistics
      const totalFeedback = await feedbackRepo.count();
      const positiveFeedback = await feedbackRepo.count({
        where: { feedbackType: 'positive' as FeedbackType }
      });
      const negativeFeedback = totalFeedback - positiveFeedback;

      // Get per-pattern statistics
      // Get all patterns and filter by feedback count in memory
      const allPatterns = await patternRepo.find();
      const patterns = allPatterns.filter(p => p.feedbackCount > 0);

      const patternStats = patterns.map(pattern => ({
        patternId: pattern.id,
        patternName: pattern.name,
        feedbackCount: pattern.feedbackCount,
        positiveCount: pattern.positiveCount,
        negativeCount: pattern.negativeCount,
        accuracy: pattern.feedbackCount > 0 
          ? pattern.positiveCount / pattern.feedbackCount 
          : 0
      }));

      return {
        totalFeedback,
        positiveFeedback,
        negativeFeedback,
        patternStats: patternStats.sort((a, b) => b.feedbackCount - a.feedbackCount)
      };
    } catch (error) {
      logger.error('Error getting feedback statistics:', error);
      throw error;
    }
  }
}