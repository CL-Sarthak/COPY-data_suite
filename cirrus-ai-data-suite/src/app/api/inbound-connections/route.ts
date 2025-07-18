import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { InboundApiConnectionEntity } from '@/entities/InboundApiConnectionEntity';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { logger } from '@/utils/logger';
import { randomBytes } from 'crypto';

// GET /api/inbound-connections - List all inbound connections
export async function GET() {
  try {
    const database = await getDatabase();
    const repository = database.getRepository(InboundApiConnectionEntity);
    
    const connections = await repository.find({
      order: { createdAt: 'DESC' }
    });
    
    // Map database fields to frontend interface
    const mappedConnections = connections.map(connection => ({
      id: connection.id,
      name: connection.name,
      description: connection.description,
      apiKey: connection.api_key,
      status: connection.status,
      dataMode: connection.data_mode,
      customUrl: connection.custom_url,
      apiKeyHeader: connection.api_key_header,
      requireApiKey: connection.require_api_key,
      dataSourceId: connection.data_source_id,
      requestCount: connection.request_count,
      lastRequestAt: connection.last_request_at,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt
    }));
    
    return NextResponse.json(mappedConnections);
  } catch (error) {
    logger.error('Failed to fetch inbound connections:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch inbound connections' },
      { status: 500 }
    );
  }
}

// POST /api/inbound-connections - Create new inbound connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, dataMode, customUrl, apiKeyHeader, requireApiKey } = body;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const database = await getDatabase();
    const connectionRepository = database.getRepository(InboundApiConnectionEntity);
    const dataSourceRepository = database.getRepository(DataSourceEntity);
    
    // Generate unique API key
    const apiKey = `inbound_${randomBytes(16).toString('hex')}`;
    
    // Check if custom URL is already taken
    if (customUrl) {
      const existingWithUrl = await connectionRepository.findOne({
        where: { custom_url: customUrl }
      });
      
      if (existingWithUrl) {
        return NextResponse.json(
          { error: 'Custom URL is already in use' },
          { status: 400 }
        );
      }
    }
    
    // Create the inbound connection
    const connection = connectionRepository.create({
      name,
      description,
      api_key: apiKey,
      status: 'active',
      data_mode: dataMode || 'append',
      custom_url: customUrl || null,
      api_key_header: apiKeyHeader || 'X-API-Key',
      require_api_key: requireApiKey !== false,
      request_count: 0
    });
    
    await connectionRepository.save(connection);
    
    // Create associated data source
    // Create initial empty UnifiedDataCatalog for JSON readiness
    const initialCatalog = {
      version: '1.0',
      source: {
        name: `Inbound: ${name}`,
        type: 'inbound_api',
        metadata: {
          connection: name,
          created: new Date().toISOString()
        }
      },
      totalRecords: 0,
      records: [],
      savedRecordCount: 0,
      fields: [],
      metadata: {
        inferred: true,
        recordsNotStored: false
      }
    };
    
    const dataSource = dataSourceRepository.create({
      name: `Inbound: ${name}`,
      type: 'api',
      connectionStatus: 'connected',
      configuration: JSON.stringify({
        inboundApiId: connection.id,
        apiKey: apiKey,
        type: 'inbound',
        data: [],
        files: []
      }),
      recordCount: 0,
      metadata: JSON.stringify({
        source: 'inbound_api',
        connectionId: connection.id
      }),
      transformedData: JSON.stringify(initialCatalog),
      transformedAt: new Date()
    });
    
    await dataSourceRepository.save(dataSource);
    
    // Update connection with data source ID
    connection.data_source_id = dataSource.id;
    await connectionRepository.save(connection);
    
    logger.info(`Created inbound API connection: ${connection.id}`);
    
    // Map database fields to frontend interface
    const mappedConnection = {
      id: connection.id,
      name: connection.name,
      description: connection.description,
      apiKey: connection.api_key,
      status: connection.status,
      dataMode: connection.data_mode,
      customUrl: connection.custom_url,
      apiKeyHeader: connection.api_key_header,
      requireApiKey: connection.require_api_key,
      dataSourceId: connection.data_source_id,
      requestCount: connection.request_count,
      lastRequestAt: connection.last_request_at,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt
    };
    
    return NextResponse.json(mappedConnection);
  } catch (error) {
    logger.error('Failed to create inbound connection:', error);
    
    return NextResponse.json(
      { error: 'Failed to create inbound connection' },
      { status: 500 }
    );
  }
}