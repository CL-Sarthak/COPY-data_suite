import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { PatternFeedbackService } from '@/services/patternFeedbackService';
import { PatternLearningService } from '@/services/patternLearningService';
import { PatternEntity } from '@/entities/PatternEntity';
import { PatternFeedback } from '@/entities/PatternFeedback';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const AppDataSource = await getDatabase();
    
    const { searchParams } = new URL(request.url);
    const patternId = searchParams.get('patternId');
    const threshold = parseFloat(searchParams.get('threshold') || '0.7');
    
    if (patternId) {
      // Get pattern and its feedback for advanced analysis
      const patternRepo = AppDataSource.getRepository(PatternEntity);
      const feedbackRepo = AppDataSource.getRepository(PatternFeedback);
      
      const pattern = await patternRepo.findOne({ where: { id: patternId } });
      if (!pattern) {
        return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
      }
      
      // Get all feedback for this pattern
      const feedback = await feedbackRepo.find({
        where: { patternId },
        order: { createdAt: 'DESC' }
      });
      
      // Analyze feedback patterns
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const feedbackData = feedback.map((f: any) => ({
        matchedText: f.matchedText,
        context: f.surroundingContext || '',
        feedbackType: f.feedbackType,
        reason: f.userComment // Use userComment as reason if available
      }));
      
      const analysis = PatternLearningService.analyzeFeedbackPatterns(feedbackData);
      
      // Generate refinement suggestions
      const suggestions = PatternLearningService.generateRefinementSuggestions(
        {
          regex: pattern.regex,
          examples: JSON.parse(pattern.examples || '[]'),
          type: pattern.type
        },
        analysis
      );
      
      // Calculate accuracy
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const positiveFeedback = feedback.filter((f: any) => f.feedbackType === 'positive').length;
      const totalFeedback = feedback.length;
      const accuracy = totalFeedback > 0 ? positiveFeedback / totalFeedback : 1;
      
      return NextResponse.json({
        suggestions,
        accuracy,
        feedbackCount: totalFeedback,
        analysis,
        pattern: {
          id: pattern.id,
          name: pattern.name,
          regex: pattern.regex
        }
      });
    } else {
      // Get all patterns needing refinement
      const patterns = await PatternFeedbackService.getPatternsNeedingRefinement(threshold);
      return NextResponse.json({ patterns, threshold });
    }
  } catch (error) {
    logger.error('Error fetching refinement suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch refinement suggestions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const AppDataSource = await getDatabase();
    
    const { patternId, refinements } = await request.json();
    
    if (!patternId || !refinements) {
      return NextResponse.json(
        { error: 'Pattern ID and refinements are required' },
        { status: 400 }
      );
    }
    
    // Get the current pattern
    const patternRepo = AppDataSource.getRepository(PatternEntity);
    const pattern = await patternRepo.findOne({ where: { id: patternId } });
    
    if (!pattern) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
    }
    
    // Apply refinements using the learning service
    const refined = PatternLearningService.applyRefinements(
      {
        id: pattern.id,
        regex: pattern.regex,
        examples: JSON.parse(pattern.examples || '[]'),
        type: pattern.type,
        excludedExamples: pattern.excludedExamples ? JSON.parse(pattern.excludedExamples) : [],
        confidenceThreshold: pattern.confidenceThreshold
      },
      refinements
    );
    
    // Update the pattern in the database
    await patternRepo.update(patternId, {
      regex: refined.regex || pattern.regex,
      excludedExamples: refined.excludePatterns ? JSON.stringify(refined.excludePatterns) : pattern.excludedExamples,
      confidenceThreshold: refined.confidenceThreshold || pattern.confidenceThreshold,
      lastRefinedAt: new Date()
    });
    
    // Update accuracy metrics if needed
    await PatternFeedbackService.updatePatternAccuracy(patternId);
    
    return NextResponse.json({
      success: true,
      pattern: await patternRepo.findOne({ where: { id: patternId } }),
      message: 'Refinements applied successfully'
    });
  } catch (error) {
    logger.error('Error applying refinements:', error);
    return NextResponse.json(
      { error: 'Failed to apply refinements' },
      { status: 500 }
    );
  }
}