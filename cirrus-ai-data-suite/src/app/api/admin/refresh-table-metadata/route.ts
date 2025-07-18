import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DataSourceService } from '@/services/dataSourceService';
import { TableMetadataService } from '@/services/tableMetadataService';
import { extractFieldsFromData } from '@/utils/fieldExtractor';
import { logger } from '@/utils/logger';

// Helper function to check if field name suggests PII
function checkIfFieldIsPII(fieldName: string): boolean {
  const piiPatterns = [
    'ssn', 'social_security', 'socialsecurity',
    'credit_card', 'creditcard', 'card_number',
    'credit_score', 'creditscore', 'creditScore',
    'phone', 'email', 'address', 'street',
    'birth_date', 'birthdate', 'dob',
    'passport', 'driver_license', 'license_number',
    'bank_account', 'account_number',
    'tax_id', 'ein', 'tin',
    'medical_record', 'patient_id', 'mrn'
  ];
  
  const lowerFieldName = fieldName.toLowerCase();
  return piiPatterns.some(pattern => lowerFieldName.includes(pattern));
}

export async function POST(request: NextRequest) {
  try {
    const { dataSourceId } = await request.json();
    
    logger.info('Refreshing table metadata for data source:', dataSourceId);
    
    const database = await getDatabase();
    const tableRepo = database.getRepository('DataSourceTableEntity');
    
    if (dataSourceId) {
      // Refresh specific data source
      const dataSource = await DataSourceService.getDataSourceById(dataSourceId);
      if (!dataSource) {
        return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
      }
      
      // Get existing tables
      const tables = await TableMetadataService.getTablesForDataSource(dataSourceId);
      
      // Parse transformed data to extract fields
      if (dataSource.transformedData) {
        const transformedData = JSON.parse(dataSource.transformedData);
        
        for (const table of tables) {
          // Skip if columns already exist and this is a database import
          if (table.metadata?.columns && dataSource.type === 'database') {
            logger.info(`Table ${table.tableName} already has column metadata from database`);
            continue;
          }
          
          // First check if columns exist in schemaInfo
          let columns = null;
          if (table.schemaInfo) {
            try {
              const schema = JSON.parse(table.schemaInfo);
              if (schema.fields && Array.isArray(schema.fields)) {
                columns = schema.fields.map((field: { name: string; type: string }) => ({
                  name: field.name,
                  type: field.type,
                  isPII: checkIfFieldIsPII(field.name)
                }));
                logger.info(`Extracted ${columns.length} columns from schemaInfo for table ${table.tableName}`);
              }
            } catch (e) {
              logger.warn(`Failed to parse schemaInfo for table ${table.tableName}:`, e);
            }
          }
          
          // If no columns from schema, extract from data
          if (!columns) {
            // Extract data for this table
            let tableData = null;
            
            if (transformedData.records && table.tableName === 'Main') {
              tableData = transformedData.records;
            } else if (transformedData.sheets) {
              const sheet = transformedData.sheets.find((s: { name: string; records?: unknown[] }) => s.name === table.tableName);
              if (sheet) tableData = sheet.records;
            } else if (transformedData.tables && transformedData.tables[table.tableName]) {
              tableData = transformedData.tables[table.tableName].records;
            }
            
            if (tableData && Array.isArray(tableData) && tableData.length > 0) {
              const fields = extractFieldsFromData(tableData);
              columns = fields.map(field => ({
                name: field.name,
                type: field.type,
                isPII: field.isPII
              }));
              
              logger.info(`Extracted ${columns.length} columns from data for table ${table.tableName}`);
            }
          }
          
          if (columns) {
            // Update table metadata
            await tableRepo.update(table.id, {
              metadata: {
                ...table.metadata,
                columns
              }
            });
          } else {
            logger.warn(`No columns found for table ${table.tableName}`);
          }
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `Refreshed metadata for data source ${dataSource.name}` 
      });
      
    } else {
      // Refresh all data sources
      const dataSources = await DataSourceService.getAllDataSources();
      let updatedCount = 0;
      
      for (const ds of dataSources) {
        // Handle database sources specifically
        if (ds.type === 'database') {
          try {
            const metadata = ds.metadata as {
              tableName?: string;
              importedRows?: number;
              schema?: {
                columns?: unknown[];
                primaryKey?: unknown;
                foreignKeys?: unknown[];
                indexes?: unknown[];
              };
            } || {};
            
            // Check if table metadata exists
            const existingTables = await TableMetadataService.getTablesForDataSource(ds.id);
            
            if (existingTables.length === 0 && metadata.tableName) {
              // Create table metadata for database source
              const tables = [{
                tableName: metadata.tableName,
                tableType: 'table',
                recordCount: metadata.importedRows || 0,
                schemaInfo: metadata.schema,
                metadata: {
                  columns: metadata.schema?.columns || [],
                  primaryKey: metadata.schema?.primaryKey,
                  foreignKeys: metadata.schema?.foreignKeys,
                  indexes: metadata.schema?.indexes
                }
              }];
              
              await TableMetadataService.createOrUpdateTables(ds.id, tables);
              updatedCount++;
              logger.info(`Created table metadata for database source ${ds.name} (${metadata.tableName})`);
            }
          } catch (error) {
            logger.error(`Failed to process database source ${ds.name}:`, error);
          }
        } else if (ds.transformedData) {
          const tables = await TableMetadataService.getTablesForDataSource(ds.id);
          const transformedData = JSON.parse(ds.transformedData);
          
          for (const table of tables) {
            if (!table.metadata?.columns) {
              let tableData = null;
              
              if (transformedData.records && table.tableName === 'Main') {
                tableData = transformedData.records;
              } else if (transformedData.sheets) {
                const sheet = transformedData.sheets.find((s: { name: string; records?: unknown[] }) => s.name === table.tableName);
                if (sheet) tableData = sheet.records;
              } else if (transformedData.tables && transformedData.tables[table.tableName]) {
                tableData = transformedData.tables[table.tableName].records;
              }
              
              if (tableData && Array.isArray(tableData) && tableData.length > 0) {
                const fields = extractFieldsFromData(tableData);
                const columns = fields.map(field => ({
                  name: field.name,
                  type: field.type,
                  isPII: field.isPII
                }));
                
                await tableRepo.update(table.id, {
                  metadata: {
                    ...table.metadata,
                    columns
                  }
                });
                
                updatedCount++;
                logger.info(`Updated table ${table.tableName} in ${ds.name} with ${columns.length} columns`);
              }
            }
          }
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `Refreshed metadata for ${updatedCount} tables` 
      });
    }
    
  } catch (error) {
    logger.error('Failed to refresh table metadata:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to refresh metadata' },
      { status: 500 }
    );
  }
}