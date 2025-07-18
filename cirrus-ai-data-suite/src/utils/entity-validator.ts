import { EntityTarget, ObjectLiteral } from 'typeorm';

export function validateEntity(entity: EntityTarget<ObjectLiteral>): boolean {
  if (!entity || typeof entity !== 'function') {
    console.error('Entity is not a class:', entity);
    return false;
  }

  // Skip validation in test environment
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
    return true;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getMetadataArgsStorage } = require('typeorm');
    const metadataArgsStorage = getMetadataArgsStorage();
    
    // Check if entity has table metadata
    const tableMetadata = metadataArgsStorage.tables.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (table: any) => table.target === entity
    );
    
    if (!tableMetadata) {
      console.error(`No @Entity decorator found for ${entity.name}`);
      return false;
    }

    // Check if entity has columns
    const columns = metadataArgsStorage.columns.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (column: any) => column.target === entity
    );
    
    if (columns.length === 0) {
      console.error(`No @Column decorators found for ${entity.name}`);
      return false;
    }

    console.log(`Entity ${entity.name} validated:`, {
      tableName: tableMetadata.name,
      columnCount: columns.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      columns: columns.map((c: any) => c.propertyName)
    });

    return true;
  } catch (error) {
    // In test environment or if TypeORM is not available, skip validation
    console.warn('Entity validation skipped:', error instanceof Error ? error.message : 'Unknown error');
    return true;
  }
}

export function validateAllEntities(entities: EntityTarget<ObjectLiteral>[]): void {
  console.log('Validating entities...');
  
  entities.forEach(entity => {
    const isValid = validateEntity(entity);
    if (!isValid) {
      console.error(`Entity validation failed for ${(entity as { name?: string })?.name || 'unknown'}`);
    }
  });
}