import { NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';

export async function GET() {
  try {
    // Get all data sources
    const allDataSources = await DataSourceService.getAllDataSources();
    
    // Test keyword matching for "pii"
    const queryKeyword = 'pii';
    
    const results = allDataSources.map(ds => {
      // Parse keywords
      let keywords: string[] = [];
      try {
        if (ds.aiKeywords) {
          keywords = JSON.parse(ds.aiKeywords);
        }
      } catch {}
      
      // Check each type of match
      const nameMatch = ds.name.toLowerCase().includes(queryKeyword);
      
      const summaryMatch = !!(ds.aiSummary && ds.aiSummary.toLowerCase().includes(queryKeyword)) ||
                          !!(ds.userSummary && ds.userSummary.toLowerCase().includes(queryKeyword));
      
      const keywordMatch = keywords.some(kw => {
        const kwLower = kw.toLowerCase();
        // Check both directions as per the actual implementation
        return kwLower.includes(queryKeyword) || queryKeyword.includes(kwLower);
      });
      
      // Extract what made it match
      let matchReason = '';
      if (nameMatch) matchReason += 'name, ';
      if (summaryMatch) {
        matchReason += 'summary, ';
        // Find the specific part that matched
        const summary = (ds.aiSummary || ds.userSummary || '').toLowerCase();
        const index = summary.indexOf(queryKeyword);
        if (index >= 0) {
          const start = Math.max(0, index - 20);
          const end = Math.min(summary.length, index + queryKeyword.length + 20);
          matchReason += `[...${summary.substring(start, end)}...]`;
        }
      }
      if (keywordMatch) {
        matchReason += 'keywords: ' + keywords.filter(kw => 
          kw.toLowerCase().includes(queryKeyword) || queryKeyword.includes(kw.toLowerCase())
        ).join(', ');
      }
      
      return {
        name: ds.name,
        matches: nameMatch || summaryMatch || keywordMatch,
        nameMatch,
        summaryMatch,
        keywordMatch,
        matchReason: matchReason || 'no match',
        keywords: keywords.slice(0, 5), // Show first 5 keywords
        summaryPreview: ds.aiSummary ? ds.aiSummary.substring(0, 100) + '...' : 'No summary'
      };
    });
    
    return NextResponse.json({
      queryKeyword,
      totalDataSources: allDataSources.length,
      matchingCount: results.filter(r => r.matches).length,
      results
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}