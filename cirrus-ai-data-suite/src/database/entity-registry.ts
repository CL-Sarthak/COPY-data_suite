import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { PatternEntity } from '@/entities/PatternEntity';
import { AnnotationSession } from '@/entities/AnnotationSession';
import { ProcessedFile } from '@/entities/ProcessedFile';
import { SyntheticDataset } from '@/entities/SyntheticDataset';
import { SyntheticDataJob } from '@/entities/SyntheticDataJob';
import { CatalogFieldEntity } from '@/entities/CatalogFieldEntity';
import { FieldMappingEntity } from '@/entities/FieldMappingEntity';
import { CatalogCategoryEntity } from '@/entities/CatalogCategoryEntity';
import { PipelineEntity } from '@/entities/PipelineEntity';
import { UploadSessionEntity } from '@/entities/UploadSessionEntity';
import { PatternFeedback } from '@/entities/PatternFeedback';
import { DatabaseConnectionEntity } from '@/entities/DatabaseConnectionEntity';
import { ApiConnectionEntity } from '@/entities/ApiConnectionEntity';
import { InboundApiConnectionEntity } from '@/entities/InboundApiConnectionEntity';
import { QualityRuleEntity } from '@/entities/QualityRuleEntity';
import { RuleExecutionEntity } from '@/entities/RuleExecutionEntity';
import { RemediationJobEntity } from '@/entities/RemediationJobEntity';
import { RemediationActionEntity } from '@/entities/RemediationActionEntity';
import { RemediationHistoryEntity } from '@/entities/RemediationHistoryEntity';
import { FixTemplateEntity } from '@/entities/FixTemplateEntity';
import { DataQualityTemplateEntity } from '@/entities/DataQualityTemplateEntity';

// Map of entity classes to their table names
const ENTITY_REGISTRY = new Map<string, { entity: EntityTarget<ObjectLiteral>, tableName: string }>([
  ['DataSourceEntity', { entity: DataSourceEntity, tableName: 'data_source_entity' }],
  ['PatternEntity', { entity: PatternEntity, tableName: 'patterns' }],
  ['AnnotationSession', { entity: AnnotationSession, tableName: 'annotation_sessions' }],
  ['ProcessedFile', { entity: ProcessedFile, tableName: 'processed_files' }],
  ['SyntheticDataset', { entity: SyntheticDataset, tableName: 'synthetic_datasets' }],
  ['SyntheticDataJob', { entity: SyntheticDataJob, tableName: 'synthetic_data_jobs' }],
  ['CatalogFieldEntity', { entity: CatalogFieldEntity, tableName: 'catalog_field' }],
  ['FieldMappingEntity', { entity: FieldMappingEntity, tableName: 'field_mapping' }],
  ['CatalogCategoryEntity', { entity: CatalogCategoryEntity, tableName: 'catalog_category' }],
  ['PipelineEntity', { entity: PipelineEntity, tableName: 'pipeline' }],
  ['UploadSessionEntity', { entity: UploadSessionEntity, tableName: 'upload_sessions' }],
  ['PatternFeedback', { entity: PatternFeedback, tableName: 'pattern_feedback' }],
  ['DatabaseConnectionEntity', { entity: DatabaseConnectionEntity, tableName: 'database_connections' }],
  ['ApiConnectionEntity', { entity: ApiConnectionEntity, tableName: 'api_connections' }],
  ['InboundApiConnectionEntity', { entity: InboundApiConnectionEntity, tableName: 'inbound_api_connections' }],
  ['QualityRuleEntity', { entity: QualityRuleEntity, tableName: 'quality_rules' }],
  ['RuleExecutionEntity', { entity: RuleExecutionEntity, tableName: 'rule_executions' }],
  ['RemediationJobEntity', { entity: RemediationJobEntity, tableName: 'remediation_jobs' }],
  ['RemediationActionEntity', { entity: RemediationActionEntity, tableName: 'remediation_actions' }],
  ['RemediationHistoryEntity', { entity: RemediationHistoryEntity, tableName: 'remediation_history' }],
  ['FixTemplateEntity', { entity: FixTemplateEntity, tableName: 'fix_templates' }],
  ['DataQualityTemplateEntity', { entity: DataQualityTemplateEntity, tableName: 'data_quality_templates' }]
]);

/**
 * Get all registered entities
 */
export function getAllEntities(): EntityTarget<ObjectLiteral>[] {
  return Array.from(ENTITY_REGISTRY.values()).map(entry => entry.entity);
}

/**
 * Get entity by name
 */
export function getEntityByName(name: string): EntityTarget<ObjectLiteral> | undefined {
  return ENTITY_REGISTRY.get(name)?.entity;
}

/**
 * Get table name for entity
 */
export function getTableName(entityName: string): string | undefined {
  return ENTITY_REGISTRY.get(entityName)?.tableName;
}

/**
 * Ensure entities are registered with DataSource
 */
export function ensureEntitiesRegistered(dataSource: DataSource): void {
  // Check if metadata is missing
  if (dataSource.entityMetadatas.length === 0 && dataSource.isInitialized) {
    console.warn('Entity metadata missing, attempting to restore...');
    
    // Force re-registration by destroying and recreating connection
    // This is handled in the connection.ts file
  }
}

/**
 * Get repository with fallback for metadata errors
 */
export function getSafeRepository<T extends ObjectLiteral>(
  dataSource: DataSource, 
  entityClass: EntityTarget<T>
) {
  try {
    return dataSource.getRepository(entityClass);
  } catch (error) {
    // If metadata is not found, try to get it from our registry
    const entityName = typeof entityClass === 'function' ? entityClass.name : entityClass.toString();
    console.error(`Failed to get repository for ${entityName}:`, error);
    
    // Re-throw the error so the connection manager can handle it
    throw error;
  }
}