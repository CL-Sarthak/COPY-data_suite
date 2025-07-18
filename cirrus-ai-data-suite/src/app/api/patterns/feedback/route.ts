import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { PatternFeedbackService } from '@/services/patternFeedbackService';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    await getDatabase();
    
    const feedbackData = await request.json();
    
    // Validate required fields
    if (!feedbackData.patternId || !feedbackData.feedbackType || !feedbackData.matchedText) {
      return NextResponse.json(
        { error: 'Missing required fields: patternId, feedbackType, matchedText' },
        { status: 400 }
      );
    }

    // Submit feedback
    const feedback = await PatternFeedbackService.submitFeedback({
      ...feedbackData,
      context: feedbackData.context || 'annotation'
    });

    return NextResponse.json({
      success: true,
      feedback,
      message: `Feedback submitted successfully`
    });
  } catch (error) {
    logger.error('Error submitting pattern feedback:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await getDatabase();
    
    const { searchParams } = new URL(request.url);
    const patternId = searchParams.get('patternId');
    
    if (!patternId) {
      // Get overall statistics
      const stats = await PatternFeedbackService.getFeedbackStatistics();
      return NextResponse.json(stats);
    }
    
    // Get feedback for specific pattern
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const result = await PatternFeedbackService.getPatternFeedback(patternId, limit, offset);
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error fetching pattern feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}