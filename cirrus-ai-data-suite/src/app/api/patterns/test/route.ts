import { NextRequest, NextResponse } from 'next/server';
import { PatternService } from '@/services/patternService';

export async function POST(request: NextRequest) {
  try {
    const { pattern, testText } = await request.json();
    
    if (!pattern || !testText) {
      return NextResponse.json({ error: 'Pattern and test text are required' }, { status: 400 });
    }

    const result = await PatternService.testPattern(pattern, testText);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing pattern:', error);
    return NextResponse.json({ error: 'Failed to test pattern' }, { status: 500 });
  }
}