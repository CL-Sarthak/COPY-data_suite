import { NextResponse } from 'next/server';
import { QueryContextService } from '@/services/queryContextService';
import { logger } from '@/utils/logger';

export async function GET() {
  try {

    // Get context to build intelligent suggestions
    const context = await QueryContextService.gatherFullContext();
    
    const suggestions: string[] = [];

    // Add suggestions based on available data
    if (context.dataSources.length > 0) {
      suggestions.push('What data sources contain personal information?');
      suggestions.push('Show me all data sources with customer data');
      suggestions.push(`What kind of data is in ${context.dataSources[0].name}?`);
    }

    if (context.fields.filter(f => f.isPII).length > 0) {
      suggestions.push('Which fields contain PII data?');
      suggestions.push('List all email address fields across all data sources');
      suggestions.push('What types of sensitive data do we have?');
    }

    if (context.patterns.length > 0) {
      suggestions.push('What patterns are defined for detecting sensitive data?');
      suggestions.push('Show me all financial data patterns');
    }

    if (context.tables.length > 0) {
      suggestions.push('Which tables have the most records?');
      suggestions.push('What tables contain customer information?');
      const firstTable = context.tables[0];
      suggestions.push(`Describe the ${firstTable.tableName} table`);
    }

    if (context.annotations.length > 0) {
      suggestions.push('Show me all annotated fields');
      suggestions.push('What business glossary terms are defined?');
    }

    // Add general suggestions
    suggestions.push('How many data sources do we have?');
    suggestions.push('What API endpoints are configured?');
    suggestions.push('Show me data quality issues');
    suggestions.push('List all databases connected to the system');
    suggestions.push('What data was imported in the last week?');

    // Return unique suggestions
    const uniqueSuggestions = [...new Set(suggestions)];

    return NextResponse.json({ suggestions: uniqueSuggestions.slice(0, 15) });
  } catch (error) {
    logger.error('Failed to get query suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to get query suggestions' },
      { status: 500 }
    );
  }
}