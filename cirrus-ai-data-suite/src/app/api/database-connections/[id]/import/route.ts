import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DatabaseConnectionEntity } from '@/entities/DatabaseConnectionEntity';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { createConnector } from '@/services/connectors/connectorFactory';
import { RelationalDataService, RelationalSchema } from '@/services/relationalDataService';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { ClusterPatternService } from '@/services/clusterPatternService';
import { PatternEntity } from '@/entities/PatternEntity';

interface ImportRequest {
  tableName: string;
  name: string;
  description?: string;
  includeSchema?: boolean;
  sampleSize?: number;
  fullImport?: boolean;
  // Relational import options
  relationalImport?: boolean;
  primaryTable?: string;
  includedTables?: string[];
  excludedTables?: string[];
  maxDepth?: number;
  followReverse?: boolean;
  enableClusterDetection?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: ImportRequest = await request.json();
    const { tableName, name, description, includeSchema = true, sampleSize = 10000, fullImport = false } = body;

    // Get connection details
    const database = await getDatabase();
    const connectionRepo = database.getRepository(DatabaseConnectionEntity);
    const connection = await connectionRepo.findOne({ where: { id } });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Create connector
    const connector = createConnector({
      id: connection.id,
      name: connection.name,
      type: connection.type,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      password: connection.password,
      ssl: connection.ssl,
      sslCert: connection.sslCert,
      additionalOptions: connection.additionalOptions ? JSON.parse(connection.additionalOptions) : undefined,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      lastTestedAt: connection.lastTestedAt || undefined,
      status: connection.status,
      errorMessage: connection.errorMessage || undefined
    });

    await connector.connect();

    let sampleData: Record<string, unknown>[];
    let schema = null;
    let totalRows = 0;
    let rowsToImport = 0;
    let importMetadata: Record<string, unknown> = {};
    let relationalSchema: RelationalSchema | null = null;

    if (body.relationalImport && body.primaryTable) {
      // Relational import - follow foreign key relationships
      const relationalService = new RelationalDataService(connector);
      
      try {
        // Analyze schema first to get relationship information
        relationalSchema = await relationalService.analyzeSchema({
          primaryTable: body.primaryTable,
          maxDepth: body.maxDepth || 3,
          maxRecords: body.sampleSize || 100,
          includedTables: body.includedTables,
          excludedTables: body.excludedTables,
          followReverse: body.followReverse || false
        });

        // Import data with relationships
        sampleData = await relationalService.importRelationalData({
          primaryTable: body.primaryTable,
          maxDepth: body.maxDepth || 3,
          maxRecords: body.sampleSize || 100,
          includedTables: body.includedTables,
          excludedTables: body.excludedTables,
          followReverse: body.followReverse || false
        });

        totalRows = sampleData.length;
        rowsToImport = sampleData.length;

        // Build schema info for all included tables
        const tablesSchema: Record<string, unknown> = {};
        for (const [tableName, tableInfo] of relationalSchema.tables) {
          tablesSchema[tableName] = {
            columns: tableInfo.columns,
            primaryKey: tableInfo.primaryKey,
            foreignKeys: tableInfo.foreignKeys,
            indexes: tableInfo.indexes
          };
        }

        schema = tablesSchema;
        importMetadata = {
          relationalImport: true,
          primaryTable: body.primaryTable,
          includedTables: Array.from(relationalSchema.tables.keys()),
          relationships: relationalSchema.relationships,
          relationshipDiagram: relationalService.getRelationshipDiagram(relationalSchema),
          enableClusterDetection: body.enableClusterDetection || false
        };
      } catch (error) {
        await connector.disconnect();
        throw error;
      }
    } else {
      // Regular single table import
      if (includeSchema) {
        const dbSchema = await connector.getDatabaseSchema();
        const tableInfo = dbSchema.tables.find(t => t.name === tableName);
        if (tableInfo) {
          schema = {
            columns: tableInfo.columns,
            primaryKey: tableInfo.primaryKey,
            foreignKeys: tableInfo.foreignKeys,
            indexes: tableInfo.indexes
          };
        }
      }

      // Get row count
      totalRows = await connector.getTableCount(tableName);
      rowsToImport = fullImport ? totalRows : Math.min(sampleSize, totalRows);

      // Get sample data
      sampleData = await connector.getSampleData(tableName, rowsToImport);
    }
    
    await connector.disconnect();

    // Create data source
    const dataSourceRepo = database.getRepository(DataSourceEntity);
    const newDataSource = dataSourceRepo.create({
      id: uuidv4(),
      name,
      type: 'database',
      path: `${connection.type}://${connection.host}:${connection.port}/${connection.database}/${tableName}`,
      configuration: JSON.stringify({
        data: sampleData,
        connectionId: connection.id,
        connectionName: connection.name,
        databaseType: connection.type,
        tableName,
        description: description || ''
      }),
      metadata: JSON.stringify({
        sourceType: 'database',
        connectionId: connection.id,
        connectionName: connection.name,
        databaseType: connection.type,
        tableName: body.relationalImport ? body.primaryTable : tableName,
        totalRows,
        importedRows: rowsToImport,
        schema,
        importedAt: new Date().toISOString(),
        ...importMetadata
      }),
      recordCount: rowsToImport
    });

