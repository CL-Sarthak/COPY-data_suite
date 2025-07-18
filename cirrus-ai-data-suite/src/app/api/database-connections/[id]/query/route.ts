import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DatabaseConnectionEntity } from '@/entities/DatabaseConnectionEntity';
import { DatabaseConnection } from '@/types/connector';
import { createConnector } from '@/services/connectors/connectorFactory';
import { getQueryTimeout } from '@/utils/getQueryTimeout';
import { logger } from '@/utils/logger';

interface QueryRequest {
  query: string;
  preview?: boolean;
  params?: unknown[];
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const database = await getDatabase();
    const repository = database.getRepository(DatabaseConnectionEntity);

    const body = await request.json() as QueryRequest;
    const { query, preview = false, params: queryParams } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Basic SQL injection prevention - only allow SELECT queries
    const normalizedQuery = query.trim().toUpperCase();
    if (!normalizedQuery.startsWith('SELECT')) {
      return NextResponse.json(
        { error: 'Only SELECT queries are allowed' },
        { status: 400 }
      );
    }

    // Check for potentially dangerous keywords
    const dangerousKeywords = [
      'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE',
      'EXEC', 'EXECUTE', 'GRANT', 'REVOKE', '--', '/*', '*/', 'XP_', 'SP_'
    ];
    
    for (const keyword of dangerousKeywords) {
      if (normalizedQuery.includes(keyword)) {
        return NextResponse.json(
          { error: `Query contains forbidden keyword: ${keyword}` },
          { status: 400 }
        );
      }
    }

    // Get connection
    const entity = await repository.findOne({
      where: { id }
    });
    
    if (!entity) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }
    
    // Convert entity to connection type
    const connection: DatabaseConnection = {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      host: entity.host,
      port: entity.port,
      database: entity.database,
      username: entity.username,
      password: entity.password || undefined,
      ssl: entity.ssl,
      sslCert: entity.sslCert || undefined,
      additionalOptions: entity.additionalOptions ? JSON.parse(entity.additionalOptions) : undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      lastTestedAt: entity.lastTestedAt || undefined,
      status: entity.status,
      errorMessage: entity.errorMessage || undefined,
      refreshEnabled: entity.refreshEnabled,
      refreshInterval: entity.refreshInterval,
      lastRefreshAt: entity.lastRefreshAt || undefined,
      nextRefreshAt: entity.nextRefreshAt || undefined
    };

    if (connection.status !== 'active') {
      return NextResponse.json(
        { error: 'Connection is not active' },
        { status: 400 }
      );
    }

    // Create connector
    const connector = createConnector(connection);
    
    try {
      await connector.connect();
      
      // Add LIMIT clause if preview mode and not already present
      let finalQuery = query;
      if (preview && !normalizedQuery.includes('LIMIT')) {
        finalQuery = `${query.trim()} LIMIT 100`;
      }

      // Execute query with timeout
      const timeout = getQueryTimeout();
      const startTime = Date.now();
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), timeout);
      });

      const queryPromise = connector.executeQuery(finalQuery, queryParams);
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      const executionTime = Date.now() - startTime;

      // Add execution time to result
      const enhancedResult = {
        ...result,
        executionTime,
        preview
      };

      return NextResponse.json(enhancedResult);
    } finally {
      await connector.disconnect();
    }
  } catch (error) {
    logger.error('Query execution error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Query execution failed';
    
    // Handle specific database errors
    if (errorMessage.includes('timeout')) {
      return NextResponse.json(
        { error: 'Query execution timeout. Please optimize your query or reduce the result set.' },
        { status: 408 }
      );
    }
    
    if (errorMessage.includes('syntax')) {
      return NextResponse.json(
        { error: `SQL syntax error: ${errorMessage}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}