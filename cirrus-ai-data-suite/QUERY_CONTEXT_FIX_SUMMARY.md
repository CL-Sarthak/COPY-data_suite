# Query Context Fix Summary

## Issue
The Patients database with PII-related keywords wasn't being included in PII queries because the `QueryContextService` was not checking the `aiKeywords` field when filtering data sources.

## Root Cause
1. The `aiKeywords` field exists in the `DataSourceEntity` and is populated with AI-generated keywords
2. However, the `QueryContextService.getRelevantContext()` method was only checking:
   - Data source name
   - Summary (aiSummary/userSummary)
   - Tags
   
   But NOT checking the `aiKeywords` field!

## Fix Applied

### 1. Updated QueryContext Interface
Added `aiKeywords` to the data source type in the QueryContext interface:
```typescript
export interface QueryContext {
  dataSources: Array<{
    // ... existing fields ...
    aiKeywords?: string[];  // Added this field
  }>;
}
```

### 2. Parse aiKeywords in gatherFullContext
Updated the data source mapping to parse the JSON string of keywords:
```typescript
dataSourcesContext = dataSources.map(ds => {
  // Parse aiKeywords if it's a JSON string
  let keywords: string[] = [];
  if (ds.aiKeywords) {
    try {
      keywords = JSON.parse(ds.aiKeywords);
    } catch {
      keywords = [];
    }
  }
  
  return {
    // ... existing fields ...
    aiKeywords: keywords  // Include parsed keywords
  };
});
```

### 3. Check aiKeywords in Filtering
Updated the filtering logic to check AI keywords:
```typescript
const aiKeywordMatch = ds.aiKeywords && ds.aiKeywords.some(aiKeyword => 
  keywords.some(kw => {
    const aiKwLower = aiKeyword.toLowerCase();
    const kwLower = kw.toLowerCase();
    // Check both directions for flexible matching
    return aiKwLower.includes(kwLower) || kwLower.includes(aiKwLower);
  })
);

return nameMatch || summaryMatch || tagMatch || aiKeywordMatch;
```

### 4. Added Logging
Added comprehensive logging to help debug keyword matching:
- Log extracted keywords from the query
- Log which data sources match and why
- Log all data sources and their keywords when no matches are found

### 5. Created Database Migration
Created migration `056_add_keywords_to_data_sources.ts` to ensure the database schema includes the keywords fields:
- `ai_keywords` TEXT column
- `keywords_generated_at` TIMESTAMP column
- Index on `keywords_generated_at` for performance

## Testing the Fix

To verify the fix works:

1. **Check logs** - When making a query, check the server logs for:
   ```
   Query context: Processing query "..."
   Query context: Extracted keywords: [...]
   Data source "..." matched: name=false, summary=false, tag=false, aiKeyword=true
   ```

2. **Use debug endpoint** - Call `/api/query/debug-metadata` to see all metadata including keywords

3. **Test queries** - Try queries like:
   - "Show me all data sources with PII"
   - "Find patient information"
   - "List databases with personal data"

## Future Improvements

As noted in the original request, we should add the ability to:
1. **Add keywords** - UI to manually add keywords to a data source
2. **Remove keywords** - UI to remove incorrect/unwanted keywords
3. **Edit keywords** - UI to modify existing keywords
4. **Regenerate keywords** - Button to regenerate AI keywords with updated context

These features would give users more control over how their data sources are discovered through natural language queries.