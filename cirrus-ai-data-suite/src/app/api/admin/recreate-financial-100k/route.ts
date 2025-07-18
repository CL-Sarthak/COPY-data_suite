import { NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';
import { DataTransformationService } from '@/services/dataTransformationService';
import { TableMetadataService } from '@/services/tableMetadataService';
import { logger } from '@/utils/logger';

export async function POST() {
  try {
    logger.info('Recreating Financial Dataset with 100k records...');
    
    // Generate 100k financial records
    const records = [];
    for (let i = 0; i < 100000; i++) {
      records.push({
        id: `${i + 1}`,
        accountNumber: Math.floor(Math.random() * 9000000000) + 1000000000,
        routingNumber: Math.floor(Math.random() * 900000000) + 100000000,
        creditCardNumber: `${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 900000) + 100000}-${Math.floor(Math.random() * 90000) + 10000}`,
        ssn: `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 9000) + 1000}`,
        income: Math.floor(Math.random() * 180000) + 20000,
        creditScore: Math.floor(Math.random() * 550) + 300,
        accountType: ['checking', 'savings', 'credit', 'investment'][Math.floor(Math.random() * 4)]
      });
    }
    
    // Calculate actual average for verification
    const actualAverage = records.reduce((sum, r) => sum + r.creditScore, 0) / records.length;
    logger.info(`Generated ${records.length} records with average credit score: ${actualAverage}`);
    
    const jsonContent = JSON.stringify(records);
    logger.info(`Content size: ${jsonContent.length} bytes (${(jsonContent.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // Update configuration
    const config = {
      files: [{
        name: 'financial_data_100k.json',
        type: 'application/json',
        size: jsonContent.length,
        content: jsonContent
      }]
    };
    
    // Update the data source
    await DataSourceService.updateDataSource('9afcfb1e-4fdc-4a09-8469-d149cbf517db', {
      configuration: config,
      name: 'Financial Dataset',
      recordCount: 100000
    });
    
    logger.info('Configuration updated, transforming sample for metadata...');
    
    // Transform only a sample for metadata and schema detection
    const sampleCatalog = await DataTransformationService.transformDataSource(
      {
        id: '9afcfb1e-4fdc-4a09-8469-d149cbf517db',
        name: 'Financial Dataset',
        type: 'filesystem',
        connectionStatus: 'connected',
        configuration: {
          files: [{
            name: config.files[0].name,
            type: config.files[0].type,
            size: config.files[0].size,
            content: JSON.stringify(records.slice(0, 1000)) // Just 1000 for schema
          }]
        },
        recordCount: 100000
      },
      { maxRecords: 1000 }
    );
    
    logger.info(`Transformed ${sampleCatalog.totalRecords} sample records for schema`);
    
    // For large datasets, we'll store the raw JSON as transformedData
    // and let the DataAnalysisService handle it directly
    const rawDataCatalog = {
      version: '1.0',
      totalRecords: records.length,
      schema: sampleCatalog.schema,
      records: records.map((record, index) => ({
        id: `9afcfb1e-4fdc-4a09-8469-d149cbf517db_financial_data_100k.json_record_${index}`,
        sourceId: '9afcfb1e-4fdc-4a09-8469-d149cbf517db',
        sourceName: 'Financial Dataset',
        sourceType: 'json',
        recordIndex: index,
        data: record,
        metadata: {
          originalFormat: 'json',
          extractedAt: new Date().toISOString()
        }
      }))
    };
    
    const transformedJson = JSON.stringify(rawDataCatalog);
    logger.info(`Transformed data size: ${transformedJson.length} bytes (${(transformedJson.length / 1024 / 1024).toFixed(2)} MB)`);
    
    await DataSourceService.updateDataSource('9afcfb1e-4fdc-4a09-8469-d149cbf517db', {
      transformedData: transformedJson,
      recordCount: records.length
    });
    
    // Create table metadata
    const tables = await TableMetadataService.detectTablesInData(sampleCatalog);
    if (tables.length > 0) {
      // Update the record count to reflect the full dataset
      tables[0].recordCount = records.length;
      await TableMetadataService.createOrUpdateTables('9afcfb1e-4fdc-4a09-8469-d149cbf517db', tables);
    }
    
    return NextResponse.json({
      success: true,
      recordsGenerated: records.length,
      recordsTransformed: records.length,
      actualAverageCreditScore: Math.round(actualAverage),
      contentSizeMB: (jsonContent.length / 1024 / 1024).toFixed(2),
      transformedSizeMB: (transformedJson.length / 1024 / 1024).toFixed(2)
    });
    
  } catch (error) {
    logger.error('Recreate 100k failed:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Recreate failed',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}