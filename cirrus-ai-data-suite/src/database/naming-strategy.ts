import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

/**
 * Convert camelCase to snake_case
 */
function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Custom naming strategy that ensures consistent column names across all database types.
 * This prevents case sensitivity issues between SQLite (development) and PostgreSQL (production).
 */
export class ConsistentNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  /**
   * Force all table names to be lowercase with underscores
   */
  tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName ? userSpecifiedName : snakeCase(targetName);
  }

  /**
   * Force all column names to be lowercase with underscores
   * This ensures consistency between SQLite and PostgreSQL
   */
  columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]): string {
    // If a custom name is specified in @Column({ name: 'customName' }), use it as-is
    if (customName) {
      return customName;
    }
    
    // Otherwise, convert camelCase to snake_case
    const name = embeddedPrefixes.length
      ? embeddedPrefixes.join('_') + '_' + propertyName
      : propertyName;
    
    return snakeCase(name);
  }

  /**
   * Relation names should also be consistent
   */
  relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  /**
   * Join column names
   */
  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(relationName + '_' + referencedColumnName);
  }

  /**
   * Join table names for many-to-many relations
   */
  joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _secondPropertyName: string
  ): string {
    return snakeCase(firstTableName + '_' + firstPropertyName.replace(/\./gi, '_') + '_' + secondTableName);
  }

  /**
   * Join table column names
   */
  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return snakeCase(tableName + '_' + (columnName ? columnName : propertyName));
  }

  /**
   * Class table inheritance parent column name
   */
  classTableInheritanceParentColumnName(
    parentTableName: string,
    parentTableIdPropertyName: string
  ): string {
    return snakeCase(parentTableName + '_' + parentTableIdPropertyName);
  }

  /**
   * Eager join relation alias
   */
  eagerJoinRelationAlias(alias: string, propertyPath: string): string {
    return alias + '__' + propertyPath.replace('.', '_');
  }
}