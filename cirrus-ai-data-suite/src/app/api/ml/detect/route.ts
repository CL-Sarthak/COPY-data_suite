import { NextRequest, NextResponse } from 'next/server';
import { mlPatternService } from '@/services/mlPatternService';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }
    
    // Server-side ML detection with proper environment variables
    const matches = await mlPatternService.detectEntities(text);
    
    return NextResponse.json({
      matches,
      provider: mlPatternService.getConfigStatus().provider,
      configured: mlPatternService.isConfigured()
    });
  } catch (error) {
    console.error('Error in ML detection:', error);
    return NextResponse.json(
      { error: 'Failed to perform ML detection', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}