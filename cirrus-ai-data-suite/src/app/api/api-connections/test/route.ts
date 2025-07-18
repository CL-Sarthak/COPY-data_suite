import { NextRequest, NextResponse } from 'next/server';
import { createApiConnector } from '@/services/connectors/apiConnectorFactory';
import { ApiConnection } from '@/types/apiConnector';
import { logger } from '@/utils/logger';
import { getDatabase } from '@/database/connection';
import { ApiConnectionEntity } from '@/entities/ApiConnectionEntity';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      endpoint,
      method = 'GET',
      authType = 'none',
      authConfig,
      headers,
      requestBody,
      timeout = 30000,
      retryCount = 3
    } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    // Create a temporary connection object for testing
    const testConnection: ApiConnection = {
      id: id || 'test',
      name: name || 'Test Connection',
      endpoint,
      method,
      authType,
      authConfig,
      headers,
      requestBody,
      timeout,
      retryCount,
      status: 'inactive',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create connector and test
    const connector = createApiConnector(testConnection);
    const result = await connector.testConnection();

    // If test successful and ID provided, update status in database
    if (id && result.success) {
      try {
        const database = await getDatabase();
        const repository = database.getRepository(ApiConnectionEntity);
        
        await repository.update(
          { id },
          {
            status: 'active',
            error_message: undefined,
            last_tested_at: new Date()
          }
        );
      } catch (dbError) {
        logger.error('Failed to update connection status:', dbError);
        // Don't fail the test response, just log the error
      }
    } else if (id && !result.success) {
      try {
        const database = await getDatabase();
        const repository = database.getRepository(ApiConnectionEntity);
        
        await repository.update(
          { id },
          {
            status: 'error',
            error_message: result.error || result.message,
            last_tested_at: new Date()
          }
        );
      } catch (dbError) {
        logger.error('Failed to update connection status:', dbError);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error testing API connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Test failed';
    
    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: errorMessage
    });
  }
}