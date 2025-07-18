import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { ApiConnectionEntity } from '@/entities/ApiConnectionEntity';
import { createApiConnector } from '@/services/connectors/apiConnectorFactory';
import { ApiConnection } from '@/types/apiConnector';
import { logger } from '@/utils/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/data-sources/[id]/refresh - Refresh data for an API data source
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    
    const database = await getDatabase();
    const dataSourceRepository = database.getRepository(DataSourceEntity);
    const apiConnectionRepository = database.getRepository(ApiConnectionEntity);
    
    // Get the data source
    const dataSource = await dataSourceRepository.findOne({ where: { id } });
    
    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }
    
    if (dataSource.type !== 'api') {
      return NextResponse.json(
        { error: 'Only API data sources can be refreshed' },
        { status: 400 }
      );
    }
    
    // Get configuration
    const config = JSON.parse(dataSource.configuration);
    const connectionName = config.connectionName;
    
    if (!connectionName) {
      return NextResponse.json(
        { error: 'API connection name not found in data source' },
        { status: 400 }
      );
    }
    
    // Find the API connection
    const apiEntity = await apiConnectionRepository.findOne({
      where: { name: connectionName }
    });
    
    if (!apiEntity) {
      return NextResponse.json(
        { error: 'API connection not found' },
        { status: 404 }
      );
    }
    
    if (apiEntity.status !== 'active') {
      return NextResponse.json(
        { error: 'API connection is not active' },
        { status: 400 }
      );
    }
    
    // Convert entity to ApiConnection type
    const connection: ApiConnection = {
      id: apiEntity.id,
      name: apiEntity.name,
      endpoint: apiEntity.endpoint,
      method: apiEntity.method,
      authType: apiEntity.auth_type,
      authConfig: apiEntity.auth_config ? JSON.parse(apiEntity.auth_config) : undefined,
      headers: apiEntity.headers ? JSON.parse(apiEntity.headers) : undefined,
      requestBody: apiEntity.request_body ? JSON.parse(apiEntity.request_body) : undefined,
      paginationConfig: apiEntity.pagination_config ? JSON.parse(apiEntity.pagination_config) : undefined,
      rateLimit: apiEntity.rate_limit,
      timeout: apiEntity.timeout,
      retryCount: apiEntity.retry_count,
      refreshEnabled: apiEntity.refresh_enabled,
      refreshInterval: apiEntity.refresh_interval,
      responseMapping: apiEntity.response_mapping ? JSON.parse(apiEntity.response_mapping) : undefined,
      status: apiEntity.status,
      createdAt: apiEntity.createdAt,
      updatedAt: apiEntity.updatedAt
    };
    
    // Create connector and fetch fresh data
    const connector = createApiConnector(connection);
    logger.info(`Refreshing data for source: ${dataSource.name}`);
    
    const data = await connector.fetchAllData({ limit: 1000 });
    
    // Update the data source configuration with new data
    const updatedConfig = {
      ...config,
      data: data as Record<string, unknown>[],
      files: [{
        name: `${connectionName}.json`,
        content: JSON.stringify(data, null, 2),
        type: 'application/json',
        size: JSON.stringify(data).length
      }]
    };
    
    // Update the data source
    await dataSourceRepository.update(
      { id },
      {
        configuration: JSON.stringify(updatedConfig),
        recordCount: data.length,
        metadata: JSON.stringify({
          totalSize: JSON.stringify(data).length,
          lastModified: new Date()
        })
      }
    );
    
    // Update API connection refresh timestamps if it has refresh enabled
    if (connection.refreshEnabled) {
      await apiConnectionRepository.update(
        { id: apiEntity.id },
        {
          last_refresh_at: new Date(),
          next_refresh_at: new Date(Date.now() + (connection.refreshInterval || 60) * 60000)
        }
      );
    }
    
    // Trigger transformation to re-apply existing transformation settings
    try {
      logger.info('Triggering transformation for refreshed API data source:', dataSource.id);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const transformUrl = `${baseUrl}/api/data-sources/${dataSource.id}/transform?skipPagination=true`;
      
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
        logger.info('Transformation completed successfully after refresh:', {
          catalogId: transformResult.catalogId,
          totalRecords: transformResult.totalRecords,
          hasRecords: !!transformResult.records,
          recordsLength: transformResult.records?.length
        });
      }
    } catch (transformError) {
      logger.error('Failed to trigger transformation after refresh:', transformError);
    }
    
    logger.info(`Successfully refreshed ${data.length} records for ${dataSource.name}`);
    
    return NextResponse.json({
      success: true,
      recordCount: data.length,
      dataSourceId: id,
      message: `Refreshed ${data.length} records from API`
    });
  } catch (error) {
    logger.error('Failed to refresh data source:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Refresh failed';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}