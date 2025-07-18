/* eslint-disable @typescript-eslint/no-explicit-any */

import { DataSourceService } from './dataSourceService';
import { PatternService } from './patternService';
import { CatalogFieldService } from './catalogFieldService';
import { TableMetadataService } from './tableMetadataService';
import { FieldAnnotationService } from './fieldAnnotationService';
import { SourceRelationshipService } from './sourceRelationshipService';
import { getDatabase } from '@/database/connection';
import { logger } from '@/utils/logger';

export interface QueryContext {
  dataSources: Array<{
    id: string;
    name: string;
    type: string;
    summary?: string;
    recordCount?: number;
    tags?: string[];
    aiKeywords?: string[];
  }>;
  tables: Array<{
    id: string;
    dataSourceId: string;
    dataSourceName: string;
    tableName: string;
    summary?: string;
    recordCount?: number;
    columns?: Array<{
      name: string;
      type: string;
      isPrimaryKey?: boolean;
      isForeignKey?: boolean;
      references?: {
        table: string;
        column: string;
      };
    }>;
  }>;
  fields: Array<{
    id: string;
    fieldName: string;
    displayName: string;
    dataType?: string;
    category?: string;
    isPII?: boolean;
    description?: string;
    examples?: string[];
    tableName?: string;
    dataSourceName?: string;
  }>;
  patterns: Array<{
    id: string;
    name: string;
    description?: string;
    category?: string;
    regex?: string;
    examples?: string[];
  }>;
  annotations: Array<{
    fieldPath: string;
    dataSourceId: string;
    tableName?: string;
    fieldName: string;
    businessName?: string;
    description?: string;
    isPII?: boolean;
    piiType?: string;
  }>;
  relationships?: Array<{
    sourceTable: string;
    sourceField: string;
    targetTable: string;
    targetField: string;
    type: string;
    dataSourceId: string;
  }>;
}

export class QueryContextService {

