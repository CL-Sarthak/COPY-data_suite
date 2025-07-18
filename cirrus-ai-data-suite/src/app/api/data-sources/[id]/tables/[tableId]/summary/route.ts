import { NextRequest, NextResponse } from 'next/server';
import { TableMetadataService } from '@/services/tableMetadataService';
import { llmService } from '@/services/llmService';
import { logger } from '@/utils/logger';

interface RouteParams {
  params: Promise<{
    id: string;
    tableId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tableId } = await params;
    
    const table = await TableMetadataService.getTableById(tableId);
    
    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      aiSummary: table.aiSummary,
      userSummary: table.userSummary,
      summaryGeneratedAt: table.summaryGeneratedAt,
      summaryUpdatedAt: table.summaryUpdatedAt,
      summaryVersion: table.summaryVersion
    });
  } catch (error) {
    logger.error('Error fetching table summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table summary' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    logger.info('Table summary POST request started');
    const { id, tableId } = await params;
    logger.info(`Processing summary for data source ${id}, table ${tableId}`);
    
    const body = await request.json();
    const { action, userSummary } = body;
    logger.info(`Action: ${action}`);

    if (action === 'generate') {
      const table = await TableMetadataService.getTableById(tableId);
      
      if (!table) {
        return NextResponse.json(
          { error: 'Table not found' },
          { status: 404 }
        );
      }

      // Get table data for context
      let tableData = '';
      const recordCount = table.recordCount || 0;
      let schemaInfo = '';
      
      try {
        // Get the parent data source to access transformed data
        const { getDatabase } = await import('@/database/connection');
        const database = await getDatabase();
        const dataSourceRepo = database.getRepository((await import('@/entities/DataSourceEntity')).DataSourceEntity);
        
        const dataSource = await dataSourceRepo.findOne({
          where: { id }
        });
        
        if (!dataSource) {
          logger.error('Data source not found for table summary');
        }
        
        // Check both transformedData and configuration for data
        let dataToAnalyze = null;
        
        if (dataSource?.transformedData) {
          try {
            dataToAnalyze = JSON.parse(dataSource.transformedData);
          } catch (e) {
            logger.error('Error parsing transformed data:', e);
          }
        }
        
        // For database sources, check configuration
        if (!dataToAnalyze && dataSource?.configuration) {
          let parsedConfig = dataSource.configuration;
          if (typeof dataSource.configuration === 'string') {
            try {
              parsedConfig = JSON.parse(dataSource.configuration);
            } catch (e) {
              logger.error('Error parsing configuration:', e);
            }
          }
          
          if (parsedConfig && typeof parsedConfig === 'object' && 'data' in parsedConfig) {
            dataToAnalyze = {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              records: (parsedConfig as any).data,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              totalRecords: (parsedConfig as any).data.length
            };
          }
        }
        
        if (dataToAnalyze) {
          
          // Extract table-specific data based on table type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let tableRecords: any[] = [];
          
          if (table.tableType === 'nested' && dataToAnalyze.records) {
            // For nested tables, extract the nested array field
            tableRecords = dataToAnalyze.records
              .slice(0, 5)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .flatMap((r: any) => {
                const recordData = r.data || r;
                return recordData[table.tableName] || [];
              });
          } else if (dataToAnalyze.sheets && Array.isArray(dataToAnalyze.sheets)) {
            // For sheet-based data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sheet = dataToAnalyze.sheets.find((s: any) => s.name === table.tableName);
            if (sheet) {
              tableRecords = sheet.records?.slice(0, 5) || [];
              schemaInfo = sheet.schema ? JSON.stringify(sheet.schema, null, 2) : '';
            }
          } else if (dataToAnalyze.tables && dataToAnalyze.tables[table.tableName]) {
            // For table-based data
            const tableObj = dataToAnalyze.tables[table.tableName];
            tableRecords = tableObj.records?.slice(0, 5) || [];
            schemaInfo = tableObj.schema ? JSON.stringify(tableObj.schema, null, 2) : '';
          }
          
          tableData = JSON.stringify(tableRecords, null, 2);
        }
        
        // Use stored schema if available
        if (!schemaInfo && table.schemaInfo) {
          schemaInfo = table.schemaInfo;
        }
      } catch (e) {
        logger.error('Error extracting table data:', e);
      }

      const prompt = `Analyze this table/sheet and provide a concise business-friendly summary.

Table Information:
- Name: ${table.tableName}
- Type: ${table.tableType || 'unknown'}
- Record Count: ${recordCount}
${schemaInfo ? `- Schema: ${schemaInfo}` : ''}

Sample Data:
${tableData || 'No sample data available'}

Provide ONLY a direct summary without any preamble, introduction, or phrases like "Here is" or "This table contains". Start directly with the content description.

Focus on:
1. What data this table contains
2. Key fields and their purpose
3. Any notable patterns or characteristics
4. How this table might relate to the overall dataset

Be concise and factual.`;

      logger.info('Calling LLM service to generate summary...');
      
      let summary;
      try {
        summary = await llmService.analyze({
          prompt,
          maxTokens: 200,
          temperature: 0.3
        });
        logger.info('LLM summary generated successfully');
      } catch (llmError) {
        logger.error('LLM service error:', llmError);
        throw new Error('Failed to generate AI summary');
      }

      // Update table with AI summary
      logger.info('Updating table with AI summary...');
      const updatedTable = await TableMetadataService.updateTableSummary(tableId, {
        aiSummary: summary.content
      });

      logger.info('Table summary updated successfully');
      
      const response = {
        aiSummary: updatedTable?.aiSummary,
        summaryGeneratedAt: updatedTable?.summaryGeneratedAt,
        summaryVersion: updatedTable?.summaryVersion
      };
      
      logger.info('Sending response:', response);
      return NextResponse.json(response);
    } else if (action === 'update' && userSummary !== undefined) {
      const updatedTable = await TableMetadataService.updateTableSummary(tableId, {
        userSummary
      });

      return NextResponse.json({
        userSummary: updatedTable?.userSummary,
        summaryUpdatedAt: updatedTable?.summaryUpdatedAt,
        summaryVersion: updatedTable?.summaryVersion
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Error processing table summary:', error);
    return NextResponse.json(
      { error: 'Failed to process table summary' },
      { status: 500 }
    );
  }
}