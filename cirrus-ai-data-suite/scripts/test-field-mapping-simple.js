#!/usr/bin/env node

/**
 * Simple test script to debug field mapping data flow
 */

const { Pool } = require('pg');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function runTest() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? {
      rejectUnauthorized: false
    } : false
  });

  try {
    console.log('Connected to database');

    // Get a sample data source with transformations
    const result = await pool.query(`
      SELECT 
        id, 
        name, 
        transformed_data,
        transformation_status,
        transformation_applied_at,
        record_count,
        original_field_names
      FROM data_source_entity 
      WHERE transformed_data IS NOT NULL 
        AND transformation_applied_at IS NOT NULL
      ORDER BY transformation_applied_at DESC
      LIMIT 5
    `);

    if (result.rows.length === 0) {
      console.log('No data sources with field-mapped transformations found');
      return;
    }

    console.log('\n=== Data Sources with Transformations ===');
    for (const ds of result.rows) {
      console.log(`\nData Source: ${ds.name} (ID: ${ds.id})`);
      console.log(`- Transformation Status: ${ds.transformation_status}`);
      console.log(`- Transformed At: ${ds.transformation_applied_at}`);
      console.log(`- Record Count: ${ds.record_count}`);
      
      // Check original field names
      if (ds.original_field_names) {
        try {
          const originalFields = JSON.parse(ds.original_field_names);
          console.log(`- Original Fields: ${originalFields.join(', ')}`);
        } catch (e) {
          console.log('- Original Fields: [Parse Error]');
        }
      }

      // Analyze transformed data
      if (ds.transformed_data) {
        try {
          const transformedData = JSON.parse(ds.transformed_data);
          
          // Check if it's UnifiedDataCatalog format or field-mapped array
          if (Array.isArray(transformedData)) {
            console.log('- Data Format: Field-mapped array');
            console.log(`- Records in transformedData: ${transformedData.length}`);
            
            if (transformedData.length > 0) {
              const firstRecord = transformedData[0];
              const fieldNames = Object.keys(firstRecord);
              console.log(`- Transformed Field Names: ${fieldNames.join(', ')}`);
              console.log('- Sample Record:');
              console.log(JSON.stringify(firstRecord, null, 2));
            }
          } else if (transformedData.catalogId && transformedData.records) {
            console.log('- Data Format: UnifiedDataCatalog');
            console.log(`- Catalog ID: ${transformedData.catalogId}`);
            console.log(`- Total Records: ${transformedData.totalRecords}`);
            console.log(`- Records Array Length: ${transformedData.records?.length || 0}`);
            
            if (transformedData.records && transformedData.records.length > 0) {
              const firstRecord = transformedData.records[0];
              if (firstRecord.data) {
                const fieldNames = Object.keys(firstRecord.data);
                console.log(`- Field Names in first record: ${fieldNames.join(', ')}`);
                console.log('- Sample Record Data:');
                console.log(JSON.stringify(firstRecord.data, null, 2));
              }
            }
          } else {
            console.log('- Data Format: Unknown');
            console.log('- Structure:', Object.keys(transformedData));
          }
        } catch (e) {
          console.log('- Transformed Data: [Parse Error]', e.message);
        }
      }

      // Check field mappings for this data source
      const mappings = await pool.query(`
        SELECT 
          fm.source_field_name,
          fm.catalog_field_id,
          cf.name as catalog_field_name,
          cf.display_name
        FROM field_mappings fm
        JOIN catalog_fields cf ON fm.catalog_field_id = cf.id
        WHERE fm.source_id = $1
      `, [ds.id]);

      if (mappings.rows.length > 0) {
        console.log('\n  Field Mappings:');
        for (const mapping of mappings.rows) {
          console.log(`  - "${mapping.source_field_name}" → "${mapping.catalog_field_name}" (${mapping.display_name})`);
        }
      } else {
        console.log('\n  No field mappings found');
      }
    }

    // Now let's trace what happens when the transform endpoint is called
    console.log('\n\n=== Testing Transform Endpoint Behavior ===');
    
    // Get a data source that has field-mapped data
    const testDS = result.rows.find(ds => {
      try {
        const data = JSON.parse(ds.transformed_data);
        return Array.isArray(data) && data.length > 0;
      } catch {
        return false;
      }
    });

    if (testDS) {
      console.log(`\nChecking data source: ${testDS.name} (${testDS.id})`);
      
      // Check what would happen if transform endpoint is called
      console.log('\nWhen transform endpoint is called:');
      console.log('1. It checks for existing transformedData in the database');
      console.log('2. If it finds an array (field-mapped data), it converts it to UnifiedDataCatalog format');
      console.log('3. The field names in the converted catalog should match the field-mapped names');
      console.log('\nBUT: The transform endpoint might be overwriting the field-mapped data');
      console.log('     if it\'s called after apply-mappings without proper checks.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    console.log('\nDatabase connection closed');
  }
}

// Run the test
runTest().catch(console.error);