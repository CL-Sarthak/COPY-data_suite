import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DatabaseConnectionEntity } from '@/entities/DatabaseConnectionEntity';
import { createConnector } from '@/services/connectors/connectorFactory';
import { RelationalDataService } from '@/services/relationalDataService';
import { logger } from '@/utils/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { primaryTable, includedTables, excludedTables, maxDepth = 3 } = body;

    if (!primaryTable) {
      return NextResponse.json(
        { error: 'Primary table is required' },
        { status: 400 }
      );
    }

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

    // Create connector
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

    try {
      // Analyze relationships
      const relationalService = new RelationalDataService(connector);
      const schema = await relationalService.analyzeSchema({
        primaryTable,
        maxDepth,
        includedTables,
        excludedTables,
        followReverse: true
      });

      // Convert Map to array for JSON serialization
      const tables = Array.from(schema.tables.entries()).map(([tableName, tableInfo]) => ({
        ...tableInfo,
        name: tableName
      }));

      // Get sample data count for primary table
      const sampleCount = await connector.getTableCount(primaryTable);

      const response = {
        primaryTable: schema.primaryTable,
        tables,
        relationships: schema.relationships,
        relationshipDiagram: relationalService.getRelationshipDiagram(schema),
        statistics: {
          tableCount: tables.length,
          relationshipCount: schema.relationships.length,
          primaryTableRows: sampleCount
        }
      };

      await connector.disconnect();
      return NextResponse.json(response);
    } catch (error) {
      await connector.disconnect();
      throw error;
    }
  } catch (error) {
    logger.error('Failed to analyze relationships:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze relationships',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}