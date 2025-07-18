import { NextRequest, NextResponse } from 'next/server';
import { PostgreSQLConnector } from '@/services/connectors/PostgreSQLConnector';
import { MySQLConnector } from '@/services/connectors/MySQLConnector';
import { DatabaseConnection } from '@/types/connector';
import { logger } from '@/utils/logger';
import { getDatabase } from '@/database/connection';
import { DatabaseConnectionEntity } from '@/entities/DatabaseConnectionEntity';

// POST /api/database-connections/test - Test database connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.info('Test connection request:', { 
      id: body.id,
      hasAllFields: !!(body.type && body.host && body.port && body.database && body.username),
      fields: Object.keys(body)
    });
    
    // If testing by ID, we don't need all fields
    if (!body.id && (!body.type || !body.host || !body.port || !body.database || !body.username)) {
      return NextResponse.json(
        { error: 'Missing required connection parameters' },
        { status: 400 }
      );
    }

    // If we have an ID, fetch the connection from database to get the password
    let connectionConfig: DatabaseConnection;
    
    if (body.id) {
      const database = await getDatabase();
      const repository = database.getRepository(DatabaseConnectionEntity);
      const entity = await repository.findOne({
        where: { id: body.id }
      });
      
      if (!entity) {
        return NextResponse.json(
          { error: 'Database connection not found' },
          { status: 404 }
        );
      }
      
      // Use the stored connection data, including the password
      // Ensure password is either string or undefined (not null)
      const password = entity.password === null || entity.password === '' 
        ? undefined 
        : entity.password;
      
      logger.info('Testing connection with stored entity:', {
        id: entity.id,
        hasPassword: !!entity.password,
        passwordType: typeof entity.password,
        passwordValue: entity.password === null ? 'null' : entity.password === '' ? 'empty string' : 'has value'
      });
      
      connectionConfig = {
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
        status: 'active'
      };
    } else {
      // Create connection config from request body for new connections
      // Ensure password is either string or undefined (not null)
      const password = body.password === null || body.password === '' 
        ? undefined 
        : body.password;
        
      logger.info('Testing new connection:', {
        hasPassword: !!body.password,
        passwordType: typeof body.password,
        passwordValue: body.password === null ? 'null' : body.password === '' ? 'empty string' : 'has value'
      });
      
      connectionConfig = {
        id: 'test',
        name: body.name || 'Test Connection',
        type: body.type,
        host: body.host,
        port: body.port,
        database: body.database,
        username: body.username,
        password: password,
        ssl: body.ssl || false,
        sslCert: body.sslCert || undefined,
        additionalOptions: body.additionalOptions,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active'
      };
    }

    // Test the connection based on type
    let connector;
    switch (connectionConfig.type) {
      case 'postgresql':
        connector = new PostgreSQLConnector(connectionConfig);
        break;
      case 'mysql':
        connector = new MySQLConnector(connectionConfig);
        break;
      case 'mongodb':
        // TODO: Implement MongoDB connector
        return NextResponse.json(
          { error: 'MongoDB connector not yet implemented' },
          { status: 501 }
        );
      case 'mssql':
        // TODO: Implement SQL Server connector
        return NextResponse.json(
          { error: 'SQL Server connector not yet implemented' },
          { status: 501 }
        );
      case 'oracle':
        // TODO: Implement Oracle connector
        return NextResponse.json(
          { error: 'Oracle connector not yet implemented' },
          { status: 501 }
        );
      default:
        return NextResponse.json(
          { error: `Unsupported database type: ${connectionConfig.type}` },
          { status: 400 }
        );
    }

    // Test the connection
    const result = await connector.testConnection();

    // If we have an ID, update the status in the database
    if (body.id) {
      try {
        const database = await getDatabase();
        const repository = database.getRepository(DatabaseConnectionEntity);
        
        await repository.update(
          { id: body.id },
          {
            status: result.success ? 'active' : 'error',
            errorMessage: result.success ? '' : (result.message || ''),
            lastTestedAt: new Date()
          }
        );
      } catch (error) {
        logger.warn('Failed to update connection status in database:', error);
      }
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Failed to test database connection:', error);
    return NextResponse.json(
      { 
        success: false,
        message: error instanceof Error ? error.message : 'Failed to test connection',
        error: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}