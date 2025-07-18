import { NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';
import { QueryContextService } from '@/services/queryContextService';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    // Test the PII query context filtering
    const query = 'What data sources contain PII?';
    
    // Get all data sources
    const allDataSources = await DataSourceService.getAllDataSources();
    
    // Find the Patients database specifically (it's lowercase "patients with relationships")
    const patientsDb = allDataSources.find(ds => ds.name.toLowerCase().includes('patients'));
    
    // Get the context that would be used for the query
    const context = await QueryContextService.getRelevantContext(query);
    
    // Extract keywords from query
    const queryLower = query.toLowerCase();
    const keywords = queryLower
      .replace(/[?!.,;:]/g, '')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && !['what', 'where', 'when', 'which', 'average', 'count', 'show', 'the', 'and', 'for'].includes(word)
      );
    
    // Debug info for Patients database
    let patientsKeywords: string[] = [];
    let patientsKeywordsParsed = false;
    if (patientsDb?.aiKeywords) {
      try {
        patientsKeywords = JSON.parse(patientsDb.aiKeywords);
        patientsKeywordsParsed = true;
      } catch (e) {
        logger.error('Failed to parse Patients keywords:', e);
      }
    }
    
    // Check if Patients is in the filtered context
    const patientsInContext = context.dataSources.some(ds => ds.name === 'Patients');
    
    // Manual keyword matching for Patients
    let manualMatch = false;
    if (patientsKeywords.length > 0) {
      for (const keyword of keywords) {
        for (const dbKeyword of patientsKeywords) {
          if (dbKeyword.toLowerCase().includes(keyword) || keyword.includes(dbKeyword.toLowerCase())) {
            manualMatch = true;
            logger.info(`Manual match found: query keyword "${keyword}" matches db keyword "${dbKeyword}"`);
          }
        }
      }
    }
    
    // Check the actual filtering logic from QueryContextService
    const nameMatch = keywords.some(kw => 'patients'.includes(kw));
    const summaryMatch = patientsDb?.aiSummary && keywords.some(kw => patientsDb.aiSummary!.toLowerCase().includes(kw));
    const tagMatch = patientsDb?.tags && patientsDb.tags.some(tag => 
      keywords.some(kw => tag.toLowerCase().includes(kw))
    );
    const aiKeywordMatch = patientsKeywords.length > 0 && patientsKeywords.some(aiKeyword => 
      keywords.some(kw => {
        const aiKwLower = aiKeyword.toLowerCase();
        const kwLower = kw.toLowerCase();
        // Check both directions
        return aiKwLower.includes(kwLower) || kwLower.includes(aiKwLower);
      })
    );
    
    return NextResponse.json({
      query,
      extractedKeywords: keywords,
      patientsDatabase: {
        exists: !!patientsDb,
        id: patientsDb?.id,
        name: patientsDb?.name,
        type: patientsDb?.type,
        hasKeywords: !!patientsDb?.aiKeywords,
        keywordsParsed: patientsKeywordsParsed,
        keywords: patientsKeywords,
        keywordsGeneratedAt: patientsDb?.keywordsGeneratedAt,
        summary: patientsDb?.aiSummary || patientsDb?.userSummary,
        tags: patientsDb?.tags
      },
      filtering: {
        patientsInFilteredContext: patientsInContext,
        totalDataSourcesInContext: context.dataSources.length,
        dataSourcesInContext: context.dataSources.map(ds => ds.name),
        nameMatch,
        summaryMatch,
        tagMatch,
        aiKeywordMatch,
        manualMatch,
        shouldMatch: nameMatch || summaryMatch || tagMatch || aiKeywordMatch
      },
      allDataSources: allDataSources.map(ds => ({
        name: ds.name,
        type: ds.type,
        hasKeywords: !!ds.aiKeywords,
        keywordCount: ds.aiKeywords ? (() => {
          try {
            return JSON.parse(ds.aiKeywords).length;
          } catch {
            return 0;
          }
        })() : 0
      }))
    });
  } catch (error) {
    logger.error('Debug PII query error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}