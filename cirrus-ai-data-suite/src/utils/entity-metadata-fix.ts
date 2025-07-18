/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataSource } from 'typeorm';
import { logger } from './logger';

/**
 * Fix for TypeORM entity metadata resolution issues
 * This ensures that all entities are properly registered with their correct names
 */
export function fixEntityMetadata(dataSource: DataSource): void {
  try {
    // Get all entity metadata
    const allMetadata = dataSource.entityMetadatas;
    
    // Create a map of entity names to metadata
    const metadataMap = new Map<string, typeof allMetadata[0]>();
    
    allMetadata.forEach(metadata => {
      metadataMap.set(metadata.name, metadata);
      metadataMap.set(metadata.target.constructor.name, metadata);
      metadataMap.set(metadata.tableName, metadata);
    });
    
    // Log all relationships for debugging
    logger.debug('Entity relationships before fix:');
    allMetadata.forEach(metadata => {
      if (metadata.relations.length > 0) {
        logger.debug(`  ${metadata.name}:`);
        metadata.relations.forEach(relation => {
          logger.debug(`    - ${relation.propertyName}: type=${typeof relation.type === 'string' ? relation.type : relation.type.name}, inversePath=${relation.inverseSidePropertyPath}`);
        });
      }
    });
    
    // Fix any relationship references
    allMetadata.forEach(metadata => {
      metadata.relations.forEach(relation => {
        // Check for corrupted inverse property paths that contain special characters
        if (relation.inverseSidePropertyPath && typeof relation.inverseSidePropertyPath === 'string') {
          // Check for corrupted paths like "d#actions"
          if (relation.inverseSidePropertyPath.includes('#')) {
            const parts = relation.inverseSidePropertyPath.split('#');
            const cleanPath = parts[parts.length - 1]; // Take the last part after #
            logger.warn(`Fixing corrupted inverse property path: ${relation.inverseSidePropertyPath} -> ${cleanPath}`);
            (relation as any).inverseSidePropertyPath = cleanPath;
          }
          
          // Also clean any other non-standard characters
          const cleanPath = relation.inverseSidePropertyPath.replace(/[^a-zA-Z0-9._]/g, '');
          if (cleanPath !== relation.inverseSidePropertyPath) {
            logger.warn(`Fixed corrupted inverse property path: ${relation.inverseSidePropertyPath} -> ${cleanPath}`);
            (relation as any).inverseSidePropertyPath = cleanPath;
          }
        }
        
        // If the relation type is a string, try to resolve it
        if (typeof relation.type === 'string') {
          const targetMetadata = metadataMap.get(relation.type);
          if (targetMetadata) {
            // Update the relation type to the actual entity constructor
            (relation as any).type = targetMetadata.target;
            logger.debug(`Resolved string entity reference: ${relation.type} -> ${targetMetadata.name}`);
          } else {
            logger.warn(`Could not resolve entity metadata for relation: ${relation.type}`);
          }
        }
      });
    });
    
    // Specifically check for remediation entities
    const remediationEntities = ['RemediationJobEntity', 'RemediationActionEntity', 'RemediationHistoryEntity'];
    remediationEntities.forEach(entityName => {
      const metadata = metadataMap.get(entityName);
      if (metadata) {
        logger.debug(`${entityName} relations after fix:`);
        metadata.relations.forEach(rel => {
          logger.debug(`  - ${rel.propertyName}: inversePath=${rel.inverseSidePropertyPath}`);
        });
      }
    });
    
    logger.info('Entity metadata fix applied successfully');
  } catch (error) {
    logger.error('Failed to apply entity metadata fix:', error);
  }
}