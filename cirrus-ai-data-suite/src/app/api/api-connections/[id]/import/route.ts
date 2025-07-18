import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { ApiConnectionEntity } from '@/entities/ApiConnectionEntity';
import { createApiConnector } from '@/services/connectors/apiConnectorFactory';
import { DataSourceService } from '@/services/dataSourceService';
import { ApiConnection } from '@/types/apiConnector';
import { logger } from '@/utils/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      maxRecords,
      queryParams,
      additionalHeaders
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const database = await getDatabase();
    const repository = database.getRepository(ApiConnectionEntity);
    
    const entity = await repository.findOne({
      where: { id }
    });

    if (!entity) {
      return NextResponse.json(
        { error: 'API connection not found' },
        { status: 404 }
      );
    }

    // Convert entity to ApiConnection type
    const connection: ApiConnection = {
      id: entity.id,
      name: entity.name,
      endpoint: entity.endpoint,
      method: entity.method,
      authType: entity.auth_type,
      authConfig: entity.auth_config ? JSON.parse(entity.auth_config) : undefined,
      headers: entity.headers ? JSON.parse(entity.headers) : undefined,
      requestBody: entity.request_body ? JSON.parse(entity.request_body) : undefined,
      paginationConfig: entity.pagination_config ? JSON.parse(entity.pagination_config) : undefined,
      rateLimit: entity.rate_limit,
      timeout: entity.timeout,
      retryCount: entity.retry_count,
      refreshEnabled: entity.refresh_enabled,
      refreshInterval: entity.refresh_interval,
      responseMapping: entity.response_mapping ? JSON.parse(entity.response_mapping) : undefined,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };

    if (connection.status !== 'active') {
      return NextResponse.json(
        { error: 'API connection is not active. Please test the connection first.' },
        { status: 400 }
      );
    }

    // Create connector and fetch data
    const connector = createApiConnector(connection);
    const startTime = Date.now();
    
    try {
      // Fetch data with optional parameters
      const fetchParams = {
        queryParams,
        headers: additionalHeaders,
        limit: maxRecords
      };

      let data: unknown[];
      
      if (maxRecords && !connection.paginationConfig) {
        // If no pagination config, just fetch once with limit in query params
        const result = await connector.fetchData({
          ...fetchParams,
          queryParams: { ...queryParams, limit: maxRecords }
        });
        data = result.data;
      } else {
        // Use fetchAllData to handle pagination automatically
        data = await connector.fetchAllData(fetchParams);
        if (maxRecords && data.length > maxRecords) {
          data = data.slice(0, maxRecords);
        }
      }
      
      const executionTime = Date.now() - startTime;

      // Create data source from API results
      const dataSource = await DataSourceService.createDataSource({
        name,
        type: 'api',
        connectionStatus: 'connected',
        recordCount: data.length,
        metadata: {
          totalSize: JSON.stringify(data).length,
          lastModified: new Date()
        },
        configuration: {
          endpoint: connection.endpoint,
          connectionName: connection.name,
          description: description || `API import from ${connection.name}`,
          data: data as Record<string, unknown>[],
          files: [{
            name: `${name}.json`,
            content: JSON.stringify(data, null, 2),
            type: 'application/json',
            size: JSON.stringify(data).length
          }]
        }
      });


      // Update last refresh time first
      if (connection.refreshEnabled) {
        await repository.update(
          { id },
          {
            last_refresh_at: new Date(),
            next_refresh_at: new Date(Date.now() + (connection.refreshInterval || 60) * 60000)
          }
        );
      }

      // Trigger transformation for the data source using GET method
      try {
        logger.info('Triggering transformation for API data source:', dataSource.id);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        const transformUrl = `${baseUrl}/api/data-sources/${dataSource.id}/transform?skipPagination=true`;
        logger.info('Transform URL:', transformUrl);
        
        const transformResponse = await fetch(transformUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!transformResponse.ok) {
          const errorText = await transformResponse.text();
          logger.error('Transform response not OK:', {
            status: transformResponse.status,
            statusText: transformResponse.statusText,
            error: errorText
          });
        } else {
          const transformResult = await transformResponse.json();
          logger.info('Transformation completed successfully:', {
            catalogId: transformResult.catalogId,
            totalRecords: transformResult.totalRecords,
            hasRecords: !!transformResult.records,
            recordsLength: transformResult.records?.length
          });
        }
      } catch (transformError) {
        logger.error('Failed to trigger transformation:', transformError);
      }

      return NextResponse.json({
        success: true,
        dataSourceId: dataSource.id,
        recordCount: data.length,
        executionTime
      });
    } catch (fetchError) {
      // Update connection status on error
      await repository.update(
        { id },
        {
          status: 'error',
          error_message: fetchError instanceof Error ? fetchError.message : 'Data fetch failed'
        }
      );
      throw fetchError;
    }
  } catch (error) {
    logger.error('API import error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'API import failed';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}