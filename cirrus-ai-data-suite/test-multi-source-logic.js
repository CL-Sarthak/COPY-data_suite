#!/usr/bin/env node

/**
 * Test script to verify multi-source query logic
 * 
 * Tests scenarios:
 * 1. Related tables within a single data source (should work)
 * 2. Unrelated data sources being joined (should be prevented)
 * 3. Legitimate related sources (e.g., customer data + orders from same business system)
 */

const { QueryContextService } = require('./src/services/queryContextService');
const { QueryExecutionService } = require('./src/services/queryExecutionService');

async function testMultiSourceLogic() {
  console.log('🔍 Testing Multi-Source Query Logic...\n');

  try {
    // Test 1: Get full context to understand available data
    console.log('1. Getting full context...');
    const fullContext = await QueryContextService.gatherFullContext();
    
    console.log(`\nFound ${fullContext.dataSources.length} data sources:`);
    fullContext.dataSources.forEach(ds => {
      console.log(`  - ${ds.name} (${ds.type}) - ${ds.recordCount || 0} records`);
      if (ds.aiKeywords && ds.aiKeywords.length > 0) {
        console.log(`    Keywords: ${ds.aiKeywords.join(', ')}`);
      }
    });

    console.log(`\nFound ${fullContext.tables.length} tables:`);
    fullContext.tables.forEach(table => {
      console.log(`  - ${table.dataSourceName}.${table.tableName} (${table.recordCount || 0} records)`);
      if (table.columns && table.columns.length > 0) {
        console.log(`    Columns: ${table.columns.map(c => c.name).join(', ')}`);
      }
    });

    // Test 2: Test single data source query (should work)
    console.log('\n2. Testing single data source query...');
    const singleSourceQuery = "Show me customer information";
    const singleSourceContext = await QueryContextService.getRelevantContext(singleSourceQuery);
    
    console.log(`Single source context includes ${singleSourceContext.dataSources.length} data sources:`);
    singleSourceContext.dataSources.forEach(ds => {
      console.log(`  - ${ds.name} (matched by keywords)`);
    });

    // Test 3: Test potential multi-source query
    console.log('\n3. Testing potential multi-source query...');
    const multiSourceQuery = "Show me all data with personal information";
    const multiSourceContext = await QueryContextService.getRelevantContext(multiSourceQuery);
    
    console.log(`Multi source context includes ${multiSourceContext.dataSources.length} data sources:`);
    multiSourceContext.dataSources.forEach(ds => {
      console.log(`  - ${ds.name} (matched by keywords)`);
    });

    // Test 4: Test related data detection
    console.log('\n4. Testing relationships between tables...');
    if (fullContext.relationships && fullContext.relationships.length > 0) {
      console.log('Found relationships:');
      fullContext.relationships.forEach(rel => {
        console.log(`  - ${rel.sourceTable}.${rel.sourceField} -> ${rel.targetTable}.${rel.targetField}`);
      });
    } else {
      console.log('No relationships found between tables');
    }

    // Test 5: Test query generation with multiple sources
    console.log('\n5. Testing query generation logic...');
    
    // Create a test context with multiple potentially related sources
    const testContext = {
      dataSources: fullContext.dataSources.slice(0, 3), // Take first 3 sources
      tables: fullContext.tables.slice(0, 5), // Take first 5 tables
      fields: fullContext.fields.slice(0, 10),
      patterns: [],
      annotations: [],
      relationships: fullContext.relationships || []
    };

    console.log('\nTest context includes:');
    testContext.dataSources.forEach(ds => {
      console.log(`  Data Source: ${ds.name}`);
    });
    testContext.tables.forEach(table => {
      console.log(`  Table: ${table.dataSourceName}.${table.tableName}`);
    });

    // This should trigger the logic that determines if sources are related or not
    console.log('\n6. Analyzing source relationships...');
    
    // Group tables by data source
    const tablesBySource = new Map();
    testContext.tables.forEach(table => {
      if (!tablesBySource.has(table.dataSourceId)) {
        tablesBySource.set(table.dataSourceId, []);
      }
      tablesBySource.get(table.dataSourceId).push(table);
    });

    console.log('\nTables grouped by data source:');
    for (const [sourceId, tables] of tablesBySource.entries()) {
      const sourceName = testContext.dataSources.find(ds => ds.id === sourceId)?.name || sourceId;
      console.log(`  ${sourceName}:`);
      tables.forEach(table => {
        console.log(`    - ${table.tableName}`);
      });
    }

    // Test 7: Check if there are any cross-source relationships
    console.log('\n7. Checking for cross-source relationships...');
    const crossSourceRels = testContext.relationships.filter(rel => {
      const sourceTable = testContext.tables.find(t => t.tableName === rel.sourceTable);
      const targetTable = testContext.tables.find(t => t.tableName === rel.targetTable);
      return sourceTable && targetTable && sourceTable.dataSourceId !== targetTable.dataSourceId;
    });

    if (crossSourceRels.length > 0) {
      console.log('Found cross-source relationships:');
      crossSourceRels.forEach(rel => {
        console.log(`  - ${rel.sourceTable} -> ${rel.targetTable} (potential legitimate join)`);
      });
    } else {
      console.log('No cross-source relationships found');
    }

    console.log('\n✅ Multi-source logic test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Helper function to analyze if two data sources are legitimately related
function analyzeSourceRelationship(source1, source2, relationships) {
  console.log(`\nAnalyzing relationship between "${source1.name}" and "${source2.name}":`);
  
  // Check for direct table relationships
  const directRels = relationships.filter(rel => 
    (rel.dataSourceId === source1.id && rel.targetTable.includes(source2.name)) ||
    (rel.dataSourceId === source2.id && rel.targetTable.includes(source1.name))
  );
  
  if (directRels.length > 0) {
    console.log('  ✅ Direct table relationships found');
    return true;
  }
  
  // Check for keyword/domain similarity
  const keywords1 = source1.aiKeywords || [];
  const keywords2 = source2.aiKeywords || [];
  
  const sharedKeywords = keywords1.filter(k1 => 
    keywords2.some(k2 => k1.toLowerCase().includes(k2.toLowerCase()) || k2.toLowerCase().includes(k1.toLowerCase()))
  );
  
  if (sharedKeywords.length > 0) {
    console.log(`  ⚠️ Shared keywords found: ${sharedKeywords.join(', ')} (potential domain match)`);
    return true;
  }
  
  console.log('  ❌ No clear relationship detected');
  return false;
}

if (require.main === module) {
  testMultiSourceLogic();
}

module.exports = { testMultiSourceLogic, analyzeSourceRelationship };