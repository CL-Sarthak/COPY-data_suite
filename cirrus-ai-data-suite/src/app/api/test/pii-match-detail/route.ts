import { NextResponse } from 'next/server';
import { QueryContextService } from '@/services/queryContextService';

export async function GET() {
  try {
    // Get the full context first
    const fullContext = await QueryContextService.gatherFullContext();
    
    // Now get the filtered context for PII query
    const piiContext = await QueryContextService.getRelevantContext('What data sources contain PII?');
    
    // Compare what's in full vs filtered
    const analysis = {
      query: 'What data sources contain PII?',
      extractedKeywords: ['data', 'sources', 'contain', 'pii'],
      fullContextDataSources: fullContext.dataSources.map(ds => ({
        name: ds.name,
        hasSummary: !!ds.summary,
        summaryContainsPii: ds.summary ? ds.summary.toLowerCase().includes('pii') : false,
        summaryPreview: ds.summary ? ds.summary.substring(0, 150) + '...' : 'No summary',
        aiKeywords: ds.aiKeywords || []
      })),
      filteredContextDataSources: piiContext.dataSources.map(ds => ds.name),
      fullCount: fullContext.dataSources.length,
      filteredCount: piiContext.dataSources.length
    };
    
    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}