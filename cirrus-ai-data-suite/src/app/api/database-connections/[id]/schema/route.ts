import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DatabaseConnectionEntity } from '@/entities/DatabaseConnectionEntity';
import { DatabaseConnection } from '@/types/connector';
import { PostgreSQLConnector } from '@/services/connectors/PostgreSQLConnector';
import { MySQLConnector } from '@/services/connectors/MySQLConnector';
import { logger } from '@/utils/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/database-connections/[id]/schema - Get database schema
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  try {
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

    // Create connection config
    // Ensure password is either string or undefined (not null)
    const password = entity.password === null || entity.password === '' 
      ? undefined 
      : entity.password;
      
    const connectionConfig: DatabaseConnection = {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      host: entity.host,
      port: entity.port,
      database: entity.database,
      username: entity.username,
      password: password,
      ssl: entity.ssl,
      sslCert: entity.sslCert || undefined,
      additionalOptions: entity.additionalOptions ? JSON.parse(entity.additionalOptions) : undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      status: entity.status,
      errorMessage: entity.errorMessage || undefined
    };

    // Get connector based on type
    let connector;
    switch (connectionConfig.type) {
      case 'postgresql':
        connector = new PostgreSQLConnector(connectionConfig);
        break;
      case 'mysql':
        connector = new MySQLConnector(connectionConfig);
        break;
      default:
        return NextResponse.json(
          { error: `Database type ${connectionConfig.type} not yet supported` },
          { status: 501 }
        );
    }

    // Connect and get schema
    await connector.connect();
    const schema = await connector.getDatabaseSchema();
    await connector.disconnect();

    // Update last tested timestamp and clear any error
    await repository.update(
      { id },
      {
        lastTestedAt: new Date(),
        status: 'active',
        errorMessage: ''
      }
    );

    return NextResponse.json(schema);
  } catch (error) {
    logger.error('Failed to fetch database schema:', error);
    
    // Update error status
    try {
      const database = await getDatabase();
      const repository = database.getRepository(DatabaseConnectionEntity);
      await repository.update(
        { id },
        {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Failed to fetch schema',
          lastTestedAt: new Date()
        }
      );
    } catch (updateError) {
      logger.error('Failed to update connection status:', updateError);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch database schema' },
      { status: 500 }
    );
  }
}