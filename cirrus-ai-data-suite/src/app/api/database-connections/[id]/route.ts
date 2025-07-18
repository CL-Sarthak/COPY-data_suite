import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DatabaseConnectionEntity } from '@/entities/DatabaseConnectionEntity';
import { DatabaseConnection } from '@/types/connector';
import { logger } from '@/utils/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/database-connections/[id] - Get single connection
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const database = await getDatabase();
    const repository = database.getRepository(DatabaseConnectionEntity);
    
    const entity = await repository.findOne({
      where: { id }
    });

    if (!entity) {
      return NextResponse.json(
        { error: 'Database connection not found' },
        { status: 404 }
      );
    }

    const connection: DatabaseConnection = {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      host: entity.host,
      port: entity.port,
      database: entity.database,
      username: entity.username,
      ssl: entity.ssl,
      sslCert: entity.sslCert,
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

    return NextResponse.json(connection);
  } catch (error) {
    logger.error('Failed to fetch database connection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database connection' },
      { status: 500 }
    );
  }
}

// PUT /api/database-connections/[id] - Update connection
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const database = await getDatabase();
    const repository = database.getRepository(DatabaseConnectionEntity);
    
    const entity = await repository.findOne({
      where: { id }
    });

    if (!entity) {
      return NextResponse.json(
        { error: 'Database connection not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (body.name !== undefined) entity.name = body.name;
    if (body.type !== undefined) entity.type = body.type;
    if (body.host !== undefined) entity.host = body.host;
    if (body.port !== undefined) entity.port = body.port;
    if (body.database !== undefined) entity.database = body.database;
    if (body.username !== undefined) entity.username = body.username;
    if (body.password !== undefined) entity.password = body.password;
    if (body.ssl !== undefined) entity.ssl = body.ssl;
    if (body.sslCert !== undefined) entity.sslCert = body.sslCert;
    if (body.additionalOptions !== undefined) {
      entity.additionalOptions = body.additionalOptions ? JSON.stringify(body.additionalOptions) : undefined;
    }
    if (body.description !== undefined) entity.description = body.description;
    if (body.tags !== undefined) {
      entity.tags = body.tags ? JSON.stringify(body.tags) : undefined;
    }
    if (body.refreshEnabled !== undefined) {
      entity.refreshEnabled = body.refreshEnabled;
      if (body.refreshEnabled && body.refreshInterval) {
        entity.nextRefreshAt = new Date(Date.now() + body.refreshInterval * 60 * 1000);
      } else {
        entity.nextRefreshAt = undefined;
      }
    }
    if (body.refreshInterval !== undefined) entity.refreshInterval = body.refreshInterval;

    const savedEntity = await repository.save(entity);

    const connection: DatabaseConnection = {
      id: savedEntity.id,
      name: savedEntity.name,
      type: savedEntity.type,
      host: savedEntity.host,
      port: savedEntity.port,
      database: savedEntity.database,
      username: savedEntity.username,
      ssl: savedEntity.ssl,
      sslCert: savedEntity.sslCert,
      additionalOptions: savedEntity.additionalOptions ? JSON.parse(savedEntity.additionalOptions) : undefined,
      createdAt: savedEntity.createdAt,
      updatedAt: savedEntity.updatedAt,
      lastTestedAt: savedEntity.lastTestedAt || undefined,
      status: savedEntity.status,
      errorMessage: savedEntity.errorMessage || undefined
    };

    return NextResponse.json(connection);
  } catch (error) {
    logger.error('Failed to update database connection:', error);
    return NextResponse.json(
      { error: 'Failed to update database connection' },
      { status: 500 }
    );
  }
}

// DELETE /api/database-connections/[id] - Delete connection
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const database = await getDatabase();
    const repository = database.getRepository(DatabaseConnectionEntity);
    
    const entity = await repository.findOne({
      where: { id }
    });

    if (!entity) {
      return NextResponse.json(
        { error: 'Database connection not found' },
        { status: 404 }
      );
    }

    await repository.remove(entity);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete database connection:', error);
    return NextResponse.json(
      { error: 'Failed to delete database connection' },
      { status: 500 }
    );
  }
}