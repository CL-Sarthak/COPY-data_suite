import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { InboundApiConnectionEntity } from '@/entities/InboundApiConnectionEntity';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { logger } from '@/utils/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/inbound-connections/[id] - Get specific inbound connection
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const database = await getDatabase();
    const repository = database.getRepository(InboundApiConnectionEntity);
    
    const connection = await repository.findOne({ 
      where: { id }
    });
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Inbound connection not found' },
        { status: 404 }
      );
    }
    
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
    logger.error('Failed to fetch inbound connection:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch inbound connection' },
      { status: 500 }
    );
  }
}

// PUT /api/inbound-connections/[id] - Update inbound connection
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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
    
    const connection = await connectionRepository.findOne({ 
      where: { id }
    });
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Inbound connection not found' },
        { status: 404 }
      );
    }
    
    // Check if custom URL is already taken by another connection
    if (customUrl && customUrl !== connection.custom_url) {
      const existingWithUrl = await connectionRepository.findOne({
        where: { custom_url: customUrl }
      });
      
      if (existingWithUrl && existingWithUrl.id !== id) {
        return NextResponse.json(
          { error: 'Custom URL is already in use' },
          { status: 400 }
        );
      }
    }
    
    // Update connection
    await connectionRepository.update(
      { id },
      {
        name,
        description,
        data_mode: dataMode || connection.data_mode,
        custom_url: customUrl || null,
        api_key_header: apiKeyHeader || connection.api_key_header,
        require_api_key: requireApiKey !== undefined ? requireApiKey : connection.require_api_key
      }
    );
    
    // Update associated data source name if it exists
    if (connection.data_source_id) {
      await dataSourceRepository.update(
        { id: connection.data_source_id },
        {
          name: `Inbound: ${name}`
        }
      );
    }
    
    // Fetch updated connection
    const updatedConnection = await connectionRepository.findOne({ 
      where: { id }
    });
    
    if (!updatedConnection) {
      return NextResponse.json(
        { error: 'Failed to fetch updated connection' },
        { status: 500 }
      );
    }
    
    logger.info(`Updated inbound API connection: ${id}`);
    
    // Map database fields to frontend interface
    const mappedConnection = {
      id: updatedConnection.id,
      name: updatedConnection.name,
      description: updatedConnection.description,
      apiKey: updatedConnection.api_key,
      status: updatedConnection.status,
      dataMode: updatedConnection.data_mode,
      customUrl: updatedConnection.custom_url,
      apiKeyHeader: updatedConnection.api_key_header,
      requireApiKey: updatedConnection.require_api_key,
      dataSourceId: updatedConnection.data_source_id,
      requestCount: updatedConnection.request_count,
      lastRequestAt: updatedConnection.last_request_at,
      createdAt: updatedConnection.createdAt,
      updatedAt: updatedConnection.updatedAt
    };
    
    return NextResponse.json(mappedConnection);
  } catch (error) {
    logger.error('Failed to update inbound connection:', error);
    
    return NextResponse.json(
      { error: 'Failed to update inbound connection' },
      { status: 500 }
    );
  }
}

// DELETE /api/inbound-connections/[id] - Delete inbound connection
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const database = await getDatabase();
    const connectionRepository = database.getRepository(InboundApiConnectionEntity);
    const dataSourceRepository = database.getRepository(DataSourceEntity);
    
    const connection = await connectionRepository.findOne({ 
      where: { id }
    });
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Inbound connection not found' },
        { status: 404 }
      );
    }
    
    // Delete associated data source if it exists
    if (connection.data_source_id) {
      await dataSourceRepository.delete({ id: connection.data_source_id });
      logger.info(`Deleted associated data source: ${connection.data_source_id}`);
    }
    
    // Delete the connection
    await connectionRepository.delete({ id });
    
    logger.info(`Deleted inbound API connection: ${id}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete inbound connection:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete inbound connection' },
      { status: 500 }
    );
  }
}