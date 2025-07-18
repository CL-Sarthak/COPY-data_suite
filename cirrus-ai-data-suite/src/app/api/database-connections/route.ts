import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DatabaseConnectionEntity } from '@/entities/DatabaseConnectionEntity';
import { DatabaseConnection } from '@/types/connector';
import { logger } from '@/utils/logger';

// GET /api/database-connections - List all connections
export async function GET() {
  try {
    const database = await getDatabase();
    const repository = database.getRepository(DatabaseConnectionEntity);
    
    const connections = await repository.find({
      order: { createdAt: 'DESC' }
    });

    const formattedConnections: DatabaseConnection[] = connections.map(entity => ({
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
    }));

    return NextResponse.json(formattedConnections);
  } catch (error) {
    logger.error('Failed to fetch database connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database connections' },
      { status: 500 }
    );
  }
}

// POST /api/database-connections - Create new connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const database = await getDatabase();
    const repository = database.getRepository(DatabaseConnectionEntity);

    // Validate required fields
    if (!body.name || !body.type || !body.host || !body.port || !body.database || !body.username) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new connection
    const entity = repository.create({
      name: body.name,
      type: body.type,
      host: body.host,
      port: body.port,
      database: body.database,
      username: body.username,
      password: body.password || undefined, // Should be encrypted in production
      ssl: body.ssl || false,
      sslCert: body.sslCert,
      additionalOptions: body.additionalOptions ? JSON.stringify(body.additionalOptions) : undefined,
      description: body.description,
      tags: body.tags ? JSON.stringify(body.tags) : undefined,
      status: 'inactive',
      createdBy: body.createdBy || 'system',
      refreshEnabled: body.refreshEnabled || false,
      refreshInterval: body.refreshInterval,
      nextRefreshAt: body.refreshEnabled && body.refreshInterval 
        ? new Date(Date.now() + body.refreshInterval * 60 * 1000)
        : undefined
    });

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
      status: savedEntity.status,
      errorMessage: savedEntity.errorMessage || undefined,
      refreshEnabled: savedEntity.refreshEnabled,
      refreshInterval: savedEntity.refreshInterval,
      lastRefreshAt: savedEntity.lastRefreshAt || undefined,
      nextRefreshAt: savedEntity.nextRefreshAt || undefined
    };

    return NextResponse.json(connection);
  } catch (error) {
    logger.error('Failed to create database connection:', error);
    return NextResponse.json(
      { error: 'Failed to create database connection' },
      { status: 500 }
    );
  }
}