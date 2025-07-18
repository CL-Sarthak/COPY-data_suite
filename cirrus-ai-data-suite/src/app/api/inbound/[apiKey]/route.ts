import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { InboundApiConnectionEntity } from '@/entities/InboundApiConnectionEntity';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { logger } from '@/utils/logger';

interface RouteParams {
  params: Promise<{
    apiKey: string;
  }>;
}

// Handle incoming data for inbound API endpoints
async function handleInboundData(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { apiKey } = await params;
    
    // Validate API key
    const database = await getDatabase();
    const connectionRepository = database.getRepository(InboundApiConnectionEntity);
    const dataSourceRepository = database.getRepository(DataSourceEntity);
    
    // First check if this might be a custom URL
    let connection = await connectionRepository.findOne({ 
      where: { custom_url: apiKey }
    });
    
    // If not found as custom URL, try as API key
    if (!connection) {
      connection = await connectionRepository.findOne({ 
        where: { api_key: apiKey }
      });
    }
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Check if API key authentication is required
    if (connection.require_api_key) {
      const apiKeyHeader = connection.api_key_header || 'X-API-Key';
      let providedApiKey = request.headers.get(apiKeyHeader);
      
      // Handle Authorization header with Bearer token
      if (apiKeyHeader.toLowerCase() === 'authorization' && providedApiKey) {
        providedApiKey = providedApiKey.replace('Bearer ', '');
      }
      
      if (!providedApiKey || providedApiKey !== connection.api_key) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }
    }
    
    if (connection.status !== 'active') {
      return NextResponse.json(
        { error: 'API endpoint is inactive' },
        { status: 403 }
      );
    }
    
    // Parse incoming data
    let data: unknown;
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      data = await request.json();
    } else if (contentType?.includes('text/plain')) {
      data = await request.text();
    } else {
      // Default to JSON parsing
      try {
        data = await request.json();
      } catch {
        data = await request.text();
      }
    }
    
    // Validate data if schema is defined
    if (connection.data_schema) {
      // TODO: Implement schema validation
      logger.info('Schema validation not yet implemented');
    }
    
    // Apply transformation if configured
    const transformedData = connection.transformation_config ? data : data;
    if (connection.transformation_config) {
      // TODO: Implement data transformation
      logger.info('Data transformation not yet implemented');
    }
    
    // Update the associated data source
    let dataSource = null;
    if (connection.data_source_id) {
      dataSource = await dataSourceRepository.findOne({
        where: { id: connection.data_source_id }
      });
    }
    
    // If data source doesn't exist, recreate it
    if (!dataSource) {
      logger.info(`Recreating missing data source for inbound API: ${connection.name}`);
      
      // Create initial empty UnifiedDataCatalog for JSON readiness
      const initialCatalog = {
        version: '1.0',
        source: {
          name: `Inbound: ${connection.name}`,
          type: 'inbound_api',
          metadata: {
            connection: connection.name,
            recreated: new Date().toISOString()
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
      
      dataSource = dataSourceRepository.create({
        name: `Inbound: ${connection.name}`,
        type: 'api',
        connectionStatus: 'connected',
        configuration: JSON.stringify({
          inboundApiId: connection.id,
          apiKey: connection.api_key,
          type: 'inbound',
          data: [],
          files: []
        }),
        recordCount: 0,
        metadata: JSON.stringify({
          source: 'inbound_api',
          connectionId: connection.id,
          recreated: true
        }),
        transformedData: JSON.stringify(initialCatalog),
        transformedAt: new Date()
      });
      
      await dataSourceRepository.save(dataSource);
      
      // Update connection with new data source ID
      await connectionRepository.update(
        { id: connection.id },
        { data_source_id: dataSource.id }
      );
      
      logger.info(`Recreated data source ${dataSource.id} for inbound API ${connection.name}`);
    }
    
    if (dataSource) {
        // Get existing data
        const config = JSON.parse(dataSource.configuration);
        const existingData = config.data || [];
        
        // Process new data
        const newData = Array.isArray(transformedData) 
          ? transformedData 
          : [transformedData];
        
        // Handle data mode (append vs replace)
        const allData = connection.data_mode === 'replace' 
          ? newData  // Replace: use only new data
          : [...existingData, ...newData];  // Append: combine existing + new
        
        // Update configuration
        config.data = allData;
        config.lastUpdated = new Date();
        config.files = [{
          name: `${connection.name}.json`,
          content: JSON.stringify(allData, null, 2),
          type: 'application/json',
          size: JSON.stringify(allData).length
        }];
        
        // For JSON data, automatically create transformed data
        const isJsonData = contentType?.includes('application/json') || 
                          (typeof transformedData === 'object' && transformedData !== null);
        
        let transformedDataString = '';
        let transformedAt = new Date(0);
        
        if (isJsonData) {
          // Create UnifiedDataCatalog format for JSON data
          const unifiedCatalog = {
            version: '1.0',
            source: {
              name: dataSource.name,
              type: 'inbound_api',
              metadata: {
                connection: connection.name,
                lastUpdated: new Date().toISOString()
              }
            },
            totalRecords: allData.length,
            records: allData.slice(0, 1000), // Store first 1000 records
            savedRecordCount: allData.length,
            fields: [],
            metadata: {
              inferred: true,
              recordsNotStored: allData.length > 1000
            }
          };
          
          transformedDataString = JSON.stringify(unifiedCatalog);
          transformedAt = new Date();
        }
        
        // Update data source
        await dataSourceRepository.update(
          { id: dataSource.id },
          {
            configuration: JSON.stringify(config),
            recordCount: allData.length,
            metadata: JSON.stringify({
              ...JSON.parse(dataSource.metadata || '{}'),
              lastModified: new Date(),
              lastInboundRequest: new Date()
            }),
            transformedData: transformedDataString,
            transformedAt: transformedAt
          }
        );
        
        logger.info(`Updated data source ${dataSource.id} with ${newData.length} new records`);
    }
    
    // Update connection stats
    await connectionRepository.update(
      { id: connection.id },
      {
        request_count: connection.request_count + 1,
        last_request_at: new Date()
      }
    );
    
    logger.info(`Processed inbound request for ${connection.name} (${apiKey})`);
    
    return NextResponse.json({
      success: true,
      message: 'Data received successfully',
      recordsProcessed: Array.isArray(transformedData) ? transformedData.length : 1
    });
  } catch (error) {
    logger.error('Failed to process inbound data:', error);
    
    return NextResponse.json(
      { error: 'Failed to process data' },
      { status: 500 }
    );
  }
}

// POST /api/inbound/[apiKey] - Receive data via POST
export async function POST(request: NextRequest, params: RouteParams) {
  return handleInboundData(request, params);
}

// PUT /api/inbound/[apiKey] - Receive data via PUT
export async function PUT(request: NextRequest, params: RouteParams) {
  return handleInboundData(request, params);
}

// GET /api/inbound/[apiKey] - Return endpoint info
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { apiKey } = await params;
    
    const database = await getDatabase();
    const repository = database.getRepository(InboundApiConnectionEntity);
    
    const connection = await repository.findOne({ 
      where: { api_key: apiKey }
    });
    
    if (!connection) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      name: connection.name,
      description: connection.description,
      status: connection.status,
      acceptedMethods: ['POST', 'PUT'],
      contentTypes: ['application/json', 'text/plain'],
      requestCount: connection.request_count,
      lastRequestAt: connection.last_request_at
    });
  } catch (error) {
    logger.error('Failed to get endpoint info:', error);
    
    return NextResponse.json(
      { error: 'Failed to get endpoint info' },
      { status: 500 }
    );
  }
}