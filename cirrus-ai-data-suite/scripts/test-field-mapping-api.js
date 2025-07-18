#!/usr/bin/env node

/**
 * Test the field mapping flow through the API
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  console.log(`\n[API] ${options.method || 'GET'} ${url}`);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error(`[API] Error: ${response.status} ${response.statusText}`);
    console.error(data);
    throw new Error(`API call failed: ${response.status}`);
  }
  
  return data;
}

async function testFieldMappingFlow() {
  try {
    // Step 1: Get all data sources
    console.log('=== Step 1: Get Data Sources ===');
    const dataSources = await fetchAPI('/api/data-sources');
    
    // Find a data source with field mappings
    let testDataSource = null;
    for (const ds of dataSources) {
      if (ds.fieldMappingStatus === 'mapped' || ds.fieldMappingStatus === 'partial') {
        testDataSource = ds;
        break;
      }
    }
    
    if (!testDataSource) {
      console.log('No data sources with field mappings found');
      return;
    }
    
    console.log(`\nTesting with data source: ${testDataSource.name} (${testDataSource.id})`);
    console.log(`- Field Mapping Status: ${testDataSource.fieldMappingStatus}`);
    console.log(`- Transformation Status: ${testDataSource.transformationStatus}`);
    console.log(`- Has transformedData: ${!!testDataSource.transformedData}`);
    
    // Step 2: Get the full data source details
    console.log('\n=== Step 2: Get Data Source Details ===');
    const fullDataSource = await fetchAPI(`/api/data-sources/${testDataSource.id}`);
    
    // Check what's in transformedData
    if (fullDataSource.transformedData) {
      try {
        const transformedData = JSON.parse(fullDataSource.transformedData);
        
        if (Array.isArray(transformedData)) {
          console.log('- transformedData is an array (field-mapped format)');
          console.log(`- Number of records: ${transformedData.length}`);
          if (transformedData.length > 0) {
            console.log('- Field names in first record:', Object.keys(transformedData[0]));
            console.log('- Sample record:', JSON.stringify(transformedData[0], null, 2));
          }
        } else if (transformedData.catalogId) {
          console.log('- transformedData is UnifiedDataCatalog format');
          console.log(`- Total records: ${transformedData.totalRecords}`);
          console.log(`- Records in array: ${transformedData.records?.length || 0}`);
        }
      } catch (e) {
        console.log('- Failed to parse transformedData:', e.message);
      }
    }
    
    // Step 3: Get field mappings
    console.log('\n=== Step 3: Get Field Mappings ===');
    const mappings = await fetchAPI(`/api/data-sources/${testDataSource.id}/field-mappings`);
    console.log(`Found ${mappings.length} field mappings:`);
    for (const mapping of mappings.slice(0, 5)) {
      console.log(`- "${mapping.sourceFieldName}" → "${mapping.catalogFieldName}" (${mapping.catalogFieldDisplayName})`);
    }
    
    // Step 4: Call the transform endpoint
    console.log('\n=== Step 4: Call Transform Endpoint ===');
    const transformResult = await fetchAPI(`/api/data-sources/${testDataSource.id}/transform`);
    
    console.log('Transform endpoint returned:');
    console.log(`- Catalog ID: ${transformResult.catalogId}`);
    console.log(`- Total Records: ${transformResult.totalRecords}`);
    console.log(`- Records returned: ${transformResult.records?.length || 0}`);
    
    if (transformResult.records && transformResult.records.length > 0) {
      const firstRecord = transformResult.records[0];
      const recordData = firstRecord.data || firstRecord;
      console.log('- Field names in first record:', Object.keys(recordData));
      console.log('- Sample data:', JSON.stringify(recordData, null, 2));
    }
    
    // Step 5: Check what the preview hook would see
    console.log('\n=== Step 5: What Preview Shows ===');
    console.log('The preview hook (useTransformedPreview) does:');
    console.log('1. First checks /api/data-sources/{id} for transformedData');
    console.log('2. If it finds field-mapped data (array), it uses that');
    console.log('3. Otherwise it calls /api/data-sources/{id}/transform');
    console.log('\nThe issue might be:');
    console.log('- The transform endpoint is being called and overwrites field-mapped data');
    console.log('- OR the preview is not properly detecting field-mapped data');
    
    // Step 6: Check transformation status
    console.log('\n=== Step 6: Check Apply-Mappings Status ===');
    const mappingStatus = await fetchAPI(`/api/data-sources/${testDataSource.id}/transform/apply-mappings`);
    console.log('Apply-mappings status:');
    console.log(`- Has transformed data: ${mappingStatus.hasTransformedData}`);
    console.log(`- Transformation status: ${mappingStatus.transformationStatus}`);
    console.log(`- Applied at: ${mappingStatus.transformationAppliedAt}`);
    console.log(`- Record count: ${mappingStatus.recordCount}`);
    
  } catch (error) {
    console.error('\nTest failed:', error.message);
  }
}

// Run the test
console.log('Field Mapping Data Flow Test');
console.log('============================');
testFieldMappingFlow().catch(console.error);