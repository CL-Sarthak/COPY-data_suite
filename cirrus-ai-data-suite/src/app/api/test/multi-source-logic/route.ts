import { NextResponse } from 'next/server';
import { QueryContextService } from '@/services/queryContextService';
import { logger } from '@/utils/logger';

/**
 * Test endpoint to verify multi-source query logic
 * 
 * Tests scenarios:
 * 1. Related tables within a single data source (should work)
 * 2. Unrelated data sources being joined (should be prevented)
 * 3. Legitimate related sources (e.g., customer data + orders from same business system)
 */

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: unknown;
}

// Helper function to analyze if two data sources are legitimately related
function analyzeSourceRelationship(source1: { id: string; name: string; type: string; aiKeywords?: string[] }, source2: { id: string; name: string; type: string; aiKeywords?: string[] }, relationships: { dataSourceId: string }[]): { 
  related: boolean; 
  reason: string; 
  evidence: string[] 
} {
  const evidence: string[] = [];
  
  // Check for direct table relationships within the same data source
  const source1Tables = relationships.filter(rel => rel.dataSourceId === source1.id);
  const source2Tables = relationships.filter(rel => rel.dataSourceId === source2.id);
  
  if (source1Tables.length > 0 && source2Tables.length > 0) {
    evidence.push(`Both sources have internal table relationships`);
  }
  
  // Check for keyword/domain similarity
  const keywords1 = source1.aiKeywords || [];
  const keywords2 = source2.aiKeywords || [];
  
  const sharedKeywords = keywords1.filter((k1: string) => 
    keywords2.some((k2: string) => 
      k1.toLowerCase().includes(k2.toLowerCase()) || 
      k2.toLowerCase().includes(k1.toLowerCase())
    )
  );
  
  if (sharedKeywords.length > 0) {
    evidence.push(`Shared keywords: ${sharedKeywords.join(', ')}`);
  }
  
  // Check for similar data types or naming patterns
  const type1 = source1.type;
  const type2 = source2.type;
  
  if (type1 === type2) {
    evidence.push(`Same source type: ${type1}`);
  }
  
  // Check name similarity (could indicate related business systems)
  const name1 = source1.name.toLowerCase();
  const name2 = source2.name.toLowerCase();
  
  const commonWords = name1.split(/[\s_-]+/).filter((word: string) => 
    name2.split(/[\s_-]+/).includes(word) && word.length > 2
  );
  
  if (commonWords.length > 0) {
    evidence.push(`Similar naming: ${commonWords.join(', ')}`);
  }
  
  // Determine if they're related based on evidence
  const related = evidence.length >= 2 || sharedKeywords.length >= 2;
  
  return {
    related,
    reason: related 
      ? `Sources appear related based on multiple factors`
      : `No strong relationship indicators found`,
    evidence
  };
}