  /**
   * Gather all relevant metadata for query context
   */
  static async gatherFullContext(): Promise<QueryContext> {
    try {
      await getDatabase();

      // Initialize empty context
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let dataSourcesContext: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let tablesContext: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let fieldsContext: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let patternsContext: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let annotationsContext: any[] = [];

      // Gather data sources with summaries
      try {
        const dataSources = await DataSourceService.getAllDataSources();
        dataSourcesContext = dataSources.map(ds => {
          // Parse aiKeywords if it's a JSON string
          let keywords: string[] = [];
          if (ds.aiKeywords) {
            try {
              keywords = JSON.parse(ds.aiKeywords);
            } catch {
              // If parsing fails, treat as empty array
              keywords = [];
            }
          }
          
          return {
            id: ds.id,
            name: ds.name,
            type: ds.type,
            summary: ds.userSummary || ds.aiSummary,
            recordCount: ds.recordCount,
            tags: ds.tags,
            aiKeywords: keywords
          };
        });

        // Gather table metadata
        try {
          const tables = await TableMetadataService.getAllTables();
          tablesContext = await Promise.all(tables.map(async table => {
            const dataSource = dataSources.find(ds => ds.id === table.dataSourceId);
            
            // Get column information if available
            let columns = undefined;
            const db = await getDatabase();
            const tableEntity = await db
              .getRepository('DataSourceTableEntity')
              .findOne({ where: { id: table.id } });
            
            if (tableEntity) {
              // Check multiple possible locations for column information
              let rawColumns = null;
              
              // Try metadata.columns first
              if (tableEntity.metadata && typeof tableEntity.metadata === 'object') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const metadata = tableEntity.metadata as any;
                if (metadata.columns && Array.isArray(metadata.columns)) {
                  rawColumns = metadata.columns;
                }
              }
              
              // Try schemaInfo if no columns in metadata
              if (!rawColumns && tableEntity.schemaInfo) {
                try {
                  const schemaData = JSON.parse(tableEntity.schemaInfo);
                  if (schemaData.columns && Array.isArray(schemaData.columns)) {
                    rawColumns = schemaData.columns;
                  } else if (schemaData.fields && Array.isArray(schemaData.fields)) {
                    // Handle fields format (common in file imports)
                    rawColumns = schemaData.fields;
                  } else if (Array.isArray(schemaData)) {
                    rawColumns = schemaData;
                  }
                } catch {
                  // Ignore parse errors
                }
              }
              
              if (rawColumns && Array.isArray(rawColumns)) {
                columns = rawColumns.map(col => ({
                  name: col.name || col.column_name || col.field,
                  type: col.type || col.data_type || col.dataType || 'unknown',
                  isPrimaryKey: col.primary || col.is_primary_key || col.primaryKey || false,
                  isForeignKey: col.isForeignKey || col.foreignKey || col.is_foreign_key || false,
                  references: col.references || col.referencedTable ? {
                    table: col.referencedTable || col.references?.table,
                    column: col.referencedColumn || col.references?.column
                  } : undefined
                }));
              }
            }
            
            return {
              id: table.id,
              dataSourceId: table.dataSourceId,
              dataSourceName: dataSource?.name || 'Unknown',
              tableName: table.tableName,
              summary: table.userSummary || table.aiSummary,
              recordCount: table.recordCount,
              columns
            };
          }));
        } catch (tableError) {
          logger.error('Failed to gather table metadata:', tableError);
          // Continue with empty tables
        }
      } catch (dsError) {
        logger.error('Failed to gather data sources:', dsError);
        // Continue with empty data sources
      }

      // Gather fields from tables and catalog
      try {
        // First, get catalog fields
        const catalogFields = await CatalogFieldService.fetchFields();
        const catalogFieldsContext = catalogFields.map(field => ({
          id: field.id,
          fieldName: field.name,
          displayName: field.displayName,
          dataType: field.dataType,
          category: field.category,
          isPII: false,
          description: field.description,
          examples: []
        }));
        
        // Then, extract fields from tables
        const tableFieldsContext: typeof fieldsContext = [];
        const seenFields = new Set<string>(); // Track unique fields
        
        for (const table of tablesContext) {
          // Try to get column information from the table
          if (table.dataSourceId) {
            try {
              const db = await getDatabase();
              const tableEntity = await db
                .getRepository('DataSourceTableEntity')
                .findOne({ where: { id: table.id } });
              
              if (tableEntity) {
                // Check multiple possible locations for column information
                let rawColumns = null;
                
                // Try metadata.columns first
                if (tableEntity.metadata && typeof tableEntity.metadata === 'object') {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const metadata = tableEntity.metadata as any;
                  if (metadata.columns && Array.isArray(metadata.columns)) {
                    rawColumns = metadata.columns;
                  }
                }
                
                // Try schemaInfo if no columns in metadata
                if (!rawColumns && tableEntity.schemaInfo) {
                  try {
                    const schemaData = JSON.parse(tableEntity.schemaInfo);
                    if (schemaData.columns && Array.isArray(schemaData.columns)) {
                      rawColumns = schemaData.columns;
                    } else if (schemaData.fields && Array.isArray(schemaData.fields)) {
                      // Handle fields format (common in file imports)
                      rawColumns = schemaData.fields;
                    } else if (Array.isArray(schemaData)) {
                      rawColumns = schemaData;
                    }
                  } catch {
                    // Ignore parse errors
                  }
                }
                
                // Also check if transformed data has fields
                const dataSource = dataSourcesContext.find(ds => ds.id === table.dataSourceId);
                if (!rawColumns && dataSource) {
                  try {
                    const dsEntity = await DataSourceService.getDataSourceById(dataSource.id);
                    if (dsEntity?.transformedData) {
                      const transformedData = JSON.parse(dsEntity.transformedData);
                      
                      // Handle UnifiedDataCatalog structure
                      if (transformedData.records && Array.isArray(transformedData.records)) {
                        logger.info(`Transformed data is UnifiedDataCatalog with ${transformedData.records.length} records`);
                        if (transformedData.records.length > 0) {
                          // Check if records are wrapped in UnifiedDataRecord structure
                          const firstRecord = transformedData.records[0];
                          if (firstRecord.data && firstRecord.sourceId) {
                            // Extract fields from the data property
                            const actualData = firstRecord.data;
                            rawColumns = Object.keys(actualData).map(key => ({
                              name: key,
                              type: typeof actualData[key] === 'number' ? 'number' : 
                                    typeof actualData[key] === 'boolean' ? 'boolean' : 'string'
                            }));
                          } else {
                            // Direct record structure
                            rawColumns = Object.keys(firstRecord).map(key => ({
                              name: key,
                              type: typeof firstRecord[key] === 'number' ? 'number' : 
                                    typeof firstRecord[key] === 'boolean' ? 'boolean' : 'string'
                            }));
                          }
                        }
                      } else if (Array.isArray(transformedData) && transformedData.length > 0) {
                        // Direct array of records
                        const firstRecord = transformedData[0];
                        if (typeof firstRecord === 'object' && firstRecord !== null) {
                          rawColumns = Object.keys(firstRecord).map(key => ({
                            name: key,
                            type: typeof firstRecord[key] === 'number' ? 'number' : 
                                  typeof firstRecord[key] === 'boolean' ? 'boolean' : 'string'
                          }));
                        }
                      }
                    }
                  } catch {
                    // Silently skip extraction errors
                  }
                }
                
                if (rawColumns && Array.isArray(rawColumns)) {
                  for (const column of rawColumns) {
                    const fieldName = column.name || column.column_name || column.field;
                    if (fieldName) {
                      const fieldKey = `${table.tableName}_${fieldName}`.toLowerCase();
                      if (!seenFields.has(fieldKey)) {
                        seenFields.add(fieldKey);
                        tableFieldsContext.push({
                          id: `${table.id}_${fieldName}`,
                          fieldName: fieldName,
                          displayName: fieldName,
                          dataType: column.type || column.data_type || column.dataType || 'unknown',
                          category: undefined,
                          isPII: false,
                          description: `Field in ${table.tableName}`,
                          examples: [],
                          tableName: table.tableName,
                          dataSourceName: table.dataSourceName
                        });
                      }
                    }
                  }
                }
              }
            } catch {
              // Silently skip column errors
            }
          }
        }
        
        
        // Combine catalog fields and table fields
        fieldsContext = [...catalogFieldsContext, ...tableFieldsContext];
      } catch (fieldError) {
        logger.error('Failed to gather fields:', fieldError);
        // Continue with empty fields
      }

      // Gather patterns
      try {
        const patterns = await PatternService.getAllPatterns();
        patternsContext = patterns.map(pattern => ({
          id: pattern.id,
          name: pattern.name,
          description: pattern.description,
          category: pattern.category,
          regex: pattern.regex,
          examples: pattern.examples
        }));
      } catch (patternError) {
        logger.error('Failed to gather patterns:', patternError);
        // Continue with empty patterns
      }

      // Gather field annotations
      try {
        const annotations = await FieldAnnotationService.getAllAnnotations();
        annotationsContext = annotations.map(annotation => ({
          fieldPath: annotation.fieldPath,
          dataSourceId: annotation.dataSourceId,
          tableName: undefined, // FieldAnnotationEntity doesn't have tableName
          fieldName: annotation.fieldName,
          businessName: annotation.businessContext || annotation.fieldName,
          description: annotation.description,
          isPII: annotation.isPII,
          piiType: annotation.piiType
        }));
      } catch (annotationError) {
        logger.error('Failed to gather field annotations:', annotationError);
        // Continue with empty annotations
      }

      // Check if data sources have relationship information
      if (dataSourcesContext.length > 0) {
        try {
          const dataSources = await DataSourceService.getAllDataSources();
          for (const ds of dataSources) {
            if (ds.configuration && typeof ds.configuration === 'object') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const config = ds.configuration as any;
              if (config.relationships) {
              }
            }
          }
        } catch {
          // Silently skip relationship check errors
        }
      }
      
