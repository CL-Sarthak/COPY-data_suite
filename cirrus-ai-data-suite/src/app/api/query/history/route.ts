import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

// In-memory storage for query history (in production, this should be stored in database)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const queryHistoryMap = new Map<string, any[]>();

export async function GET() {
  try {
    const userId = 'default-user'; // TODO: Replace with actual user ID when auth is implemented
    const history = queryHistoryMap.get(userId) || [];

    return NextResponse.json({ history });
  } catch (error) {
    logger.error('Failed to get query history:', error);
    return NextResponse.json(
      { error: 'Failed to get query history' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = 'default-user'; // TODO: Replace with actual user ID when auth is implemented
    const body = await request.json();
    const { query, queryId, timestamp } = body;

    if (!query || !queryId) {
      return NextResponse.json(
        { error: 'Query and queryId are required' },
        { status: 400 }
      );
    }

    // Get current history
    const history = queryHistoryMap.get(userId) || [];
    
    // Add new query to history
    history.unshift({
      id: queryId,
      query,
      timestamp: timestamp || new Date().toISOString(),
      isSaved: false
    });

    // Keep only last 50 queries
    const trimmedHistory = history.slice(0, 50);
    queryHistoryMap.set(userId, trimmedHistory);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to save query history:', error);
    return NextResponse.json(
      { error: 'Failed to save query history' },
      { status: 500 }
    );
  }
}