import { IDatabaseConnector, TableInfo } from '@/types/connector';
import { logger } from '@/utils/logger';

export interface RelationalImportOptions {
  primaryTable: string;
  maxDepth?: number;
  maxRecords?: number;
  includedTables?: string[];
  excludedTables?: string[];
  followReverse?: boolean; // Follow reverse foreign keys (one-to-many)
}

export interface TableRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-one';
}

export interface RelationalSchema {
  tables: Map<string, TableInfo>;
  relationships: TableRelationship[];
  primaryTable: string;
}

export class RelationalDataService {
  private connector: IDatabaseConnector;
  
  constructor(connector: IDatabaseConnector) {
    this.connector = connector;
  }

  /**
   * Analyze the database schema and build a relationship graph
   */
  async analyzeSchema(options: RelationalImportOptions): Promise<RelationalSchema> {
    const dbSchema = await this.connector.getDatabaseSchema();
    const schema: Map<string, TableInfo> = new Map();
    const relationships: TableRelationship[] = [];
    
    logger.info('Analyzing database schema', {
      totalTables: dbSchema.tables.length,
      primaryTable: options.primaryTable
    });
    
    // Build table map
    for (const table of dbSchema.tables) {
      if (options.excludedTables?.includes(table.name)) continue;
      if (options.includedTables && options.includedTables.length > 0 && !options.includedTables.includes(table.name)) continue;
      
      schema.set(table.name, table);
    }
    
    logger.info('Built table map', {
      includedTables: Array.from(schema.keys())
    });
    
    // Build relationships from foreign keys
    for (const table of dbSchema.tables) {
      if (!schema.has(table.name)) continue;
      
      logger.debug(`Checking foreign keys for table ${table.name}`, {
        hasForeignKeys: !!table.foreignKeys,
        foreignKeyCount: table.foreignKeys?.length || 0
      });
      
      if (table.foreignKeys) {
        for (const fk of table.foreignKeys) {
          logger.debug('Processing foreign key', {
            fromTable: table.name,
            fromColumn: fk.columnName,
            toTable: fk.referencedTable,
            toColumn: fk.referencedColumn,
            isInSchema: schema.has(fk.referencedTable)
          });
          
          // Only include if referenced table is in our schema
          if (schema.has(fk.referencedTable)) {
            relationships.push({
              fromTable: table.name,
              fromColumn: fk.columnName,
              toTable: fk.referencedTable,
              toColumn: fk.referencedColumn,
              relationshipType: 'many-to-one' // Foreign keys are typically many-to-one
            });
            
            // Add reverse relationship if requested
            if (options.followReverse) {
              relationships.push({
                fromTable: fk.referencedTable,
                fromColumn: fk.referencedColumn,
                toTable: table.name,
                toColumn: fk.columnName,
                relationshipType: 'one-to-many'
              });
            }
          }
        }
      }
    }
    
    logger.info('Schema analysis complete', {
      tableCount: schema.size,
      relationshipCount: relationships.length,
      relationships: relationships.map(r => `${r.fromTable}.${r.fromColumn} -> ${r.toTable}.${r.toColumn} (${r.relationshipType})`)
    });
    
    return {
      tables: schema,
      relationships: relationships,
      primaryTable: options.primaryTable
    };
  }

  /**
   * Import data following relationships to create nested JSON
   */
  async importRelationalData(
    options: RelationalImportOptions
  ): Promise<Record<string, unknown>[]> {
    // First analyze the schema
    const schema = await this.analyzeSchema(options);
    
    // Check if primary table exists
    if (!schema.tables.has(options.primaryTable)) {
      throw new Error(`Primary table '${options.primaryTable}' not found in schema`);
    }
    
    logger.info('Starting relational import', {
      primaryTable: options.primaryTable,
      maxDepth: options.maxDepth,
      maxRecords: options.maxRecords,
      includedTables: options.includedTables,
      foundTables: Array.from(schema.tables.keys()),
      relationshipCount: schema.relationships.length
    });
    
    // Get primary table data
    const primaryData = await this.connector.getSampleData(
      options.primaryTable, 
      options.maxRecords || 100
    );
    
    logger.info(`Retrieved ${primaryData.length} records from primary table`);
    
    // For each record, follow relationships to build nested structure
    const results: Record<string, unknown>[] = [];
    
    for (const record of primaryData) {
      const nestedRecord = await this.buildNestedRecord(
        options.primaryTable,
        record,
        schema,
        new Set<string>(), // Track visited tables to avoid cycles
        0, // Current depth
        options.maxDepth || 3,
        new Set<string>(), // Track visited records to avoid circular references
        false // Not a reverse relationship
      );
      results.push(nestedRecord);
    }
    
    logger.info('Relational import complete', { recordCount: results.length });
    return results;
  }

