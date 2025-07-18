import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

// In-memory storage for saved queries (in production, this should be stored in database)
const savedQueriesMap = new Map<string, Set<string>>();

export async function POST(request: NextRequest) {
  try {
    const userId = 'default-user'; // TODO: Replace with actual user ID when auth is implemented
    const body = await request.json();
    const { queryId, action } = body;

    if (!queryId || !action) {
      return NextResponse.json(
        { error: 'QueryId and action are required' },
        { status: 400 }
      );
    }

    // Get or create saved queries set for user
    let savedQueries = savedQueriesMap.get(userId);
    if (!savedQueries) {
      savedQueries = new Set<string>();
      savedQueriesMap.set(userId, savedQueries);
    }

    if (action === 'save') {
      savedQueries.add(queryId);
    } else if (action === 'unsave') {
      savedQueries.delete(queryId);
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "save" or "unsave"' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to save query:', error);
    return NextResponse.json(
      { error: 'Failed to save query' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const userId = 'default-user'; // TODO: Replace with actual user ID when auth is implemented
    const savedQueries = savedQueriesMap.get(userId) || new Set<string>();

    return NextResponse.json({ savedQueries: Array.from(savedQueries) });
  } catch (error) {
    logger.error('Failed to get saved queries:', error);
    return NextResponse.json(
      { error: 'Failed to get saved queries' },
      { status: 500 }
    );
  }
}