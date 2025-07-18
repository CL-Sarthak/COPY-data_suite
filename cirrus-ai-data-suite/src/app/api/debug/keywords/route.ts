import { NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';
import { QueryContextService } from '@/services/queryContextService';

export async function GET() {
  try {
    // Get all data sources with their keywords
    const dataSources = await DataSourceService.getAllDataSources();
    
    // Get query context to see how keywords are processed
    const fullContext = await QueryContextService.gatherFullContext();
    const piiContext = await QueryContextService.getRelevantContext('What data sources contain PII?');
    
    const debugInfo = {
      allDataSources: dataSources.map(ds => ({
        id: ds.id,
        name: ds.name,
        type: ds.type,
        aiKeywords: ds.aiKeywords,
        keywordsGeneratedAt: ds.keywordsGeneratedAt,
        parsedKeywords: ds.aiKeywords ? (() => {
          try {
            return JSON.parse(ds.aiKeywords);
          } catch {
            return 'PARSE_ERROR';
          }
        })() : null
      })),
      contextDataSources: fullContext.dataSources.map(ds => ({
        name: ds.name,
        aiKeywords: ds.aiKeywords
      })),
      piiQueryMatches: piiContext.dataSources.map(ds => ds.name),
      queryKeywords: ['pii', 'data', 'sources', 'contain']
    };
    
    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error) {
    console.error('Debug keywords error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}