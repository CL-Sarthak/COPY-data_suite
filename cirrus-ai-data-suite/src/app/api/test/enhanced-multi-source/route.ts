import { NextResponse } from 'next/server';
import { QueryContextService } from '@/services/queryContextService';
import { SourceRelationshipService } from '@/services/sourceRelationshipService';
import { logger } from '@/utils/logger';

/**
 * Enhanced test endpoint for the improved multi-source query logic
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET() {
  try {
    logger.info('Testing enhanced multi-source query logic...');
    
    const results: any[] = [];
    
    // Test 1: Basic context comparison
    const testQuery = "Show me customer information";
    
    const basicContext = await QueryContextService.getRelevantContext(testQuery);
    const enhancedContext = await QueryContextService.getEnhancedRelevantContext(testQuery);
    
    results.push({
      test: 'Context Enhancement Comparison',
      query: testQuery,
      basicSources: basicContext.dataSources.length,
      enhancedSources: enhancedContext.context.dataSources.length,
      recommendedSources: enhancedContext.recommendedSources.length,
      relationshipAnalysis: {
        totalRelationships: enhancedContext.relationshipAnalysis.relationships.length,
        allowedPairs: enhancedContext.relationshipAnalysis.allowedPairs.length,
        suggestions: enhancedContext.relationshipAnalysis.suggestions
      },
      improvement: enhancedContext.context.dataSources.length < basicContext.dataSources.length ? 'Filtered down for better focus' : 'No filtering applied'
    });
    
    // Test 2: Detailed relationship analysis for each pair
    if (basicContext.dataSources.length >= 2) {
      const detailedAnalysis = SourceRelationshipService.analyzeGroupRelationships(
        basicContext.dataSources.slice(0, 4) // Analyze first 4 sources
      );
      
      results.push({
        test: 'Detailed Relationship Analysis',
        relationships: detailedAnalysis.relationships.map(rel => ({
          source1: rel.source1.name,
          source2: rel.source2.name,
          score: rel.relationshipScore,
          type: rel.relationshipType,
          allowJoin: rel.allowJoin,
          reason: rel.reason,
          evidenceCount: rel.evidence.length,
          evidenceTypes: rel.evidence.map(e => e.type)
        })),
        allowedPairs: detailedAnalysis.allowedPairs,
        suggestions: detailedAnalysis.suggestions
      });
    }
    
    // Test 3: Different query types to test filtering
    const testQueries = [
      'What personal data do we have?',
      'Show me financial information',
      'List all patient records',
      'Display weather data',
      'Find vehicle information'
    ];
    
    const queryTestResults = [];
    
    for (const query of testQueries) {
      try {
        const enhanced = await QueryContextService.getEnhancedRelevantContext(query);
        
        queryTestResults.push({
          query,
          originalSources: (await QueryContextService.getRelevantContext(query)).dataSources.length,
          filteredSources: enhanced.context.dataSources.length,
          sourcesSelected: enhanced.context.dataSources.map(ds => ds.name),
          relationships: enhanced.relationshipAnalysis.relationships.length,
          allowedJoins: enhanced.relationshipAnalysis.allowedPairs.length
        });
      } catch (error) {
        queryTestResults.push({
          query,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    results.push({
      test: 'Query-Specific Filtering',
      results: queryTestResults
    });
    
    // Test 4: Relationship strength analysis
    const fullContext = await QueryContextService.gatherFullContext();
    const allSources = fullContext.dataSources.slice(0, 5); // Limit for performance
    
    if (allSources.length >= 2) {
      const strengthAnalysis = [];
      
      for (let i = 0; i < allSources.length; i++) {
        for (let j = i + 1; j < allSources.length; j++) {
          const relationship = SourceRelationshipService.analyzeRelationship(
            allSources[i],
            allSources[j]
          );
          
          strengthAnalysis.push({
            pair: `${allSources[i].name} <-> ${allSources[j].name}`,
            score: Math.round(relationship.relationshipScore * 100) / 100,
            type: relationship.relationshipType,
            allowJoin: relationship.allowJoin,
            evidenceTypes: relationship.evidence.map(e => e.type),
            keywordOverlap: analyzeKeywordOverlap(allSources[i], allSources[j])
          });
        }
      }
      
      results.push({
        test: 'Relationship Strength Analysis',
        analysisCount: strengthAnalysis.length,
        strongRelationships: strengthAnalysis.filter(a => a.type === 'strong').length,
        moderateRelationships: strengthAnalysis.filter(a => a.type === 'moderate').length,
        weakRelationships: strengthAnalysis.filter(a => a.type === 'weak').length,
        unrelatedPairs: strengthAnalysis.filter(a => a.type === 'unrelated').length,
        allowedJoins: strengthAnalysis.filter(a => a.allowJoin).length,
        details: strengthAnalysis
      });
    }
    
    // Summary statistics
    const summary = {
      totalTests: results.length,
      sourcesAnalyzed: fullContext.dataSources.length,
      tablesAnalyzed: fullContext.tables.length,
      enhancementWorking: results.some((r: any) => r.improvement && r.improvement.includes('Filtered')),
      relationshipDetectionWorking: results.some((r: any) => r.allowedJoins > 0)
    };
    
    return NextResponse.json({
      success: true,
      summary,
      results,
      recommendations: [
        'Enhanced multi-source logic is now active',
        'Sources are being analyzed for legitimate relationships',
        'Queries are filtered to prevent unrelated data source joins',
        'Continue monitoring query performance and accuracy'
      ]
    });
    
  } catch (error) {
    logger.error('Enhanced multi-source test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// Helper function to analyze keyword overlap
function analyzeKeywordOverlap(source1: { aiKeywords?: string[] }, source2: { aiKeywords?: string[] }): {
  source1Keywords: number;
  source2Keywords: number;
  sharedKeywords: number;
  overlapPercentage: number;
} {
  const keywords1 = source1.aiKeywords || [];
  const keywords2 = source2.aiKeywords || [];
  
  const shared = keywords1.filter((k1: string) =>
    keywords2.some((k2: string) => k1.toLowerCase() === k2.toLowerCase())
  ).length;
  
  const total = Math.max(keywords1.length, keywords2.length);
  const overlapPercentage = total > 0 ? Math.round((shared / total) * 100) : 0;
  
  return {
    source1Keywords: keywords1.length,
    source2Keywords: keywords2.length,
    sharedKeywords: shared,
    overlapPercentage
  };
}