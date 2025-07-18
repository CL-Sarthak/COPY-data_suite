// Test script to verify query context keyword matching
const { QueryContextService } = require('./dist/services/queryContextService');

async function testQueryContext() {
  try {
    console.log('Testing query context with PII-related query...\n');
    
    // Test with a PII-related query
    const query = "Show me all data sources with PII information";
    console.log(`Query: "${query}"\n`);
    
    const context = await QueryContextService.getRelevantContext(query);
    
    console.log('Relevant data sources found:', context.dataSources.length);
    context.dataSources.forEach(ds => {
      console.log(`  - ${ds.name} (${ds.type})`);
      if (ds.aiKeywords && ds.aiKeywords.length > 0) {
        console.log(`    Keywords: ${ds.aiKeywords.join(', ')}`);
      }
    });
    
    console.log('\nTables found:', context.tables.length);
    console.log('Fields found:', context.fields.length);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testQueryContext();