  /**
   * Recursively build nested record by following relationships
   */
  private async buildNestedRecord(
    tableName: string,
    record: Record<string, unknown>,
    schema: RelationalSchema,
    visited: Set<string>,
    currentDepth: number,
    maxDepth: number,
    visitedRecords: Set<string> = new Set(),
    isReverseRelationship: boolean = false
  ): Promise<Record<string, unknown>> {
    // Create a unique key for this record to detect circular references
    const tableInfo = schema.tables.get(tableName);
    const primaryKey = tableInfo?.primaryKey?.[0] || 'id';
    const recordKey = `${tableName}_${record[primaryKey]}`;
    
    // For reverse relationships (one-to-many), limit depth more aggressively
    const effectiveMaxDepth = isReverseRelationship ? Math.min(maxDepth, 2) : maxDepth;
    
    // Avoid infinite recursion and circular references
    if (currentDepth >= effectiveMaxDepth || visitedRecords.has(recordKey)) {
      logger.debug('Skipping nested record', { 
        tableName, 
        currentDepth, 
        effectiveMaxDepth,
        circularReference: visitedRecords.has(recordKey),
        isReverseRelationship
      });
      // Return just the ID reference to avoid redundancy
      return { 
        [`${primaryKey}`]: record[primaryKey],
        _ref: tableName 
      };
    }
    
    const newVisitedRecords = new Set(visitedRecords);
    newVisitedRecords.add(recordKey);
    
    visited.add(tableName);
    const result = { ...record };
    
    // Find relationships from this table
    const outgoingRelationships = schema.relationships.filter(
      rel => rel.fromTable === tableName
    );
    
    logger.debug('Building nested record', {
      tableName,
      currentDepth,
      outgoingRelationships: outgoingRelationships.length,
      relationships: outgoingRelationships.map(r => `${r.fromTable}.${r.fromColumn} -> ${r.toTable}.${r.toColumn}`)
    });
    
    for (const rel of outgoingRelationships) {
      const foreignKeyValue = record[rel.fromColumn];
      
      // Skip reverse relationships if we're already in a reverse relationship
      if (isReverseRelationship && rel.relationshipType === 'one-to-many') {
        continue;
      }
      
      if (foreignKeyValue !== null && foreignKeyValue !== undefined) {
        try {
          if (rel.relationshipType === 'many-to-one' || rel.relationshipType === 'one-to-one') {
            // Fetch single related record
            const query = `SELECT * FROM ${this.escapeIdentifier(rel.toTable)} WHERE ${this.escapeIdentifier(rel.toColumn)} = $1`;
            logger.debug('Fetching related record', {
              query,
              foreignKeyValue,
              relationship: `${rel.fromTable}.${rel.fromColumn} -> ${rel.toTable}.${rel.toColumn}`
            });
            const relatedResult = await this.connector.executeQuery(query, [foreignKeyValue]);
            
            if (relatedResult.rows.length > 0) {
              // Convert to object format
              const relatedRecord: Record<string, unknown> = {};
              relatedResult.columns.forEach((col, idx) => {
                relatedRecord[col] = relatedResult.rows[0][idx];
              });
              
              // Recursively build nested structure
              const nestedRelated = await this.buildNestedRecord(
                rel.toTable,
                relatedRecord,
                schema,
                new Set(visited), // New visited set for each branch
                currentDepth + 1,
                maxDepth,
                newVisitedRecords,
                false
              );
              
              // Add to result with table name as key
              result[`_${rel.toTable}`] = nestedRelated;
            }
          } else if (rel.relationshipType === 'one-to-many') {
            // Fetch multiple related records - limit to 10 for nested objects
            const limit = currentDepth === 0 ? 100 : 10;
            const query = `SELECT * FROM ${this.escapeIdentifier(rel.toTable)} WHERE ${this.escapeIdentifier(rel.toColumn)} = $1 LIMIT ${limit}`;
            const relatedResult = await this.connector.executeQuery(query, [foreignKeyValue]);
            
            if (relatedResult.rows.length > 0) {
              const relatedRecords: Record<string, unknown>[] = [];
              
              for (const row of relatedResult.rows) {
                const relatedRecord: Record<string, unknown> = {};
                relatedResult.columns.forEach((col, idx) => {
                  relatedRecord[col] = row[idx];
                });
                
                // Recursively build nested structure
                const nestedRelated = await this.buildNestedRecord(
                  rel.toTable,
                  relatedRecord,
                  schema,
                  new Set(visited), // New visited set for each branch
                  currentDepth + 1,
                  maxDepth,
                  newVisitedRecords,
                  true  // This is a reverse relationship
                );
                
                relatedRecords.push(nestedRelated);
              }
              
              // Add array to result with table name as key
              result[`_${rel.toTable}_list`] = relatedRecords;
              
              // Add count if there might be more
              if (relatedResult.rows.length === limit) {
                result[`_${rel.toTable}_count`] = `${limit}+`;
              }
            }
          }
        } catch (error) {
          logger.warn(`Failed to fetch related data from ${rel.toTable}:`, error);
          // Continue with other relationships
        }
      }
    }
    
    visited.delete(tableName); // Remove from visited when done
    return result;
  }

  /**
   * Get a visual representation of the relationships
   */
  getRelationshipDiagram(schema: RelationalSchema): string {
    const lines: string[] = [];
    lines.push(`Primary Table: ${schema.primaryTable}`);
    lines.push('');
    lines.push('Relationships:');
    
    for (const rel of schema.relationships) {
      const arrow = rel.relationshipType === 'one-to-many' ? '-->>' : '-->';
      lines.push(`  ${rel.fromTable}.${rel.fromColumn} ${arrow} ${rel.toTable}.${rel.toColumn}`);
    }
    
    return lines.join('\n');
  }

  private escapeIdentifier(identifier: string): string {
    // Basic SQL identifier escaping - should be overridden per database type
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}