    await dataSourceRepo.save(newDataSource);

    // Create table metadata for relational imports
    if (body.relationalImport && relationalSchema) {
      try {
        logger.info('Creating table metadata for relational import');
        const { TableMetadataService } = await import('@/services/tableMetadataService');
        
        // Create table entries for each table in the relational schema
        const tables = Array.from(relationalSchema.tables.entries()).map(([tableName, tableInfo], index) => ({
          tableName: tableName,
          tableType: tableName === body.primaryTable ? 'primary' : 'related',
          tableIndex: index,
          recordCount: tableInfo.rowCount,
          schemaInfo: {
            columns: tableInfo.columns,
            primaryKey: tableInfo.primaryKey,
            foreignKeys: tableInfo.foreignKeys,
            indexes: tableInfo.indexes
          },
          metadata: {
            columns: tableInfo.columns,
            primaryKey: tableInfo.primaryKey,
            foreignKeys: tableInfo.foreignKeys,
            // Also store relationships in a format the queryContextService expects
            relationships: tableInfo.foreignKeys?.map(fk => ({
              columnName: fk.columnName,
              referencedTable: fk.referencedTable,
              referencedColumn: fk.referencedColumn,
              constraintName: fk.constraintName
            }))
          }
        }));
        
        await TableMetadataService.createOrUpdateTables(newDataSource.id, tables);
        
        // Update data source with table count
        await dataSourceRepo.update(newDataSource.id, {
          tableCount: tables.length,
          hasMultipleTables: tables.length > 1
        });
        
        logger.info(`Created ${tables.length} table metadata entries for relational import`);
      } catch (error) {
        logger.error('Failed to create table metadata for relational import:', error);
        // Continue without failing the import
      }
    } else {
      // Create table metadata for regular single table imports
      try {
        const { TableMetadataService } = await import('@/services/tableMetadataService');
        const tables = [{
          tableName: tableName,
          tableType: 'table',
          recordCount: rowsToImport,
          schemaInfo: schema,
          metadata: {
            columns: schema?.columns || [],
            primaryKey: schema?.primaryKey,
            foreignKeys: schema?.foreignKeys,
            indexes: schema?.indexes
          }
        }];
        
        await TableMetadataService.createOrUpdateTables(newDataSource.id, tables);
        
        logger.info(`Created table metadata for single table import: ${tableName}`);
      } catch (error) {
        logger.error('Failed to create table metadata for single table import:', error);
        // Continue without failing the import
      }
    }

    // Generate keywords for the data source
    try {
      const { KeywordGenerationService } = await import('@/services/keywordGenerationService');
      await KeywordGenerationService.generateKeywords(newDataSource.id);
      logger.info(`Generated keywords for database import: ${name}`);
    } catch (error) {
      logger.error('Failed to generate keywords:', error);
      // Continue without failing the import
    }

    // Detect clusters if enabled for relational imports
    const detectedClusters: Array<{ name: string; fields: string[] }> = [];
    if (body.relationalImport && body.enableClusterDetection && sampleData.length > 0) {
      try {
        logger.info('Running cluster detection on imported relational data');
        
        // Flatten the nested data structure to detect patterns across tables
        const flattenedData = ClusterPatternService.flattenRelationalData(sampleData);
        
        // Detect clusters in the flattened data
        const clusters = ClusterPatternService.detectClusters(flattenedData);
        
        if (clusters.length > 0) {
          logger.info(`Detected ${clusters.length} cluster patterns in relational data`);
          
          // Create pattern entities for detected clusters
          const patternRepo = database.getRepository(PatternEntity);
          
          for (const cluster of clusters) {
            // Check if a similar cluster pattern already exists
            const existingPattern = await patternRepo.findOne({
              where: { name: `${cluster.name} Cluster` }
            });
            
            if (!existingPattern) {
              const clusterPattern = patternRepo.create({
                id: uuidv4(),
                name: `${cluster.name} Cluster`,
                description: `Cluster pattern for ${cluster.name} detected in relational data`,
                regex: '', // Clusters don't use regex
                examples: JSON.stringify([]), // No specific examples for clusters
                metadata: JSON.stringify({
                  type: 'cluster',
                  fields: cluster.fields,
                  confidence: cluster.confidence,
                  detectedFrom: 'relational_import',
                  sourceId: newDataSource.id,
                  tables: Array.from(relationalSchema?.tables.keys() || [])
                })
              });
              
              await patternRepo.save(clusterPattern);
              detectedClusters.push({
                name: cluster.name,
                fields: cluster.fields
              });
            }
          }
        }
      } catch (error) {
        logger.error('Error during cluster detection:', error);
        // Continue without cluster detection - don't fail the import
      }
    }

    return NextResponse.json({
      success: true,
      dataSourceId: newDataSource.id,
      rowCount: rowsToImport,
      totalRows,
      detectedClusters: detectedClusters.length > 0 ? detectedClusters : undefined
    });
  } catch (error) {
    logger.error('Failed to import table:', error);
    return NextResponse.json(
      { 
        error: 'Failed to import table',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}