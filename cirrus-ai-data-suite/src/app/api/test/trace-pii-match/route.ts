import { NextResponse } from 'next/server';
import { QueryContextService } from '@/services/queryContextService';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    const query = 'What data sources contain PII?';
    const queryLower = query.toLowerCase();
    const keywords = queryLower
      .replace(/[?!.,;:]/g, '')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && !['what', 'where', 'when', 'which', 'average', 'count', 'show', 'the', 'and', 'for'].includes(word)
      );
    
    // Get the full context
    const fullContext = await QueryContextService.gatherFullContext();
    
    // Manually check each data source
    const detailedMatches = fullContext.dataSources.map(ds => {
      const nameMatch = keywords.some(kw => ds.name.toLowerCase().includes(kw));
      const summaryMatch = ds.summary && keywords.some(kw => ds.summary!.toLowerCase().includes(kw));
      const tagMatch = ds.tags && ds.tags.some(tag => 
        keywords.some(kw => tag.toLowerCase().includes(kw))
      );
      const aiKeywordMatch = ds.aiKeywords && ds.aiKeywords.some(aiKeyword => 
        keywords.some(kw => {
          const aiKwLower = aiKeyword.toLowerCase();
          const kwLower = kw.toLowerCase();
          return aiKwLower.includes(kwLower) || kwLower.includes(aiKwLower);
        })
      );
      
      // Find specific matches
      const matchDetails: Record<string, unknown> = {
        name: ds.name,
        nameMatch,
        summaryMatch,
        tagMatch,
        aiKeywordMatch,
        anyMatch: nameMatch || summaryMatch || tagMatch || aiKeywordMatch
      };
      
      // Add details about what matched
      if (nameMatch) {
        matchDetails.nameMatchKeyword = keywords.find(kw => ds.name.toLowerCase().includes(kw));
      }
      if (summaryMatch && ds.summary) {
        matchDetails.summaryMatchKeyword = keywords.find(kw => ds.summary!.toLowerCase().includes(kw));
        // Find where in summary
        const matchingKw = keywords.find(kw => ds.summary!.toLowerCase().includes(kw));
        if (matchingKw) {
          const index = ds.summary.toLowerCase().indexOf(matchingKw);
          matchDetails.summaryMatchContext = ds.summary.substring(Math.max(0, index - 20), Math.min(ds.summary.length, index + matchingKw.length + 20));
        }
      }
      if (aiKeywordMatch && ds.aiKeywords) {
        matchDetails.matchingAiKeywords = ds.aiKeywords.filter(aiKeyword => 
          keywords.some(kw => {
            const aiKwLower = aiKeyword.toLowerCase();
            const kwLower = kw.toLowerCase();
            return aiKwLower.includes(kwLower) || kwLower.includes(aiKwLower);
          })
        );
      }
      
      return matchDetails;
    });
    
    // Also get what the service actually returns
    const filteredContext = await QueryContextService.getRelevantContext(query);
    
    return NextResponse.json({
      query,
      keywords,
      detailedMatches,
      serviceFilteredDataSources: filteredContext.dataSources.map(ds => ds.name),
      explanation: "If no matches found, service returns all data sources"
    });
  } catch (error) {
    logger.error('Trace PII match error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}