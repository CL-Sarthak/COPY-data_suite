import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { ApiConnectionEntity } from '@/entities/ApiConnectionEntity';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    const database = await getDatabase();
    const repository = database.getRepository(ApiConnectionEntity);
    
    const connections = await repository.find({
      order: { createdAt: 'DESC' }
    });

    // Convert entities to API response format
    const response = connections.map(entity => ({
      id: entity.id,
      name: entity.name,
      endpoint: entity.endpoint,
      method: entity.method,
      authType: entity.auth_type,
      headers: entity.headers ? JSON.parse(entity.headers) : {},
      refreshEnabled: entity.refresh_enabled,
      refreshInterval: entity.refresh_interval,
      status: entity.status,
      errorMessage: entity.error_message,
      lastTestedAt: entity.last_tested_at,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    }));

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching API connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API connections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      endpoint,
      method = 'GET',
      authType = 'none',
      authConfig,
      headers,
      requestBody,
      paginationConfig,
      rateLimit,
      timeout,
      retryCount,
      refreshEnabled = false,
      refreshInterval,
      responseMapping,
      description
    } = body;

    if (!name || !endpoint) {
      return NextResponse.json(
        { error: 'Name and endpoint are required' },
        { status: 400 }
      );
    }

    const database = await getDatabase();
    const repository = database.getRepository(ApiConnectionEntity);

    const connection = repository.create({
      name,
      endpoint,
      method,
      auth_type: authType,
      auth_config: authConfig ? JSON.stringify(authConfig) : undefined,
      headers: headers ? JSON.stringify(headers) : undefined,
      request_body: requestBody ? JSON.stringify(requestBody) : undefined,
      pagination_config: paginationConfig ? JSON.stringify(paginationConfig) : undefined,
      rate_limit: rateLimit,
      timeout,
      retry_count: retryCount,
      refresh_enabled: refreshEnabled,
      refresh_interval: refreshInterval,
      response_mapping: responseMapping ? JSON.stringify(responseMapping) : undefined,
      description,
      status: 'inactive'
    });

    const saved = await repository.save(connection);

    return NextResponse.json({
      id: saved.id,
      name: saved.name,
      endpoint: saved.endpoint,
      method: saved.method,
      authType: saved.auth_type,
      status: saved.status,
      createdAt: saved.createdAt
    });
  } catch (error) {
    logger.error('Error creating API connection:', error);
    return NextResponse.json(
      { error: 'Failed to create API connection' },
      { status: 500 }
    );
  }
}