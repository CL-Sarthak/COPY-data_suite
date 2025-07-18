/**
 * TypeORM Production Utilities
 * 
 * Provides workarounds for TypeORM metadata issues in serverless/edge environments
 */

import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';

// Entity name to class mapping for production
const ENTITY_MAP = new Map<string, EntityTarget<ObjectLiteral>>();

// Table name to entity mapping
const TABLE_TO_ENTITY_MAP = new Map<string, EntityTarget<ObjectLiteral>>();

/**
 * Register an entity for production use
 * This helps with entity resolution when metadata isn't properly loaded
 */
export function registerEntity<T extends ObjectLiteral>(
  entityClass: EntityTarget<T>,
  tableName: string
): void {
  const entityName = typeof entityClass === 'function' ? entityClass.name : String(entityClass);
  ENTITY_MAP.set(entityName, entityClass);
  TABLE_TO_ENTITY_MAP.set(tableName, entityClass);
}

/**
 * Get repository with fallback for production issues
 */
export async function getRepositoryWithFallback<T extends ObjectLiteral>(
  dataSource: DataSource,
  entity: EntityTarget<T> | string
): Promise<Repository<T>> {
  try {
    // Try normal approach first
    if (typeof entity === 'string') {
      // If string provided, try to resolve to entity class
      const entityClass = ENTITY_MAP.get(entity);
      if (entityClass) {
        return dataSource.getRepository(entityClass as EntityTarget<T>);
      }
    }
    
    return dataSource.getRepository(entity as EntityTarget<T>);
  } catch (error) {
    console.error('Failed to get repository normally:', error);
    
    // Fallback: Try to find entity by table name
    if (typeof entity === 'string') {
      const entityClass = TABLE_TO_ENTITY_MAP.get(entity.toLowerCase());
      if (entityClass) {
        return dataSource.getRepository(entityClass as EntityTarget<T>);
      }
    }
    
    throw new Error(`Failed to get repository for entity: ${entity}`);
  }
}

/**
 * Check if TypeORM metadata is properly loaded
 */
export function isMetadataLoaded(dataSource: DataSource): boolean {
  try {
    return dataSource.entityMetadatas.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get table name for entity with fallback
 */
export function getTableName<T extends ObjectLiteral>(
  dataSource: DataSource,
  entity: EntityTarget<T>
): string {
  try {
    const metadata = dataSource.getMetadata(entity);
    return metadata.tableName;
  } catch {
    // Fallback to hardcoded table names
    const entityName = typeof entity === 'function' ? entity.name : String(entity);
    
    // Map entity names to table names
    const tableNameMap: Record<string, string> = {
      'DataSourceEntity': 'data_source_entity',
      'PatternEntity': 'patterns',
      'AnnotationSession': 'annotation_sessions',
      'ProcessedFile': 'processed_files',
      'SyntheticDataset': 'synthetic_datasets',
      'SyntheticDataJob': 'synthetic_data_jobs',
      'CatalogFieldEntity': 'catalog_field',
      'FieldMappingEntity': 'field_mapping',
      'CatalogCategoryEntity': 'catalog_category',
      'PipelineEntity': 'pipeline',
      'UploadSessionEntity': 'upload_sessions',
      'PatternFeedback': 'pattern_feedback'
    };
    
    const tableName = tableNameMap[entityName];
    if (!tableName) {
      throw new Error(`Unknown table name for entity: ${entityName}`);
    }
    
    return tableName;
  }
}