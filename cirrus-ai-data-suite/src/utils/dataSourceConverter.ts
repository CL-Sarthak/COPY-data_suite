import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { DataSource } from '@/types/discovery';

/**
 * Convert DataSourceEntity to DataSource type
 * This utility ensures consistent conversion across the codebase
 */
export function convertEntityToDataSource(entity: DataSourceEntity): DataSource {
  return {
    id: entity.id,
    name: entity.name,
    type: entity.type as 'database' | 'api' | 'filesystem' | 's3' | 'azure' | 'gcp' | 'json_transformed',
    connectionStatus: 'connected',
    recordCount: entity.recordCount,
    configuration: JSON.parse(entity.configuration || '{}'),
    metadata: entity.metadata ? JSON.parse(entity.metadata) : undefined,
    tags: entity.tags ? JSON.parse(entity.tags) : undefined,
    transformedAt: entity.transformedAt,
    transformedData: entity.transformedData
  };
}