      // Extract relationships from table metadata
      const relationships: Array<{
        sourceTable: string;
        sourceField: string;
        targetTable: string;
        targetField: string;
        type: string;
        dataSourceId: string;
      }> = [];
      
      for (const table of tablesContext) {
        if (table.columns) {
          for (const column of table.columns) {
            if (column.isForeignKey && column.references) {
              relationships.push({
                sourceTable: table.tableName,
                sourceField: column.name,
                targetTable: column.references.table,
                targetField: column.references.column,
                type: 'foreign_key',
                dataSourceId: table.dataSourceId
              });
            }
          }
        }
      }
      
      // Also check table metadata for relationships
      for (const table of tablesContext) {
        try {
          const db = await getDatabase();
          const tableEntity = await db
            .getRepository('DataSourceTableEntity')
            .findOne({ where: { id: table.id } });
          
          if (tableEntity?.metadata && typeof tableEntity.metadata === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const metadata = tableEntity.metadata as any;
            const foreignKeys = metadata.relationships || metadata.foreignKeys;
            
            if (foreignKeys && Array.isArray(foreignKeys)) {
              
              // Extract relationships from foreign keys
              for (const fk of foreignKeys) {
                if (fk.columnName && fk.referencedTable && fk.referencedColumn) {
                  relationships.push({
                    sourceTable: table.tableName,
                    sourceField: fk.columnName,
                    targetTable: fk.referencedTable,
                    targetField: fk.referencedColumn,
                    type: 'foreign_key',
                    dataSourceId: table.dataSourceId
                  });
                }
              }
            }
          }
        } catch {
          // Silently skip metadata errors
        }
      }
      
      
      return {
        dataSources: dataSourcesContext,
        tables: tablesContext,
        fields: fieldsContext,
        patterns: patternsContext,
        annotations: annotationsContext,
        relationships
      };
    } catch (error) {
      logger.error('Failed to gather query context:', error);
      throw new Error('Failed to gather metadata context');
    }
  }

  /**
   * Build a context prompt for the LLM based on gathered metadata
   */
  static buildContextPrompt(context: QueryContext, maxTokens: number = 4000): string {
    const lines: string[] = [
      'Data catalog context:',
      '',
      '## Data Sources',
      ...context.dataSources.slice(0, 10).map(ds => 
        `- ${ds.name} (${ds.type}): ${ds.recordCount || 0} records`
      ),
      '',
      '## Tables',
      ...context.tables.slice(0, 15).map(table => {
        const columnInfo = table.columns && table.columns.length > 0
          ? ` [${table.columns.length} columns: ${table.columns.slice(0, 5).map(c => c.name).join(', ')}${table.columns.length > 5 ? '...' : ''}]`
          : '';
        return `- ${table.dataSourceName}.${table.tableName}: ${table.recordCount || 0} records${columnInfo}`;
      }),
      ''
    ];
    
    // Only include fields if they're relevant
    if (context.fields.length > 0 && context.fields.length < 200) {
      lines.push(
        '## Key Fields',
        ...context.fields.slice(0, 30).map(field =>
          `- ${field.fieldName}${field.tableName ? ` (${field.tableName})` : ''}: ${field.dataType || 'unknown'}`
        ),
        ''
      );
    }
    
    // Only include relationships if present
    if (context.relationships && context.relationships.length > 0) {
      lines.push(
        '## Relationships',
        ...context.relationships.slice(0, 10).map(rel =>
          `- ${rel.sourceTable}.${rel.sourceField} -> ${rel.targetTable}.${rel.targetField}`
        ),
        ''
      );
    }

    // Join and truncate if needed
    let prompt = lines.join('\n');
    
    // Rough token estimation (4 chars per token)
    const estimatedTokens = prompt.length / 4;
    if (estimatedTokens > maxTokens) {
      // Truncate to fit within token limit
      const maxChars = maxTokens * 4;
      prompt = prompt.substring(0, maxChars) + '\n... [Context truncated due to size]';
    }

    return prompt;
  }

  /**
   * Get context relevant to specific keywords in a query
   */
  static async getRelevantContext(query?: string): Promise<QueryContext> {
    const fullContext = await this.gatherFullContext();
    
    // If no query provided, return full context
    if (!query) {
      return fullContext;
    }
    
    // Extract keywords from query for filtering
    const queryLower = query.toLowerCase();
    // Remove punctuation and filter words
    const keywords = queryLower
      .replace(/[?!.,;:]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && !['what', 'where', 'when', 'which', 'average', 'count', 'show', 'the', 'and', 'for'].includes(word)
      );
    
    logger.info(`Query context: Processing query "${query}"`);
    logger.info(`Query context: Extracted keywords: ${JSON.stringify(keywords)}`);
    
    // If there are specific keywords, try to find relevant data sources
    let dataSources = fullContext.dataSources;
    
    if (keywords.length > 0) {
      // Filter data sources by relevance
      const relevantDataSources = fullContext.dataSources.filter(ds => {
        const nameMatch = keywords.some(kw => ds.name.toLowerCase().includes(kw));
        const summaryMatch = ds.summary && keywords.some(kw => ds.summary!.toLowerCase().includes(kw));
        const tagMatch = ds.tags && ds.tags.some(tag => 
          keywords.some(kw => tag.toLowerCase().includes(kw))
        );
        const aiKeywordMatch = ds.aiKeywords && ds.aiKeywords.some(aiKeyword => 
          keywords.some(kw => {
            const aiKwLower = aiKeyword.toLowerCase();
            const kwLower = kw.toLowerCase();
            // Check both directions: query keyword in AI keyword OR AI keyword in query keyword
            return aiKwLower.includes(kwLower) || kwLower.includes(aiKwLower);
          })
        );
        
        // Log matching details for debugging
        if (nameMatch || summaryMatch || tagMatch || aiKeywordMatch) {
          logger.info(`Data source "${ds.name}" matched: name=${nameMatch}, summary=${summaryMatch}, tag=${tagMatch}, aiKeyword=${aiKeywordMatch}`);
          if (aiKeywordMatch && ds.aiKeywords) {
            logger.info(`  AI Keywords for "${ds.name}": ${JSON.stringify(ds.aiKeywords)}`);
          }
        }
        
        return nameMatch || summaryMatch || tagMatch || aiKeywordMatch;
      });
      
      // If we found relevant sources, use them; otherwise include all
      if (relevantDataSources.length > 0) {
        logger.info(`Found ${relevantDataSources.length} relevant data sources for keywords: ${JSON.stringify(keywords)}`);
        dataSources = relevantDataSources;
      } else {
        logger.info(`No data sources matched keywords: ${JSON.stringify(keywords)}. Including all ${fullContext.dataSources.length} data sources.`);
        // Log all data sources and their keywords for debugging
        fullContext.dataSources.forEach(ds => {
          logger.info(`  - "${ds.name}": aiKeywords=${JSON.stringify(ds.aiKeywords || [])}`);
        });
      }
    }
    
    // Get data source IDs for filtering tables
    const dataSourceIds = new Set(dataSources.map(ds => ds.id));
    
    // Filter tables by data source
    const relevantTables = fullContext.tables.filter(table => 
      dataSourceIds.has(table.dataSourceId)
    );
    
    // Filter fields by keywords and relevant tables
    const tableNames = new Set(relevantTables.map(t => t.tableName));
    const relevantFields = fullContext.fields.filter(field => {
      const inRelevantTable = field.tableName && tableNames.has(field.tableName);
      const nameMatch = keywords.some(kw => 
        field.fieldName.toLowerCase().includes(kw) || 
        field.displayName.toLowerCase().includes(kw)
      );
      return inRelevantTable || nameMatch;
    });
    
    // Limit fields to most relevant ones
    const fields = relevantFields.length > 0 
      ? relevantFields.slice(0, 100)
      : fullContext.fields.slice(0, 50);
    
    // Filter annotations by data source
    const annotations = fullContext.annotations.filter(ann => 
      dataSourceIds.has(ann.dataSourceId)
    ).slice(0, 50);
    
    // Keep only relevant patterns
    const patterns = fullContext.patterns.slice(0, 20);
    
    // Filter relationships by data source
    const relationships = fullContext.relationships?.filter(rel => 
      dataSourceIds.has(rel.dataSourceId)
    ) || [];
    
    return {
      dataSources,
      tables: relevantTables,
      fields,
      patterns,
      annotations,
      relationships
    };
  }

  /**
   * Get enhanced context with relationship analysis for multi-source queries
   */
  static async getEnhancedRelevantContext(query?: string, maxSources = 5): Promise<{
    context: QueryContext;
    relationshipAnalysis: {
      relationships: any[];
      allowedPairs: Array<{ source1Id: string; source2Id: string; reason: string }>;
      suggestions: string[];
    };
    recommendedSources: string[];
  }> {
    // Get the basic relevant context
    const basicContext = await this.getRelevantContext(query);
    
    // If we have multiple data sources, analyze their relationships
    let relationshipAnalysis: {
      relationships: any[];
      allowedPairs: Array<{ source1Id: string; source2Id: string; reason: string }>;
      suggestions: string[];
    } = {
      relationships: [],
      allowedPairs: [],
      suggestions: []
    };
    
    let recommendedSources: string[] = [];
    
    if (basicContext.dataSources.length > 1) {
      // Analyze relationships between sources
      relationshipAnalysis = SourceRelationshipService.analyzeGroupRelationships(
        basicContext.dataSources.slice(0, maxSources) // Limit to prevent too much analysis
      );
      
      // Determine which sources to recommend for the query
      recommendedSources = this.selectOptimalSources(
        basicContext.dataSources,
        relationshipAnalysis,
        query
      );
      
      // Filter context to only include recommended sources if relationships are weak
      if (recommendedSources.length > 0 && recommendedSources.length < basicContext.dataSources.length) {
        const recommendedSourceIds = new Set(recommendedSources);
        
        const filteredContext = {
          ...basicContext,
          dataSources: basicContext.dataSources.filter(ds => recommendedSourceIds.has(ds.id)),
          tables: basicContext.tables.filter(table => recommendedSourceIds.has(table.dataSourceId)),
          annotations: basicContext.annotations.filter(ann => recommendedSourceIds.has(ann.dataSourceId)),
          relationships: basicContext.relationships?.filter(rel => recommendedSourceIds.has(rel.dataSourceId)) || []
        };
        
        logger.info(`Enhanced context: Filtered from ${basicContext.dataSources.length} to ${filteredContext.dataSources.length} sources based on relationship analysis`);
        
        return {
          context: filteredContext,
          relationshipAnalysis,
          recommendedSources
        };
      }
    }
    
    return {
      context: basicContext,
      relationshipAnalysis,
      recommendedSources: basicContext.dataSources.map(ds => ds.id)
    };
  }

  /**
   * Select optimal sources based on relationship analysis and query
   */
  private static selectOptimalSources(
    dataSources: QueryContext['dataSources'],
    relationshipAnalysis: { relationships: { relationshipType: string; allowJoin: boolean; source1: { id: string }; source2: { id: string } }[] },
    query?: string
  ): string[] {
    // If no query or only one source, return all
    if (!query || dataSources.length <= 1) {
      return dataSources.map(ds => ds.id);
    }
    
    // Find the strongest relationships
    const strongRelationships = relationshipAnalysis.relationships.filter(rel => 
      rel.relationshipType === 'strong' || rel.allowJoin
    );
    
    // If no strong relationships, prefer the most relevant single source
    if (strongRelationships.length === 0) {
      // Score sources by relevance to query
      const queryLower = query.toLowerCase();
      const scoredSources = dataSources.map(ds => {
        let score = 0;
        
        // Name match
        if (ds.name.toLowerCase().includes(queryLower.split(' ')[0])) {
          score += 3;
        }
        
        // Keyword matches
        if (ds.aiKeywords) {
          const keywordMatches = ds.aiKeywords.filter(kw => 
            queryLower.includes(kw.toLowerCase()) || kw.toLowerCase().includes(queryLower)
          ).length;
          score += keywordMatches * 2;
        }
        
        // Summary match
        if (ds.summary && ds.summary.toLowerCase().includes(queryLower)) {
          score += 1;
        }
        
        // Record count (prefer larger datasets for general queries)
        if (ds.recordCount && ds.recordCount > 100) {
          score += 0.5;
        }
        
        return { ...ds, relevanceScore: score };
      });
      
      // Return the top 2 most relevant sources
      const topSources = scoredSources
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 2);
      
      logger.info(`No strong relationships found. Selected top ${topSources.length} sources by relevance: ${topSources.map(s => s.name).join(', ')}`);
      
      return topSources.map(s => s.id);
    }
    
    // If we have strong relationships, include related sources
    const relatedSourceIds = new Set<string>();
    
    for (const rel of strongRelationships) {
      relatedSourceIds.add(rel.source1.id);
      relatedSourceIds.add(rel.source2.id);
    }
    
    logger.info(`Found ${strongRelationships.length} strong relationships. Including ${relatedSourceIds.size} related sources.`);
    
    return Array.from(relatedSourceIds);
  }
}