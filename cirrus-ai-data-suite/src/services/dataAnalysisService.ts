import { 
  DataQuery, 
  QueryOperation, 
  QueryResult, 
  FilterCondition,
  AggregateField,
  QueryMetadata,
  ComparisonOperator
} from '@/types/dataAnalysis';
import { DataSourceService } from './dataSourceService';
import { CodeExecutionService } from './codeExecutionService';
import { logger } from '@/utils/logger';

export class DataAnalysisService {
  /**
   * Execute a data analysis query
   */
  static async executeQuery(query: DataQuery): Promise<QueryResult> {
    // Handle code-based queries
    if (query.type === 'code') {
      return CodeExecutionService.executeCodeQuery(query);
    }
    
    const startTime = Date.now();
    const metadata: QueryMetadata = {
      recordsProcessed: 0,
      executionTime: 0,
      dataSources: []
    };

    try {
      // Validate query
      const validation = this.validateQuery(query);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          query
        };
      }

      // Load data from sources
      const data = await this.loadDataFromSources(query.sources, metadata, query.tables, query.joins);
      
      if (!data || data.length === 0) {
        return {
          success: true,
          data: null,
          metadata: {
            ...metadata,
            executionTime: Date.now() - startTime,
            warnings: ['No data found in specified sources']
          },
          query
        };
      }

      // Apply operations in sequence
      let result = data;
      for (const operation of query.operations || []) {
        logger.info(`Applying operation ${operation.type} to ${result.length} records`);
        if (operation.type === 'filter' && operation.conditions) {
          logger.info('Filter conditions:', JSON.stringify(operation.conditions));
        }
        result = await this.applyOperation(result, operation);
        logger.info(`After ${operation.type}: ${Array.isArray(result) ? result.length : 1} records`);
        if (!Array.isArray(result) && operation.type !== 'aggregate') {
          // If operation returns non-array (like aggregate), wrap it
          result = [result];
        }
      }

      // Format output
      const formattedResult = this.formatOutput(result, query.output || { format: 'table' });

      metadata.executionTime = Date.now() - startTime;

