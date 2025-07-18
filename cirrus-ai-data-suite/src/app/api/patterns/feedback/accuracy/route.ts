import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { PatternFeedbackService } from '@/services/patternFeedbackService';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    await getDatabase();
    
    const { searchParams } = new URL(request.url);
    const patternId = searchParams.get('patternId');
    
    if (!patternId) {
      return NextResponse.json(
        { error: 'Pattern ID is required' },
        { status: 400 }
      );
    }
    
    const accuracy = await PatternFeedbackService.getPatternAccuracy(patternId);
    
    if (!accuracy) {
      return NextResponse.json(
        { message: 'No accuracy metrics available for this pattern' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(accuracy);
  } catch (error) {
    logger.error('Error fetching pattern accuracy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accuracy metrics' },
      { status: 500 }
    );
  }
}