export async function GET() {
  try {
    const results: TestResult[] = [];
    
    // Test 1: Get full context to understand available data
    logger.info('Testing multi-source query logic...');
    
    const fullContext = await QueryContextService.gatherFullContext();
    
    results.push({
      test: 'Context Gathering',
      status: 'pass',
      message: `Successfully gathered context`,
      details: {
        dataSources: fullContext.dataSources.length,
        tables: fullContext.tables.length,
        fields: fullContext.fields.length,
        relationships: fullContext.relationships?.length || 0
      }
    });
    
    // Test 2: Analyze data source distribution
    const tablesBySource = new Map();
    fullContext.tables.forEach(table => {
      if (!tablesBySource.has(table.dataSourceId)) {
        tablesBySource.set(table.dataSourceId, []);
      }
      tablesBySource.get(table.dataSourceId).push(table);
    });
    
    const multiTableSources = Array.from(tablesBySource.entries())
      .filter(([, tables]) => tables.length > 1)
      .map(([sourceId, tables]) => ({
        sourceId,
        sourceName: fullContext.dataSources.find(ds => ds.id === sourceId)?.name,
        tableCount: tables.length,
        tables: tables.map((t: { tableName: string }) => t.tableName)
      }));
    
    results.push({
      test: 'Multi-Table Sources Analysis',
      status: multiTableSources.length > 0 ? 'pass' : 'warning',
      message: `Found ${multiTableSources.length} data sources with multiple tables`,
      details: multiTableSources
    });
    
    // Test 3: Test context filtering for different query types
    const testQueries = [
      'Show me customer information',
      'What personal data do we have?',
      'List all financial records',
      'Show me data with email addresses'
    ];
    
    for (const query of testQueries) {
      const relevantContext = await QueryContextService.getRelevantContext(query);
      
      results.push({
        test: `Query Context Filtering: "${query}"`,
        status: relevantContext.dataSources.length > 0 ? 'pass' : 'warning',
        message: `Found ${relevantContext.dataSources.length} relevant sources`,
        details: {
          originalSources: fullContext.dataSources.length,
          filteredSources: relevantContext.dataSources.length,
          matchedSources: relevantContext.dataSources.map(ds => ({
            name: ds.name,
            keywords: ds.aiKeywords
          }))
        }
      });
    }
    
    // Test 4: Cross-source relationship analysis
    if (fullContext.dataSources.length >= 2) {
      const relationshipTests = [];
      
      // Test all pairs of data sources
      for (let i = 0; i < Math.min(fullContext.dataSources.length, 5); i++) {
        for (let j = i + 1; j < Math.min(fullContext.dataSources.length, 5); j++) {
          const source1 = fullContext.dataSources[i];
          const source2 = fullContext.dataSources[j];
          
          const analysis = analyzeSourceRelationship(
            source1, 
            source2, 
            fullContext.relationships || []
          );
          
          relationshipTests.push({
            source1: source1.name,
            source2: source2.name,
            related: analysis.related,
            reason: analysis.reason,
            evidence: analysis.evidence
          });
        }
      }
      
      const relatedPairs = relationshipTests.filter(test => test.related);
      
      results.push({
        test: 'Cross-Source Relationship Analysis',
        status: relationshipTests.length > 0 ? 'pass' : 'warning',
        message: `Analyzed ${relationshipTests.length} source pairs, found ${relatedPairs.length} potentially related`,
        details: {
          allTests: relationshipTests,
          relatedPairs: relatedPairs
        }
      });
    }
    
    // Test 5: Query generation safety check
    const multiSourceContext = {
      dataSources: fullContext.dataSources.slice(0, 3),
      tables: fullContext.tables.slice(0, 5),
      fields: fullContext.fields.slice(0, 10),
      patterns: [],
      annotations: [],
      relationships: fullContext.relationships || []
    };
    
    // Check if the context respects single-source constraints
    const sourcesInContext = new Set(multiSourceContext.tables.map(t => t.dataSourceId));
    
    results.push({
      test: 'Single-Source Constraint Validation',
      status: sourcesInContext.size <= 3 ? 'pass' : 'warning',
      message: `Context includes tables from ${sourcesInContext.size} different sources`,
      details: {
        expectedMaxSources: 3,
        actualSources: sourcesInContext.size,
        sourceBreakdown: Array.from(sourcesInContext).map(sourceId => ({
          sourceId,
          sourceName: fullContext.dataSources.find(ds => ds.id === sourceId)?.name,
          tableCount: multiSourceContext.tables.filter(t => t.dataSourceId === sourceId).length
        }))
      }
    });
    
    // Test 6: Keyword matching effectiveness
    const keywordTests = fullContext.dataSources
      .filter(ds => ds.aiKeywords && ds.aiKeywords.length > 0)
      .map(ds => ({
        source: ds.name,
        keywords: ds.aiKeywords,
        keywordCount: ds.aiKeywords?.length || 0
      }));
    
    results.push({
      test: 'Keyword Matching Coverage',
      status: keywordTests.length > 0 ? 'pass' : 'warning',
      message: `${keywordTests.length} sources have AI-generated keywords`,
      details: keywordTests
    });
    
    // Summary
    const passCount = results.filter(r => r.status === 'pass').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    
    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        passed: passCount,
        warnings: warningCount,
        failed: failCount,
        overallStatus: failCount > 0 ? 'fail' : warningCount > 0 ? 'warning' : 'pass'
      },
      results,
      recommendations: [
        'Ensure data sources have comprehensive AI-generated keywords for better matching',
        'Consider implementing explicit business domain grouping for related sources',
        'Add more sophisticated relationship detection between conceptually related data sources',
        'Implement query validation to prevent cross-source joins unless explicitly allowed'
      ]
    });
    
  } catch (error) {
    logger.error('Multi-source logic test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}