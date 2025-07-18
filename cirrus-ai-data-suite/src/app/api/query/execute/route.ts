import { NextRequest, NextResponse } from 'next/server';
import { QueryExecutionService } from '@/services/queryExecutionService';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, explainMethodology = true } = body;

    logger.info('Received query request:', { query, explainMethodology });

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Execute the query
    const result = await QueryExecutionService.executeQuery(query, explainMethodology);

    logger.info('Query executed successfully:', { queryId: result.id });
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to execute query:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute query' },
      { status: 500 }
    );
  }
}