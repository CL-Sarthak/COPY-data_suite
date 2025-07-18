import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { ApiConnectionEntity } from '@/entities/ApiConnectionEntity';
import { logger } from '@/utils/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const database = await getDatabase();
    const repository = database.getRepository(ApiConnectionEntity);
    
    const connection = await repository.findOne({
      where: { id }
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'API connection not found' },
        { status: 404 }
      );
    }

    const response = {
      id: connection.id,
      name: connection.name,
      endpoint: connection.endpoint,
      method: connection.method,
      authType: connection.auth_type,
      authConfig: connection.auth_config ? JSON.parse(connection.auth_config) : undefined,
      headers: connection.headers ? JSON.parse(connection.headers) : {},
      requestBody: connection.request_body ? JSON.parse(connection.request_body) : undefined,
      paginationConfig: connection.pagination_config ? JSON.parse(connection.pagination_config) : undefined,
      rateLimit: connection.rate_limit,
      timeout: connection.timeout,
      retryCount: connection.retry_count,
      refreshEnabled: connection.refresh_enabled,
      refreshInterval: connection.refresh_interval,
      lastRefreshAt: connection.last_refresh_at,
      nextRefreshAt: connection.next_refresh_at,
      status: connection.status,
      errorMessage: connection.error_message,
      responseMapping: connection.response_mapping ? JSON.parse(connection.response_mapping) : undefined,
      description: connection.description,
      tags: connection.tags ? JSON.parse(connection.tags) : [],
      lastTestedAt: connection.last_tested_at,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching API connection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API connection' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const database = await getDatabase();
    const repository = database.getRepository(ApiConnectionEntity);
    
    const connection = await repository.findOne({
      where: { id }
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'API connection not found' },
        { status: 404 }
      );
    }

    // Update fields if provided
    if (body.name !== undefined) connection.name = body.name;
    if (body.endpoint !== undefined) connection.endpoint = body.endpoint;
    if (body.method !== undefined) connection.method = body.method;
    if (body.authType !== undefined) connection.auth_type = body.authType;
    if (body.authConfig !== undefined) {
      connection.auth_config = body.authConfig ? JSON.stringify(body.authConfig) : undefined;
    }
    if (body.headers !== undefined) {
      connection.headers = body.headers ? JSON.stringify(body.headers) : undefined;
    }
    if (body.requestBody !== undefined) {
      connection.request_body = body.requestBody ? JSON.stringify(body.requestBody) : undefined;
    }
    if (body.paginationConfig !== undefined) {
      connection.pagination_config = body.paginationConfig ? JSON.stringify(body.paginationConfig) : undefined;
    }
    if (body.rateLimit !== undefined) connection.rate_limit = body.rateLimit;
    if (body.timeout !== undefined) connection.timeout = body.timeout;
    if (body.retryCount !== undefined) connection.retry_count = body.retryCount;
    if (body.refreshEnabled !== undefined) connection.refresh_enabled = body.refreshEnabled;
    if (body.refreshInterval !== undefined) connection.refresh_interval = body.refreshInterval;
    
    // Update next refresh time if refresh settings changed
    if (body.refreshEnabled && (body.refreshInterval || connection.refresh_interval)) {
      connection.next_refresh_at = new Date(Date.now() + (body.refreshInterval || connection.refresh_interval) * 60000);
    } else if (body.refreshEnabled === false) {
      connection.next_refresh_at = undefined;
    }
    if (body.responseMapping !== undefined) {
      connection.response_mapping = body.responseMapping ? JSON.stringify(body.responseMapping) : undefined;
    }
    if (body.description !== undefined) connection.description = body.description;
    if (body.tags !== undefined) {
      connection.tags = body.tags ? JSON.stringify(body.tags) : undefined;
    }

    const saved = await repository.save(connection);

    return NextResponse.json({
      id: saved.id,
      name: saved.name,
      endpoint: saved.endpoint,
      method: saved.method,
      authType: saved.auth_type,
      status: saved.status,
      updatedAt: saved.updatedAt
    });
  } catch (error) {
    logger.error('Error updating API connection:', error);
    return NextResponse.json(
      { error: 'Failed to update API connection' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const database = await getDatabase();
    const repository = database.getRepository(ApiConnectionEntity);
    
    const result = await repository.delete({ id });

    if (result.affected === 0) {
      return NextResponse.json(
        { error: 'API connection not found' },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error('Error deleting API connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete API connection' },
      { status: 500 }
    );
  }
}