import { DataSourceTableEntity } from '@/entities/DataSourceTableEntity';
import { getDatabase } from '@/database/connection';
import { logger } from '@/utils/logger';
import { extractFieldsFromData } from '@/utils/fieldExtractor';

export class TableMetadataService {
  /**
   * Get all tables for a data source
   */
  static async getTablesForDataSource(dataSourceId: string): Promise<DataSourceTableEntity[]> {
    try {
      const database = await getDatabase();
      const repository = database.getRepository(DataSourceTableEntity);
      
      return await repository.find({
        where: { dataSourceId },
        order: { tableIndex: 'ASC' }
      });
    } catch (error) {
      logger.error('Failed to get tables for data source:', error);
      throw error;
    }
  }

  /**
   * Get a specific table by ID
   */
  static async getTableById(tableId: string): Promise<DataSourceTableEntity | null> {
    try {
      const database = await getDatabase();
      const repository = database.getRepository(DataSourceTableEntity);
      
      return await repository.findOne({
        where: { id: tableId },
        relations: ['dataSource']
      });
    } catch (error) {
      logger.error('Failed to get table by ID:', error);
      throw error;
    }
  }

  /**
   * Create or update tables for a data source
   */
  static async createOrUpdateTables(
    dataSourceId: string,
    tables: Array<{
      tableName: string;
      tableType?: string;
      tableIndex?: number;
      recordCount?: number;
      schemaInfo?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      metadata?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    }>
  ): Promise<DataSourceTableEntity[]> {
    try {
      const database = await getDatabase();
      const repository = database.getRepository(DataSourceTableEntity);
      
      // Delete existing tables for this data source
      await repository.delete({ dataSourceId });
      
      // Create new tables
      const tableEntities = tables.map((table, index) => 
        repository.create({
          dataSourceId,
          tableName: table.tableName,
          tableType: table.tableType,
          tableIndex: table.tableIndex ?? index,
          recordCount: table.recordCount,
          schemaInfo: table.schemaInfo ? JSON.stringify(table.schemaInfo) : undefined,
          metadata: table.metadata || undefined
        })
      );
      
      return await repository.save(tableEntities);
    } catch (error) {
      logger.error('Failed to create or update tables:', error);
      throw error;
    }
  }

  /**
   * Update table summary
   */
  static async updateTableSummary(
    tableId: string,
    summaryData: {
      aiSummary?: string;
      userSummary?: string;
    }
  ): Promise<DataSourceTableEntity | null> {
    try {
      const database = await getDatabase();
      const repository = database.getRepository(DataSourceTableEntity);
      
      const table = await repository.findOne({ where: { id: tableId } });
      if (!table) {
        return null;
      }
      
      const updates: Partial<DataSourceTableEntity> = {
        summaryVersion: (table.summaryVersion || 0) + 1
      };
      
      if (summaryData.aiSummary !== undefined) {
        updates.aiSummary = summaryData.aiSummary;
        updates.summaryGeneratedAt = new Date();
      }
      
      if (summaryData.userSummary !== undefined) {
        updates.userSummary = summaryData.userSummary;
        updates.summaryUpdatedAt = new Date();
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await repository.update(tableId, updates as any);
      
      return await repository.findOne({ where: { id: tableId } });
    } catch (error) {
      logger.error('Failed to update table summary:', error);
      throw error;
    }
  }

  /**
   * Detect tables in transformed data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async detectTablesInData(transformedData: any): Promise<Array<{
    tableName: string;
    tableType: string;
    recordCount: number;
    schemaInfo: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    metadata?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }>> {
    const tables: Array<{
      tableName: string;
      tableType: string;
      recordCount: number;
      schemaInfo: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      metadata?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    }> = [];
    

    // Check if data has multiple sheets (Excel-like structure)
    if (transformedData.sheets && Array.isArray(transformedData.sheets)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transformedData.sheets.forEach((sheet: any, index: number) => {
        // Extract columns from sheet data
        const columns = sheet.records && sheet.records.length > 0
          ? extractFieldsFromData(sheet.records).map(field => ({
              name: field.name,
              type: field.type,
              isPII: field.isPII
            }))
          : [];
          
        tables.push({
          tableName: sheet.name || `Sheet ${index + 1}`,
          tableType: 'sheet',
          recordCount: sheet.records?.length || 0,
          schemaInfo: sheet.schema || null,
          metadata: { columns }
        });
      });
    }
    // Check if data has multiple tables (database-like structure)
    else if (transformedData.tables && typeof transformedData.tables === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.entries(transformedData.tables).forEach(([tableName, tableData]: [string, any]) => {
        // Extract columns from table data
        const columns = tableData.records && tableData.records.length > 0
          ? extractFieldsFromData(tableData.records).map(field => ({
              name: field.name,
              type: field.type,
              isPII: field.isPII
            }))
          : [];
          
        tables.push({
          tableName,
          tableType: 'table',
          recordCount: tableData.records?.length || 0,
          schemaInfo: tableData.schema || null,
          metadata: { columns }
        });
      });
    }
    // Check for nested relational data
    else if (transformedData.records && Array.isArray(transformedData.records)) {
      // Analyze first few records to detect nested structures
      const nestedFields = new Set<string>();
      const sampleRecords = transformedData.records.slice(0, 10);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sampleRecords.forEach((record: any) => {
        // For UnifiedDataRecord format, check the data property
        const dataToCheck = record.data || record;
        
        Object.entries(dataToCheck).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            const firstItem = value[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              nestedFields.add(key);
            }
          }
        });
      });
      
      // Create a table entry for each nested field
      nestedFields.forEach(fieldName => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fieldRecords = transformedData.records.flatMap((r: any) => {
          const data = r.data || r;
          return data[fieldName] || [];
        });
        
        // Extract columns from nested field data
        const columns = fieldRecords.length > 0
          ? extractFieldsFromData(fieldRecords).map(field => ({
              name: field.name,
              type: field.type,
              isPII: field.isPII
            }))
          : [];
        
        tables.push({
          tableName: fieldName,
          tableType: 'nested',
          recordCount: fieldRecords.length,
          schemaInfo: null,
          metadata: { columns }
        });
      });
    }
    
    // If no tables detected, treat as single table
    if (tables.length === 0 && transformedData.records) {
      // First try to get columns from schema if available
      let columns = [];
      
      if (transformedData.schema && transformedData.schema.fields) {
        columns = transformedData.schema.fields.map((field: { name: string; type: string }) => ({
          name: field.name,
          type: field.type,
          isPII: false
        }));
      } else if (transformedData.records.length > 0) {
        // Extract columns from actual data
        columns = extractFieldsFromData(transformedData.records).map(field => ({
          name: field.name,
          type: field.type,
          isPII: field.isPII
        }));
      }
        
      tables.push({
        tableName: 'Main',
        tableType: 'single',
        recordCount: transformedData.records.length || 0,
        schemaInfo: transformedData.schema || null,
        metadata: { columns }
      });
    }
    
    return tables;
  }

  static async getAllTables(): Promise<DataSourceTableEntity[]> {
    const database = await getDatabase();
    const repository = database.getRepository(DataSourceTableEntity);

    return await repository.find({
      order: { dataSourceId: 'ASC', tableName: 'ASC' }
    });
  }
}