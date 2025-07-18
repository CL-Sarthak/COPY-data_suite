import { NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';

export async function GET() {
  try {
    // Test keyword matching logic
    const dataSources = await DataSourceService.getAllDataSources();
    
    // Simulate the query filtering logic
    const query = 'What data sources contain PII?';
    const queryLower = query.toLowerCase();
    const keywords = queryLower
      .replace(/[?!.,;:]/g, '')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && !['what', 'where', 'when', 'which', 'average', 'count', 'show', 'the', 'and', 'for'].includes(word)
      );
    
    const results = dataSources.map(ds => {
      let aiKeywords: string[] = [];
      if (ds.aiKeywords) {
        try {
          aiKeywords = JSON.parse(ds.aiKeywords);
        } catch {
          aiKeywords = [];
        }
      }
      
      // Check matches
      const nameMatch = keywords.some(kw => ds.name.toLowerCase().includes(kw));
      const summaryMatch = ds.aiSummary && keywords.some(kw => ds.aiSummary!.toLowerCase().includes(kw));
      const tagMatch = ds.tags && ds.tags.some(tag => 
        keywords.some(kw => tag.toLowerCase().includes(kw))
      );
      const aiKeywordMatch = aiKeywords.length > 0 && aiKeywords.some(aiKeyword => 
        keywords.some(kw => {
          const aiKwLower = aiKeyword.toLowerCase();
          const kwLower = kw.toLowerCase();
          return aiKwLower.includes(kwLower) || kwLower.includes(aiKwLower);
        })
      );
      
      return {
        name: ds.name,
        type: ds.type,
        aiKeywords,
        queryKeywords: keywords,
        matches: {
          nameMatch,
          summaryMatch,
          tagMatch,
          aiKeywordMatch,
          anyMatch: nameMatch || summaryMatch || tagMatch || aiKeywordMatch
        }
      };
    });
    
    return NextResponse.json({
      query,
      extractedKeywords: keywords,
      totalDataSources: dataSources.length,
      matchingDataSources: results.filter(r => r.matches.anyMatch).map(r => r.name),
      allResults: results
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}