      return {
        success: true,
        data: formattedResult,
        metadata,
        query
      };
    } catch (error) {
      logger.error('Error executing data analysis query:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          ...metadata,
          executionTime: Date.now() - startTime
        },
        query
      };
    }
  }

  /**
   * Validate query structure and permissions
   */
  private static validateQuery(query: DataQuery): { valid: boolean; error?: string } {
    // Check required fields
    if (!query.sources || query.sources.length === 0) {
      return { valid: false, error: 'No data sources specified' };
    }

    if (!query.operations || query.operations.length === 0) {
      return { valid: false, error: 'No operations specified' };
    }

    // Validate operations
    for (const op of query.operations) {
      if (!['filter', 'aggregate', 'group', 'sort', 'limit'].includes(op.type)) {
        return { valid: false, error: `Invalid operation type: ${op.type}` };
      }

      // Validate specific operation requirements
      if (op.type === 'aggregate' && (!op.aggregations || op.aggregations.length === 0)) {
        return { valid: false, error: 'Aggregate operation requires aggregations' };
      }

      if (op.type === 'filter' && (!op.conditions || op.conditions.length === 0)) {
        return { valid: false, error: 'Filter operation requires conditions' };
      }
    }

    return { valid: true };
  }

  /**
   * Load data from specified data sources
   */
  private static async loadDataFromSources(
    sourceIds: string[], 
    metadata: QueryMetadata,
    tables?: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    joins?: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    logger.info(`Loading data from ${sourceIds.length} sources:`, sourceIds);
    if (tables && tables.length > 0) {
      logger.info(`Specific tables requested:`, tables);
    }
    if (joins && joins.length > 0) {
      logger.info(`Table joins requested:`, joins);
    }
    
    // If only one source, check if we need table-level operations
    if (sourceIds.length === 1) {
      // Check if tables are specified and meaningful (not just 'Main')
      const hasRealTables = tables && tables.length > 0 && 
        !(tables.length === 1 && tables[0] === 'Main');
      
      if (hasRealTables && tables.length > 1 && joins && joins.length > 0) {
        logger.info('Single source with multiple tables and joins - performing table-level query');
        return this.loadSingleDataSourceWithJoins(sourceIds[0], metadata, tables, joins);
      } else {
        logger.info('Single source detected, loading without join');
        return this.loadSingleDataSource(sourceIds[0], metadata, tables, joins);
      }
    }

    // For multiple sources, we need to consider relationships
    // First, load all data sources
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataSources = new Map<string, { name: string; records: any[] }>();
    
    for (const sourceId of sourceIds) {
      try {
        const dataSource = await DataSourceService.getDataSourceById(sourceId);
        if (!dataSource) {
          logger.warn(`Data source not found: ${sourceId}`);
          continue;
        }

        // Get transformed data if available
        let sourceData = null;
        if (dataSource.transformedData) {
          sourceData = JSON.parse(dataSource.transformedData);
        } else if (dataSource.type === 'json_transformed' && dataSource.configuration) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const config = dataSource.configuration as any;
          if (config.content) {
            sourceData = this.parseSourceContent(config.content);
          }
        }

        if (sourceData) {
          const records = this.extractRecords(sourceData);
          dataSources.set(dataSource.id, {
            name: dataSource.name,
            records: records
          });
          
          metadata.dataSources.push({
            id: dataSource.id,
            name: dataSource.name,
            recordCount: records.length
          });
        }
      } catch (error) {
        logger.error(`Error loading data source ${sourceId}:`, error);
      }
    }

    // IMPORTANT: Only join multiple sources if there are explicit join specifications
    // Do NOT automatically join unrelated data sources
    if (sourceIds.length > 1) {
      if (joins && joins.length > 0) {
        logger.info(`Multiple sources with explicit joins requested - performing cross-source join`);
        return this.performCrossSourceJoin(dataSources, joins, metadata);
      } else {
        logger.info(`Multiple sources requested (${sourceIds.length}), but no explicit joins provided - combining without joining`);
      }
    }
    
    // Fallback: just combine all records without joining
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allData: any[] = [];
    for (const [sourceId, sourceData] of dataSources) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allData.push(...sourceData.records.map((record: any) => ({
        ...record,
        _sourceId: sourceId,
        _sourceName: sourceData.name
      })));
    }

    metadata.recordsProcessed = allData.length;
    return allData;
  }

  /**
   * Load a single data source
   */
  private static async loadSingleDataSource(
    sourceId: string,
    metadata: QueryMetadata,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tables?: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    joins?: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    try {
      const dataSource = await DataSourceService.getDataSourceById(sourceId, true);
      if (!dataSource) {
        logger.warn(`Data source not found: ${sourceId}`);
        return [];
      }

      // Get transformed data if available
      let sourceData = null;
      if (dataSource.transformedData) {
        sourceData = JSON.parse(dataSource.transformedData);
      } else if (dataSource.type === 'json_transformed' && dataSource.configuration) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const config = dataSource.configuration as any;
        if (config.content) {
          sourceData = this.parseSourceContent(config.content);
        }
      }

      if (sourceData) {
        logger.info(`Source data type: ${typeof sourceData}, has records: ${!!sourceData.records}`);
        const records = this.extractRecords(sourceData);
        logger.info(`Extracted ${records.length} records from ${dataSource.name}`);
        
        metadata.dataSources.push({
          id: dataSource.id,
          name: dataSource.name,
          recordCount: records.length
        });
        metadata.recordsProcessed = records.length;
        
        // Log sample record structure and check if it contains nested tables
        if (records.length > 0) {
          logger.info(`Sample record from ${dataSource.name}:`, JSON.stringify(records[0], null, 2).substring(0, 500));
          
          // Check if the data is already structured as tables
          const firstRecord = records[0];
          if (firstRecord && typeof firstRecord === 'object') {
            const keys = Object.keys(firstRecord);
            logger.info(`Top-level keys in data:`, keys);
            
            // Check if these look like table names
            if (keys.some(k => k === '_allergies_list' || k === 'patient_info')) {
              logger.info('Data appears to be structured as tables already');
              // TODO: Extract and join the table data
            }
          }
        } else {
          logger.warn(`No records extracted from ${dataSource.name}`);
        }
        
        return records;
      } else {
        logger.warn(`No source data found for ${dataSource.name}`);
      }
    } catch (error) {
      logger.error(`Error loading data source ${sourceId}:`, error);
    }

    return [];
  }

  /**
   * Parse source content based on type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static parseSourceContent(content: any): any {
    if (typeof content === 'string') {
      try {
        // Try to parse as JSON first
        return JSON.parse(content);
      } catch {
        // If not JSON, try CSV
        if (content.includes(',') && content.includes('\n')) {
          return this.parseCSV(content);
        }
        // Return as is if can't parse
        return content;
      }
    }
    return content;
  }

  /**
   * Simple CSV parser
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static parseCSV(csv: string): any[] {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const record: any = {};
      headers.forEach((header, index) => {
        record[header] = this.parseValue(values[index]);
      });
      records.push(record);
    }

    return records;
  }

  /**
   * Parse string value to appropriate type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static parseValue(value: string): any {
    if (!value || value === '') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (!isNaN(Number(value))) return Number(value);
    return value;
  }

  /**
   * Load a single data source with table-level joins
   */
  private static async loadSingleDataSourceWithJoins(
    sourceId: string,
    metadata: QueryMetadata,
    tables: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    joins: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    try {
      const dataSource = await DataSourceService.getDataSourceById(sourceId, true);
      if (!dataSource) {
        logger.warn(`Data source not found: ${sourceId}`);
        return [];
      }

      // Get transformed data
      let sourceData = null;
      if (dataSource.transformedData) {
        sourceData = JSON.parse(dataSource.transformedData);
      } else if (dataSource.type === 'database' && dataSource.configuration) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const config = dataSource.configuration as any;
        if (config.data) {
          sourceData = config.data;
        }
      }

      if (!sourceData || !Array.isArray(sourceData)) {
        logger.warn('No data found for joins');
        return [];
      }

      // For database sources with relational data, the structure might be nested
      // We need to extract the individual tables
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tableData: Record<string, any[]> = {};
      
      // Log sample data structure to understand format
      if (sourceData.length > 0) {
        logger.info('Sample data structure:', JSON.stringify(sourceData[0], null, 2).substring(0, 500));
      }
      
      // Check if data is already in relational format
      if (sourceData.length > 0 && typeof sourceData[0] === 'object') {
        // For relational imports, data is typically structured as patient records with nested arrays
        // First, extract the main records (patients)
        if (tables.includes('patients')) {
          // The main records ARE the patient records
          tableData['patients'] = sourceData.map(record => {
            // Extract just the patient fields, not the nested arrays
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const patientRecord: any = {};
            for (const [key, value] of Object.entries(record)) {
              if (!Array.isArray(value) && !key.endsWith('_list')) {
                patientRecord[key] = value;
              }
            }
            return patientRecord;
          });
        }
        
        // Then extract nested tables
        for (const tableName of tables) {
          if (tableName === 'patients') continue; // Already handled
          
          // Check various naming conventions for nested arrays
          const possibleNames = [
            tableName,
            `_${tableName}_list`,
            `${tableName}_list`,
            tableName.toLowerCase(),
            tableName.toUpperCase()
          ];
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const allRecords: any[] = [];
          for (const record of sourceData) {
            for (const possibleName of possibleNames) {
              if (record[possibleName] && Array.isArray(record[possibleName])) {
                allRecords.push(...record[possibleName]);
                break;
              }
            }
          }
          
          if (allRecords.length > 0) {
            tableData[tableName] = allRecords;
          }
        }
        
        logger.info('Extracted table data:', Object.keys(tableData).map(t => `${t}: ${tableData[t]?.length || 0} records`));
      }
      
      // If we couldn't extract tables, fall back to treating as single table
      if (Object.keys(tableData).length === 0) {
        logger.warn('Could not extract table data, treating as single table');
        return sourceData;
      }
      
      // Perform joins
      if (joins.length > 0) {
        const join = joins[0]; // Start with first join
        const leftTable = tableData[join.from.table];
        const rightTable = tableData[join.to.table];
        
        if (!leftTable || !rightTable) {
          logger.error('Tables not found for join:', { from: join.from.table, to: join.to.table });
          return [];
        }
        
        logger.info(`Performing join: ${join.from.table}.${join.from.field} -> ${join.to.table}.${join.to.field}`);
        
        // Create lookup map for right table
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rightLookup = new Map<any, any>();
        for (const rightRecord of rightTable) {
          const key = rightRecord[join.to.field];
          rightLookup.set(key, rightRecord);
        }
        
        // Perform the join
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const joinedData: any[] = [];
        for (const leftRecord of leftTable) {
          const joinKey = leftRecord[join.from.field];
          const rightRecord = rightLookup.get(joinKey);
          
          if (rightRecord) {
            // Merge records
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const merged: any = { ...leftRecord };
            
            // Add fields from right record with table prefix to avoid conflicts
            for (const [key, value] of Object.entries(rightRecord)) {
              // Skip the join key as it's redundant
              if (key !== join.to.field) {
                // Use table name prefix for clarity
                merged[`${join.to.table}_${key}`] = value;
              }
            }
            
            joinedData.push(merged);
          } else if (join.type === 'left') {
            // For left joins, include records even without match
            joinedData.push(leftRecord);
          }
        }
        
        metadata.recordsProcessed = joinedData.length;
        logger.info(`Join completed with ${joinedData.length} records`);
        
        // Log sample joined record to see field names
        if (joinedData.length > 0) {
          logger.info('Sample joined record fields:', Object.keys(joinedData[0]));
        }
        
        return joinedData;
      }
      
      // If no joins, return the first table's data
      const firstTable = tables[0];
      return tableData[firstTable] || [];
      
    } catch (error) {
      logger.error(`Error loading data source with joins ${sourceId}:`, error);
      return [];
    }
  }

  /**
   * Perform cross-source join for related data sources
   */
  private static async performCrossSourceJoin(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataSources: Map<string, { name: string; records: any[] }>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    joins: any[],
    metadata: QueryMetadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> {
    try {
      logger.info('Performing cross-source join:', { 
        sources: Array.from(dataSources.keys()), 
        joinCount: joins.length 
      });

      if (joins.length === 0 || dataSources.size < 2) {
        logger.warn('Not enough sources or joins for cross-source operation');
        // Return combined data without joining
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const combined: any[] = [];
        for (const [sourceId, sourceData] of dataSources) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          combined.push(...sourceData.records.map((record: any) => ({
            ...record,
            _sourceId: sourceId,
            _sourceName: sourceData.name
          })));
        }
        return combined;
      }

      // For now, we'll handle simple 2-source joins
      // This can be extended to handle multiple joins in sequence
      const join = joins[0];
      
      // Parse the join specification
      // Expected format: { from: { source: 'id1', field: 'field1' }, to: { source: 'id2', field: 'field2' }, type: 'inner|left|right' }
      const fromSource = dataSources.get(join.from.source || join.from.table);
      const toSource = dataSources.get(join.to.source || join.to.table);

      if (!fromSource || !toSource) {
        logger.error('Source data not found for join:', { 
          from: join.from.source || join.from.table, 
          to: join.to.source || join.to.table 
        });
        // Return combined data without joining
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const combined: any[] = [];
        for (const [sourceId, sourceData] of dataSources) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          combined.push(...sourceData.records.map((record: any) => ({
            ...record,
            _sourceId: sourceId,
            _sourceName: sourceData.name
          })));
        }
        return combined;
      }

      const joinType = join.type || 'inner';
      const fromField = join.from.field;
      const toField = join.to.field;

      logger.info(`Performing ${joinType} join: ${fromSource.name}.${fromField} -> ${toSource.name}.${toField}`);

      // Create lookup map for the "to" source
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toLookup = new Map<any, any[]>();
      for (const record of toSource.records) {
        const key = this.getFieldValue(record, toField);
        if (key !== null && key !== undefined) {
          if (!toLookup.has(key)) {
            toLookup.set(key, []);
          }
          toLookup.get(key)!.push(record);
        }
      }

      // Perform the join
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const joinedData: any[] = [];
      
      for (const fromRecord of fromSource.records) {
        const joinKey = this.getFieldValue(fromRecord, fromField);
        const toRecords = toLookup.get(joinKey) || [];

        if (toRecords.length > 0) {
          // For each matching record in the "to" source
          for (const toRecord of toRecords) {
            // Create merged record
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const merged: any = {
              ...fromRecord,
              _sourceId: join.from.source || join.from.table,
              _sourceName: fromSource.name
            };

            // Add fields from the "to" record with source prefix
            for (const [key, value] of Object.entries(toRecord)) {
              // Don't duplicate the join key
              if (key !== toField && !key.startsWith('_')) {
                merged[`${toSource.name}_${key}`] = value;
              }
            }

            joinedData.push(merged);
          }
        } else if (joinType === 'left') {
          // For left joins, include records from "from" source even without matches
          joinedData.push({
            ...fromRecord,
            _sourceId: join.from.source || join.from.table,
            _sourceName: fromSource.name
          });
        }
      }

      // Handle right joins
      if (joinType === 'right') {
        // Find records in "to" source that don't have matches
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matchedKeys = new Set<any>();
        for (const fromRecord of fromSource.records) {
          const key = this.getFieldValue(fromRecord, fromField);
          if (key !== null && key !== undefined) {
            matchedKeys.add(key);
          }
        }

        for (const toRecord of toSource.records) {
          const key = this.getFieldValue(toRecord, toField);
          if (!matchedKeys.has(key)) {
            joinedData.push({
              ...toRecord,
              _sourceId: join.to.source || join.to.table,
              _sourceName: toSource.name
            });
          }
        }
      }

      metadata.recordsProcessed = joinedData.length;
      logger.info(`Cross-source join completed with ${joinedData.length} records`);

      return joinedData;
    } catch (error) {
      logger.error('Error performing cross-source join:', error);
      // Return combined data without joining as fallback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const combined: any[] = [];
      for (const [sourceId, sourceData] of dataSources) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        combined.push(...sourceData.records.map((record: any) => ({
          ...record,
          _sourceId: sourceId,
          _sourceName: sourceData.name
        })));
      }
      return combined;
    }
  }

  /**
   * Extract records from various data formats
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static extractRecords(data: any): any[] {
    // If already an array, check if it contains UnifiedDataRecord structures
    if (Array.isArray(data)) {
      // Check if first element has the UnifiedDataRecord structure
      if (data.length > 0 && data[0].data && data[0].sourceId && data[0].recordIndex !== undefined) {
        logger.info('Extracting data from UnifiedDataRecord array');
        return data.map(record => record.data || record);
      }
      return data;
    }

    // If it has a records property (UnifiedDataCatalog structure)
    if (data.records && Array.isArray(data.records)) {
      // Check if records contain UnifiedDataRecord structures
      if (data.records.length > 0 && data.records[0].data && data.records[0].sourceId) {
        logger.info('Extracting data from UnifiedDataCatalog records');
        return data.records.map((record: { data?: Record<string, unknown> }) => record.data || record);
      }
      return data.records;
    }

    // If it has a data property
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }

    // If it's an object with array values (like grouped data)
    if (typeof data === 'object') {
      const arrays = Object.values(data).filter(v => Array.isArray(v));
      if (arrays.length === 1) {
        return arrays[0];
      }
    }

    // Wrap single object in array
    return [data];
  }

  /**
   * Apply a single operation to the data
   */
  private static async applyOperation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[], 
    operation: QueryOperation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    switch (operation.type) {
      case 'filter':
        return this.applyFilter(data, operation.conditions || []);
      
      case 'aggregate':
        return this.applyAggregate(data, operation.aggregations || [], operation.groupBy);
      
      case 'sort':
        return this.applySort(data, operation.sortBy || []);
      
      case 'limit':
        return this.applyLimit(data, operation.limit, operation.offset);
      
      case 'group':
        return this.applyGroup(data, operation.groupBy || []);
      
      default:
        return data;
    }
  }

  /**
   * Apply filter conditions
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static applyFilter(data: any[], conditions: FilterCondition[]): any[] {
    if (conditions.length === 0) return data;

    return data.filter(record => {
      let result = true;
      let currentLogical: 'and' | 'or' = 'and';

      for (let i = 0; i < conditions.length; i++) {
        const condition = conditions[i];
        const matches = this.evaluateCondition(record, condition);

        if (i === 0) {
          result = matches;
        } else {
          if (currentLogical === 'and') {
            result = result && matches;
          } else {
            result = result || matches;
          }
        }

        currentLogical = condition.logical || 'and';
      }

      return result;
    });
  }

  /**
   * Evaluate a single condition
   */
  private static evaluateCondition(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    record: any, 
    condition: FilterCondition
  ): boolean {
    const fieldValue = this.getFieldValue(record, condition.field);
    const compareValue = condition.value;

    // Handle array field values (e.g., when field path returns array of values)
    if (Array.isArray(fieldValue)) {
      // For array fields, check if any value matches
      return fieldValue.some(val => this.evaluateSingleValue(val, condition.operator, compareValue));
    }
    
    return this.evaluateSingleValue(fieldValue, condition.operator, compareValue);
  }

  private static evaluateSingleValue(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fieldValue: any,
    operator: ComparisonOperator,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    compareValue: any
  ): boolean {
    switch (operator) {
      case 'eq':
        return fieldValue === compareValue;
      case 'ne':
        return fieldValue !== compareValue;
      case 'gt':
        return fieldValue > compareValue;
      case 'gte':
        return fieldValue >= compareValue;
      case 'lt':
        return fieldValue < compareValue;
      case 'lte':
        return fieldValue <= compareValue;
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      case 'nin':
        return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
      case 'exists':
        return fieldValue !== null && fieldValue !== undefined;
      default:
        return false;
    }
  }

  /**
   * Get nested field value
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static getFieldValue(record: any, field: string): any {
    // First try direct field access
    if (field in record) {
      return record[field];
    }
    
    // Handle table.field notation
    if (field.includes('.')) {
      const parts = field.split('.');
      
      // For table.field notation after a join, try various naming conventions
      if (parts.length === 2) {
        const [table, fieldName] = parts;
        
        // Try table_field format (e.g., patients_first_name)
        const underscoreKey = `${table}_${fieldName}`;
        if (underscoreKey in record) {
          return record[underscoreKey];
        }
        
        // Try case-insensitive match for table_field format
        const recordKeys = Object.keys(record);
        const underscoreKeyLower = underscoreKey.toLowerCase();
        const caseInsensitiveKey = recordKeys.find(key => key.toLowerCase() === underscoreKeyLower);
        if (caseInsensitiveKey) {
          return record[caseInsensitiveKey];
        }
        
        // Try just the field name (common after joins)
        if (fieldName in record) {
          return record[fieldName];
        }
        
        // Try case-insensitive match for just the field name
        const fieldNameLower = fieldName.toLowerCase();
        const fieldKey = recordKeys.find(key => key.toLowerCase() === fieldNameLower);
        if (fieldKey) {
          return record[fieldKey];
        }
      }
      
      // Original nested access logic
      let value = record;
      for (const part of parts) {
        if (value === null || value === undefined) return null;
        
        // Handle array access (e.g., addresses[0].state)
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
          const [, arrayName, index] = arrayMatch;
          value = value[arrayName]?.[parseInt(index)];
        } else if (Array.isArray(value)) {
          // If current value is an array and we're looking for a field,
          // try to find it in the first element or map over all elements
          if (value.length > 0 && typeof value[0] === 'object') {
            // Check if field exists in first element
            if (part in value[0]) {
              // Return array of values from all elements
              return value.map(item => item[part]).filter(v => v !== undefined);
            }
          }
          return null;
        } else {
          value = value[part];
        }
      }
      
      return value;
    }
    
    // Simple field access
    return record[field];
  }

  /**
   * Apply aggregate operations
   */
  private static applyAggregate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[], 
    aggregations: AggregateField[],
    groupBy?: string[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any {
    if (groupBy && groupBy.length > 0) {
      // Group then aggregate
      const groups = this.groupData(data, groupBy);
      const results = [];

      for (const [groupKey, groupData] of Object.entries(groups)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const groupResult: any = {};
        
        // Parse group key back to object
        const groupValues = JSON.parse(groupKey);
        Object.assign(groupResult, groupValues);

        // Apply aggregations to group
        for (const agg of aggregations) {
          const value = this.calculateAggregate(groupData, agg);
          groupResult[agg.alias || `${agg.operation}_${agg.field}`] = value;
        }

        results.push(groupResult);
      }

      return results;
    } else {
      // Simple aggregation without grouping
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = {};
      
      for (const agg of aggregations) {
        const value = this.calculateAggregate(data, agg);
        result[agg.alias || `${agg.operation}_${agg.field}`] = value;
      }

      return result;
    }
  }

  /**
   * Group data by fields
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static groupData(data: any[], groupBy: string[]): Record<string, any[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groups: Record<string, any[]> = {};

    for (const record of data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const groupKey: Record<string, any> = {};
      for (const field of groupBy) {
        groupKey[field] = this.getFieldValue(record, field);
      }
      const key = JSON.stringify(groupKey);
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    }

    return groups;
  }

  /**
   * Calculate a single aggregate value
   */
  private static calculateAggregate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[], 
    aggregation: AggregateField
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any {
    // Handle count operation for * field
    if (aggregation.operation === 'count' && aggregation.field === '*') {
      return data.length;
    }

    const values = data
      .map(record => this.getFieldValue(record, aggregation.field))
      .filter(v => v !== null && v !== undefined && (typeof v === 'number' || !isNaN(Number(v))));

    if (values.length === 0) return null;

    switch (aggregation.operation) {
      case 'count':
        return values.length;
      
      case 'sum':
        return values.reduce((sum, val) => sum + Number(val), 0);
      
      case 'avg':
        const sum = values.reduce((sum, val) => sum + Number(val), 0);
        return sum / values.length;
      
      case 'min':
        return Math.min(...values.map(v => Number(v)));
      
      case 'max':
        return Math.max(...values.map(v => Number(v)));
      
      case 'distinct':
        return new Set(values).size;
      
      default:
        return null;
    }
  }

  /**
   * Apply sorting
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static applySort(data: any[], sortFields: any[]): any[] {
    if (sortFields.length === 0) return data;

    return [...data].sort((a, b) => {
      for (const sortField of sortFields) {
        const aVal = this.getFieldValue(a, sortField.field);
        const bVal = this.getFieldValue(b, sortField.field);
        
        if (aVal === bVal) continue;
        
        const direction = sortField.direction === 'desc' ? -1 : 1;
        
        if (aVal === null || aVal === undefined) return direction;
        if (bVal === null || bVal === undefined) return -direction;
        
        if (aVal < bVal) return -direction;
        if (aVal > bVal) return direction;
      }
      return 0;
    });
  }

  /**
   * Apply limit and offset
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static applyLimit(data: any[], limit?: number, offset?: number): any[] {
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    return data.slice(start, end);
  }

  /**
   * Apply grouping (without aggregation)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static applyGroup(data: any[], groupBy: string[]): any {
    return this.groupData(data, groupBy);
  }

  /**
   * Format output based on requested format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static formatOutput(data: any, outputFormat: any): any {
    switch (outputFormat.format) {
      case 'summary':
        // For single aggregate results, return as is
        if (!Array.isArray(data)) return data;
        // For multiple records, return summary
        return {
          count: data.length,
          data: outputFormat.limit ? data.slice(0, outputFormat.limit) : data
        };
      
      case 'table':
        // Format as table-ready data
        if (!Array.isArray(data)) data = [data];
        
        // Apply field selection if specified
        if (outputFormat.fields && outputFormat.fields.length > 0) {
          logger.info('Selecting fields:', outputFormat.fields);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data = data.map((record: any, index: number) => {
            // Log available fields for first record to help debug
            if (index === 0) {
              logger.info('Available fields in record:', Object.keys(record));
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const filtered: any = {};
            for (const field of outputFormat.fields) {
              // Get the value using our enhanced getFieldValue method
              const value = this.getFieldValue(record, field);
              if (value !== null && value !== undefined) {
                // Use the original field name as the key in the output
                filtered[field] = value;
              } else if (index === 0) {
                logger.warn(`Field ${field} not found in record`);
              }
            }
            return filtered;
          });
        }
        
        return outputFormat.limit ? data.slice(0, outputFormat.limit) : data;
      
      case 'raw':
        // Return raw data
        return data;
      
      case 'chart':
        // Format for charting libraries
        return {
          type: 'chart',
          data: Array.isArray(data) ? data : [data]
        };
      
      default:
        return data;
    }
  }
}