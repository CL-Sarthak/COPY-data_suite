#!/usr/bin/env node

/**
 * Debug script to understand why enhancement is not getting all records
 */

const dataSourceId = process.argv[2];
if (!dataSourceId) {
  console.error('Usage: node debug-enhancement.js <dataSourceId>');
  process.exit(1);
}

const baseUrl = 'http://localhost:3000';

async function debug() {
  console.log('=== DEBUGGING ENHANCEMENT ISSUE ===\n');
  
  // 1. Get data source info
  console.log('1. Fetching data source info...');
  const dsResponse = await fetch(`${baseUrl}/api/data-sources/${dataSourceId}`);
  if (!dsResponse.ok) {
    console.error('Failed to fetch data source');
    return;
  }
  const dataSource = await dsResponse.json();
  console.log(`   - Name: ${dataSource.name}`);
  console.log(`   - Type: ${dataSource.type}`);
  console.log(`   - Record Count: ${dataSource.recordCount}`);
  console.log(`   - Has Transformed Data: ${dataSource.hasTransformedData}`);
  console.log(`   - Has Field Mappings: ${dataSource.configuration?.fieldMappings ? 'Yes' : 'No'}`);
  
  // 2. Check transform API
  console.log('\n2. Calling transform API...');
  const transformResponse = await fetch(`${baseUrl}/api/data-sources/${dataSourceId}/transform`);
  if (!transformResponse.ok) {
    console.error('Transform API failed');
    return;
  }
  const transformData = await transformResponse.json();
  console.log(`   - Total Records: ${transformData.totalRecords}`);
  console.log(`   - Returned Records: ${transformData.records?.length}`);
  console.log(`   - Truncated: ${transformData.meta?.truncated}`);
  console.log(`   - Download URL: ${transformData.meta?.downloadUrl}`);
  
  // 3. Check download endpoint
  if (transformData.meta?.downloadUrl) {
    console.log('\n3. Calling download endpoint...');
    const downloadResponse = await fetch(`${baseUrl}${transformData.meta.downloadUrl}`);
    if (!downloadResponse.ok) {
      console.error('Download failed');
      return;
    }
    const downloadData = await downloadResponse.json();
    console.log(`   - Download Total Records: ${downloadData.totalRecords}`);
    console.log(`   - Download Actual Records: ${downloadData.records?.length}`);
    console.log(`   - First record keys: ${downloadData.records?.[0] ? Object.keys(downloadData.records[0].data || downloadData.records[0]).join(', ') : 'N/A'}`);
  }
  
  // 4. Check transformation status
  console.log('\n4. Checking transformation status...');
  const statusResponse = await fetch(`${baseUrl}/api/data-sources/${dataSourceId}/transform/apply-mappings`);
  if (statusResponse.ok) {
    const status = await statusResponse.json();
    console.log(`   - Has Transformed Data: ${status.hasTransformedData}`);
    console.log(`   - Transformation Status: ${status.transformationStatus}`);
    console.log(`   - Record Count: ${status.recordCount}`);
    console.log(`   - Original Record Count: ${status.originalRecordCount}`);
  }
  
  // 5. Force re-transformation
  console.log('\n5. Would you like to force re-transformation? (y/n)');
  process.stdin.once('data', async (data) => {
    if (data.toString().trim().toLowerCase() === 'y') {
      console.log('\nForcing re-transformation...');
      const reapplyResponse = await fetch(`${baseUrl}/api/data-sources/${dataSourceId}/transform/apply-mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forceRetransform: true,
          validateOnly: false,
          includeValidationDetails: false
        })
      });
      
      if (reapplyResponse.ok) {
        const result = await reapplyResponse.json();
        console.log(`   - Success! Processed ${result.statistics.totalRecords} records`);
        console.log(`   - Transformed Records: ${result.transformedRecords}`);
        
        // Re-check download
        console.log('\n6. Re-checking download endpoint...');
        const transformResponse2 = await fetch(`${baseUrl}/api/data-sources/${dataSourceId}/transform`);
        const transformData2 = await transformResponse2.json();
        
        if (transformData2.meta?.downloadUrl) {
          const downloadResponse2 = await fetch(`${baseUrl}${transformData2.meta.downloadUrl}`);
          const downloadData2 = await downloadResponse2.json();
          console.log(`   - New Download Records: ${downloadData2.records?.length}`);
        }
      } else {
        console.error('Re-transformation failed');
      }
    }
    process.exit(0);
  });
}

debug().catch(console.error);