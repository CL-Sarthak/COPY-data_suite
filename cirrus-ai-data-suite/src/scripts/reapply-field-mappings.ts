#!/usr/bin/env tsx
/**
 * Script to re-apply field mappings to ensure all records are processed
 * Usage: npm run reapply-mappings <dataSourceId>
 */

import { getDatabase } from '../database/connection';
import { DataSourceEntity } from '../entities/DataSourceEntity';

async function reapplyFieldMappings(dataSourceId: string) {
  console.log(`Re-applying field mappings for data source: ${dataSourceId}`);
  
  try {
    const db = await getDatabase();
    const dataSourceRepo = db.getRepository(DataSourceEntity);
    
    // Get the data source
    const dataSource = await dataSourceRepo.findOne({ where: { id: dataSourceId } });
    if (!dataSource) {
      console.error('Data source not found');
      process.exit(1);
    }
    
    console.log(`Data source: ${dataSource.name}`);
    console.log(`Record count: ${dataSource.recordCount}`);
    
    // Make the API call to re-apply mappings
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/data-sources/${dataSourceId}/transform/apply-mappings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        forceRetransform: true,
        validateOnly: false,
        includeValidationDetails: false
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to re-apply mappings:', error);
      process.exit(1);
    }
    
    const result = await response.json();
    console.log('\nTransformation complete!');
    console.log(`- Total records processed: ${result.statistics.totalRecords}`);
    console.log(`- Successful records: ${result.statistics.successfulRecords}`);
    console.log(`- Failed records: ${result.statistics.failedRecords}`);
    console.log(`- Mapped fields: ${result.statistics.mappedFields}`);
    
    if (result.statistics.unmappedFields.length > 0) {
      console.log(`- Unmapped fields: ${result.statistics.unmappedFields.join(', ')}`);
    }
    
    // Verify the update
    const updatedDataSource = await dataSourceRepo.findOne({ where: { id: dataSourceId } });
    if (updatedDataSource?.transformedData) {
      const transformedRecords = JSON.parse(updatedDataSource.transformedData);
      console.log(`\nVerified: ${transformedRecords.length} records in transformed data`);
    }
    
    console.log('\nField mappings successfully re-applied!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Get data source ID from command line
const dataSourceId = process.argv[2];
if (!dataSourceId) {
  console.error('Usage: npm run reapply-mappings <dataSourceId>');
  process.exit(1);
}

reapplyFieldMappings(dataSourceId);