import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { TableMetadataService } from '@/services/tableMetadataService';
import { logger } from '@/utils/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const database = await getDatabase();
    const repository = database.getRepository(DataSourceEntity);
    
    const dataSource = await repository.findOne({
      where: { id }
    });

    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    if (!dataSource.transformedData) {
      return NextResponse.json(
        { error: 'No transformed data available' },
        { status: 400 }
      );
    }

    // Force re-detection of tables
    try {
      const transformedData = JSON.parse(dataSource.transformedData);
      const detectedTables = await TableMetadataService.detectTablesInData(transformedData);
      
      logger.info(`Re-detecting tables for data source ${id}:`, {
        tableCount: detectedTables.length,
        tables: detectedTables.map(t => ({ name: t.tableName, type: t.tableType, records: t.recordCount }))
      });
      
      if (detectedTables.length > 0) {
        // Save detected tables
        const savedTables = await TableMetadataService.createOrUpdateTables(id, detectedTables);
        
        // Update data source with table info
        await repository.update(id, {
          tableCount: detectedTables.length,
          hasMultipleTables: detectedTables.length > 1
        });
        
        return NextResponse.json({
          success: true,
          tables: savedTables,
          count: detectedTables.length
        });
      }
    } catch (error) {
      logger.error('Error re-detecting tables:', error);
      throw error;
    }
    
    return NextResponse.json({
      success: false,
      message: 'No tables detected'
    });
  } catch (error) {
    logger.error('Error in table re-detection:', error);
    return NextResponse.json(
      { error: 'Failed to re-detect tables' },
      { status: 500 }
    );
  }
}