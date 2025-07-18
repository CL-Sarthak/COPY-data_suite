import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DatabaseConnectionEntity } from '@/entities/DatabaseConnectionEntity';
import { createConnector } from '@/services/connectors/connectorFactory';
import { logger } from '@/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableName: string }> }
) {
  try {
    const { id, tableName } = await params;
    const decodedTableName = decodeURIComponent(tableName);

    // Get connection details
    const database = await getDatabase();
    const connectionRepo = database.getRepository(DatabaseConnectionEntity);
    const connection = await connectionRepo.findOne({ where: { id } });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Create connector and get table data
    const connector = createConnector({
      id: connection.id,
      name: connection.name,
      type: connection.type,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      password: connection.password,
      ssl: connection.ssl,
      sslCert: connection.sslCert,
      additionalOptions: connection.additionalOptions ? JSON.parse(connection.additionalOptions) : undefined,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      lastTestedAt: connection.lastTestedAt || undefined,
      status: connection.status,
      errorMessage: connection.errorMessage || undefined
    });

    await connector.connect();
    const result = await connector.getTableData(decodedTableName, 100); // Preview first 100 rows
    await connector.disconnect();

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to preview table:', error);
    return NextResponse.json(
      { 
        error: 'Failed to preview table',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}