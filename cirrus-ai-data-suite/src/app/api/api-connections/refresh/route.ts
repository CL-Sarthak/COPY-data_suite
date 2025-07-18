import { NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { ApiConnectionEntity } from '@/entities/ApiConnectionEntity';
import { createApiConnector } from '@/services/connectors/apiConnectorFactory';
import { DataSourceService } from '@/services/dataSourceService';
import { ApiConnection } from '@/types/apiConnector';
import { logger } from '@/utils/logger';

// GET /api/api-connections/refresh - Check and refresh API connections that are due
export async function GET() {
  try {
    const database = await getDatabase();
    const repository = database.getRepository(ApiConnectionEntity);
    
    // Find all API connections that need refresh
    const now = new Date();
    const connectionsToRefresh = await repository
      .createQueryBuilder('connection')
      .where('connection.refresh_enabled = :enabled', { enabled: true })
      .andWhere('connection.status = :status', { status: 'active' })
      .andWhere('connection.next_refresh_at <= :now', { now })
      .getMany();
    
    logger.info(`Found ${connectionsToRefresh.length} API connections to refresh`);
    
    const results = [];
    
    for (const entity of connectionsToRefresh) {
      try {
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
        
        // Create connector and fetch data
        const connector = createApiConnector(connection);
        logger.info(`Refreshing API connection: ${connection.name}`);
        
        // Fetch all data
        const data = await connector.fetchAllData({ limit: 1000 });
        
        // Find existing data source for this API connection
        const dataSources = await DataSourceService.getAllDataSources();
        const existingSource = dataSources.find(
          ds => ds.type === 'api' && 
          (ds.configuration as { connectionName?: string })?.connectionName === connection.name
        );
        
        if (existingSource) {
          // Update existing data source
          await DataSourceService.updateDataSource(existingSource.id, {
            recordCount: data.length,
            metadata: {
              totalSize: JSON.stringify(data).length,
              lastModified: new Date()
            },
            configuration: {
              ...existingSource.configuration,
              data: data as Record<string, unknown>[],
              files: [{
                name: `${connection.name}.json`,
                content: JSON.stringify(data, null, 2),
                type: 'application/json',
                size: JSON.stringify(data).length
              }]
            }
          });
          
          // Trigger transformation
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
          const transformUrl = `${baseUrl}/api/data-sources/${existingSource.id}/transform?skipPagination=true`;
          
          const transformResponse = await fetch(transformUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (!transformResponse.ok) {
            logger.warn(`Failed to transform refreshed data for ${connection.name}`);
          }
        } else {
          // Create new data source if none exists
          const dataSource = await DataSourceService.createDataSource({
            name: `${connection.name} Import`,
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
              description: `Auto-refreshed API import from ${connection.name}`,
              data: data as Record<string, unknown>[],
              files: [{
                name: `${connection.name}.json`,
                content: JSON.stringify(data, null, 2),
                type: 'application/json',
                size: JSON.stringify(data).length
              }]
            }
          });
          
          // Trigger transformation for new source
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
          const transformUrl = `${baseUrl}/api/data-sources/${dataSource.id}/transform?skipPagination=true`;
          
          await fetch(transformUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
        
        // Update refresh timestamps
        await repository.update(
          { id: entity.id },
          {
            last_refresh_at: new Date(),
            next_refresh_at: new Date(Date.now() + (connection.refreshInterval || 60) * 60000),
            error_message: undefined
          }
        );
        
        results.push({
          id: connection.id,
          name: connection.name,
          status: 'success',
          recordCount: data.length,
          refreshedAt: new Date()
        });
        
        logger.info(`Successfully refreshed ${connection.name}: ${data.length} records`);
      } catch (error) {
        logger.error(`Failed to refresh connection ${entity.name}:`, error);
        
        // Update error status
        await repository.update(
          { id: entity.id },
          {
            error_message: error instanceof Error ? error.message : 'Refresh failed',
            // Still update next refresh time to avoid constant retries
            next_refresh_at: new Date(Date.now() + (entity.refresh_interval || 60) * 60000)
          }
        );
        
        results.push({
          id: entity.id,
          name: entity.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Refresh failed',
          refreshedAt: new Date()
        });
      }
    }
    
    return NextResponse.json({
      refreshed: results.length,
      results
    });
  } catch (error) {
    logger.error('Failed to check API connections for refresh:', error);
    return NextResponse.json(
      { error: 'Failed to refresh API connections' },
      { status: 500 }
    );
  }
}