import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { RefinedPatternService } from '@/services/refinedPatternService';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    await getDatabase();
    
    const patternId = request.nextUrl.searchParams.get('patternId');
    
    if (patternId) {
      // Get single refined pattern
      const refinedPattern = await RefinedPatternService.getRefinedPattern(patternId);
      return NextResponse.json(refinedPattern);
    } else {
      // Get all refined patterns
      const refinedPatterns = await RefinedPatternService.getAllRefinedPatterns();
      return NextResponse.json(refinedPatterns);
    }
  } catch (error) {
    logger.error('Error fetching refined patterns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch refined patterns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getDatabase();
    
    const { content, patterns } = await request.json();
    
    if (!content || !patterns) {
      return NextResponse.json(
        { error: 'Content and patterns are required' },
        { status: 400 }
      );
    }
    
    // Find matches using refined patterns
    const matches = await RefinedPatternService.findMatches(content, patterns);
    
    return NextResponse.json({ matches });
  } catch (error) {
    logger.error('Error finding refined matches:', error);
    return NextResponse.json(
      { error: 'Failed to find matches' },
      { status: 500 }
    );
  }
}