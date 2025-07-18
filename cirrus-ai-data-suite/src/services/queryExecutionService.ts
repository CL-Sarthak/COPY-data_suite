import { QueryContextService, QueryContext } from './queryContextService';
import { DataAnalysisService } from './dataAnalysisService';
import { DataQuery, QueryResult as AnalysisResult } from '@/types/dataAnalysis';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { fetchWithRetry } from '@/utils/retryUtils';

interface QueryResult {
  id: string;
  query: string;
  answer: string;
  sources: Array<{
    type: 'data_source' | 'table' | 'field' | 'pattern';
    name: string;
    id: string;
  }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  timestamp: Date;
  // Development only - show generated query/code
  generatedQuery?: DataQuery;
}

export class QueryExecutionService {
  /**
   * Execute a natural language query
   */
  static async executeQuery(query: string, explainMethodology = true): Promise<QueryResult> {
    try {
      const queryId = uuidv4();
      const timestamp = new Date();

      // Get enhanced context with relationship analysis based on the query
      const enhancedContextResult = await QueryContextService.getEnhancedRelevantContext(query);
      const context = enhancedContextResult.context;
      
      const contextPrompt = QueryContextService.buildContextPrompt(context);

      // Determine if we need to work with actual data
      const needsDataOperations = this.queryNeedsDataOperations();
      let analysisResult = null;
      let dataQuery: DataQuery | null = null;

      if (needsDataOperations) {
        // Let the LLM generate an appropriate data query based on context
        // Pass the relationship analysis to help determine if multi-source queries are allowed
        dataQuery = await this.generateDataQuery(query, context, enhancedContextResult.relationshipAnalysis);
        
        logger.info('Generated data query:', {
          hasQuery: !!dataQuery,
          queryType: dataQuery?.type,
          sources: dataQuery?.sources,
          operations: dataQuery?.operations?.map(op => ({ 
            type: op.type, 
            aggregations: op.aggregations,
            conditions: op.conditions 
          }))
        });
        
        if (dataQuery) {
          analysisResult = await DataAnalysisService.executeQuery(dataQuery);
          
          logger.info('Analysis result:', {
            success: analysisResult.success,
            hasData: !!analysisResult.data,
            dataType: typeof analysisResult.data,
            error: analysisResult.error,
            recordsProcessed: analysisResult.metadata?.recordsProcessed
          });
        } else {
          logger.warn('No data query generated for:', query);
        }
      }

      // Build the full prompt for the LLM
      const systemPrompt = this.buildSystemPrompt(needsDataOperations, explainMethodology);
      
      const userPrompt = this.buildUserPrompt(contextPrompt, query, analysisResult);

      // Call LLM API
      logger.info('Query execution context:', {
        hasAnalysisResult: !!analysisResult,
        analysisSuccess: analysisResult?.success,
        hasData: !!analysisResult?.data,
        explainMethodology,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length
      });
      
      let response = await this.callLLM(systemPrompt, userPrompt);

      // Check if the response indicates a missing field
      if (response.toLowerCase().includes('no') && response.toLowerCase().includes('field is defined')) {
        // Enhance the error message with available fields
        const availableFields = this.getAvailableFieldsForContext(context);
        response += `\n\n**Available fields in the data catalog:**\n${availableFields}`;
      }

      // Extract sources mentioned in the response
      const sources = this.extractSources(response, context);

      const result: QueryResult = {
        id: queryId,
        query,
        answer: response,
        sources,
        data: analysisResult?.data || null,
        timestamp
      };

      // Include generated query for transparency
      logger.info('Including generated query:', { 
        hasDataQuery: !!dataQuery,
        dataQueryType: dataQuery?.type,
        hasCode: dataQuery?.code ? 'yes' : 'no'
      });
      
      if (dataQuery) {
        result.generatedQuery = dataQuery;
      }

      return result;
    } catch (error) {
      logger.error('Failed to execute query:', error);
      throw new Error('Failed to execute query');
    }
  }

  /**
   * Determine if the query needs data operations (analysis or retrieval)
   * This is a simple heuristic - the LLM will make the final decision
   */
  private static queryNeedsDataOperations(): boolean {
    // Always attempt to generate a data query and let the LLM decide
    // based on the actual context whether it needs data or just metadata
    return true;
  }

  /**
   * Call LLM API to get response
   */
  private static async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      // Check if we have an API key configured
      const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
      
      if (!apiKey) {
        // For query generation, return a mock JSON response
        if (systemPrompt.includes('data query generator')) {
          // This will be handled by generateMockDataQuery
          return '{}';
        }
        // Return a mock response if no API key is configured
        return this.generateMockResponse(userPrompt);
      }

      // Use OpenAI API
      if (process.env.OPENAI_API_KEY) {
        const response = await fetchWithRetry(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              temperature: 0.7,
              max_tokens: 1000
            })
          },
          {
            maxRetries: 3,
            initialDelay: 2000,
            maxDelay: 60000
          }
        );

        const data = await response.json();
        return data.choices[0].message.content;
      }

      // Use Anthropic API
      if (process.env.ANTHROPIC_API_KEY) {
        try {
          const response = await fetchWithRetry(
            'https://api.anthropic.com/v1/messages',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',  // Updated to latest model
                max_tokens: 1000,
                messages: [
                  { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
                ]
              })
            },
            {
              maxRetries: 5, // More retries for Anthropic 529 errors
              initialDelay: 3000, // Longer initial delay
              maxDelay: 120000, // Up to 2 minute delays
              backoffMultiplier: 2.5, // More aggressive backoff
              onRetry: (error, attempt, delay) => {
                logger.warn(`Anthropic API retry attempt ${attempt} after ${delay}ms. Error: ${error.message}`);
              }
            }
          );

          const data = await response.json();
          return data.content[0].text;
        } catch (error) {
          // Check if it's a 529 error and provide a more helpful message
          if (error instanceof Error && error.message.includes('529')) {
            logger.error('Anthropic API is overloaded (529 error). Will use fallback response.');
            return this.generateMockResponse(userPrompt);
          }
          throw error;
        }
      }

      // Fallback to mock response
      return this.generateMockResponse(userPrompt);
    } catch (error) {
      logger.error('Failed to call LLM API:', error);
      // Return a helpful error message
      return 'I apologize, but I encountered an error while processing your query. Please ensure the LLM API is properly configured and try again.';
    }
  }

  /**
   * Generate a mock response for development/testing
   */
  private static generateMockResponse(prompt: string): string {
    // Check if we have analysis results in the prompt
    if (prompt.includes('Analysis Results:')) {
      const resultsMatch = prompt.match(/Analysis Results:\s*(\[[\s\S]*?\]|{[\s\S]*?})\s*(?:Metadata:|Question:)/);
      if (resultsMatch) {
        try {
          const results = JSON.parse(resultsMatch[1]);
          
          // CRITICAL: Check the system prompt to see if we should explain methodology
          // Look for the explain methodology instruction
          const shouldExplain = prompt.includes('explain your methodology');
          
          // Handle array results
          if (Array.isArray(results)) {
            if (results.length === 0) {
              return shouldExplain ? 'No records were found matching your criteria.' : 'No results found.';
            }
            
            // Format results as a simple table
            if (results.length > 0 && typeof results[0] === 'object') {
              // Get all keys except internal ones
              const keys = Object.keys(results[0]).filter(k => !k.startsWith('_'));
              
              if (keys.length > 0) {
                // Create a simple table representation
                let table = '| ' + keys.join(' | ') + ' |\n';
                table += '|' + keys.map(() => '---').join('|') + '|\n';
                results.forEach(row => {
                  table += '| ' + keys.map(k => String(row[k] || '')).join(' | ') + ' |\n';
                });
                
                // CRITICAL: When methodology is off, return ONLY the table
                if (!shouldExplain) {
                  return table.trim(); // Just the table, no additional text
                }
                
                // Only add extra text if we're explaining methodology
                if (results.length > 10) {
                  return table + `\n\n*Showing all ${results.length} results*`;
                }
                return table;
              }
            }
            
            return shouldExplain ? `Found ${results.length} results.` : `${results.length} results`;
          }
          
          // Handle object results with dynamic key/value pairs
          if (typeof results === 'object' && results !== null) {
            const entries = Object.entries(results);
            if (entries.length > 0) {
              const [key, value] = entries[0];
              if (shouldExplain) {
                // Check if this is an average calculation
                if (key.toLowerCase().includes('avg') || key.toLowerCase().includes('average')) {
                  return `The average patient age is **${value}** years.\n\n**Methodology**: This was calculated by querying the patients table and computing the average of the age field across all ${prompt.includes('recordsProcessed') ? 'patient' : ''} records.`;
                }
                return `The analysis shows that ${key.replace(/_/g, ' ')} is **${value}**.\n\n**Methodology**: This result was obtained by analyzing the relevant data source and computing the requested metric.`;
              } else {
                // For non-methodology mode, just return the value
                if (key.toLowerCase().includes('avg') || key.toLowerCase().includes('average')) {
                  return `${value}`;
                }
                return `${key.replace(/_/g, ' ')}: ${value}`;
              }
            }
          }
        } catch {
          // If parsing fails, return generic response
        }
      }
    }

    // Check if context includes data sources to help guide the user
    if (prompt.includes('Data catalog context:')) {
      const dataSourceMatch = prompt.match(/## Data Sources\n((?:- .*\n)*)/);
      if (dataSourceMatch && dataSourceMatch[1]) {
        const sources = dataSourceMatch[1].trim().split('\n').slice(0, 5).join('\n');
        return `I can help you explore your data catalog. Available data sources include:\n\n${sources}\n\nPlease ask a specific question about any of these data sources.`;
      }
    }
    
    // Generic response
    return `I can help you explore your data catalog and analyze your data sources. Please ask a specific question about your data.`;
  }

  /**
   * Get available fields for error context
   */
  private static getAvailableFieldsForContext(context: QueryContext): string {
    const fieldsByTable: Record<string, string[]> = {};
    
    // Group fields by table
    for (const table of context.tables) {
      if (table.columns && table.columns.length > 0) {
        fieldsByTable[`${table.dataSourceName}.${table.tableName}`] = 
          table.columns.map(col => col.name);
      }
    }
    
    // Also include fields from the fields context
    for (const field of context.fields) {
      if (field.tableName && field.dataSourceName) {
        const key = `${field.dataSourceName}.${field.tableName}`;
        if (!fieldsByTable[key]) {
          fieldsByTable[key] = [];
        }
        if (!fieldsByTable[key].includes(field.fieldName)) {
          fieldsByTable[key].push(field.fieldName);
        }
      }
    }
    
    // Format the output
    const lines: string[] = [];
    for (const [table, fields] of Object.entries(fieldsByTable)) {
      if (fields.length > 0) {
        lines.push(`\n**${table}:**`);
        lines.push(fields.map(f => `  - ${f}`).join('\n'));
      }
    }
    
    if (lines.length === 0) {
      return 'No fields have been cataloged yet. Please ensure data sources have been properly imported and transformed.';
    }
    
    return lines.join('\n');
  }

  /**
   * Extract sources mentioned in the LLM response
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static extractSources(response: string, context: any): Array<{
    type: 'data_source' | 'table' | 'field' | 'pattern';
    name: string;
    id: string;
  }> {
    const sources: Array<{
      type: 'data_source' | 'table' | 'field' | 'pattern';
      name: string;
      id: string;
    }> = [];

    // Look for data source mentions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context.dataSources.forEach((ds: any) => {
      if (response.toLowerCase().includes(ds.name.toLowerCase())) {
        sources.push({
          type: 'data_source',
          name: ds.name,
          id: ds.id
        });
      }
    });

    // Look for table mentions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context.tables.forEach((table: any) => {
      if (response.toLowerCase().includes(table.tableName.toLowerCase())) {
        sources.push({
          type: 'table',
          name: `${table.dataSourceName}.${table.tableName}`,
          id: table.id
        });
      }
    });

    // Look for field mentions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context.fields.forEach((field: any) => {
      if (response.toLowerCase().includes(field.displayName.toLowerCase()) ||
          response.toLowerCase().includes(field.fieldName.toLowerCase())) {
        sources.push({
          type: 'field',
          name: field.displayName,
          id: field.id
        });
      }
    });

    // Remove duplicates
    const uniqueSources = sources.filter((source, index, self) =>
      index === self.findIndex((s) => s.id === source.id)
    );

    return uniqueSources;
  }

  /**
   * Build system prompt based on query type
   */
  private static buildSystemPrompt(needsAnalysis: boolean, explainMethodology: boolean): string {
    const basePrompt = needsAnalysis
      ? `You are a helpful data analysis assistant. You have access to metadata about data sources and can execute queries to calculate statistics and analyze data.`
      : `You are a helpful data catalog assistant. You have access to metadata about data sources, tables, fields, and patterns.`;
    
    const instructions = explainMethodology
      ? `When you see "Analysis Results:" followed by JSON data in the prompt, that contains the ACTUAL COMPUTED RESULTS from the database query. Use those results to answer the user's question, then explain how the calculation was performed. Do NOT say the results are missing - they are provided in the Analysis Results section. Be specific about the values and explain your methodology.`
      : `IMPORTANT: Answer with ONLY the results. NO explanations, NO methodology, NO SQL queries. Just present the data in a clean table format. If analysis results are provided, format them as a table showing ALL matching records with their details.`;
    
    return `${basePrompt} ${instructions}`;
  }

  /**
   * Build user prompt with appropriate data
   */
  private static buildUserPrompt(
    contextPrompt: string,
    query: string,
    analysisResult: AnalysisResult | null
  ): string {
    let prompt = contextPrompt + '\n\n';
    
    if (analysisResult) {
      if (analysisResult.success && analysisResult.data !== null && analysisResult.data !== undefined) {
        prompt += `IMPORTANT: The query has been executed and the results are below. Use these actual results to answer the question.\n\n`;
        prompt += `Analysis Results:\n${JSON.stringify(analysisResult.data, null, 2)}\n\n`;
        if (analysisResult.metadata) {
          prompt += `Metadata: Successfully processed ${analysisResult.metadata.recordsProcessed} records in ${analysisResult.metadata.executionTime}ms\n\n`;
        }
      } else if (analysisResult.error) {
        prompt += `Analysis Error: ${analysisResult.error}\n\n`;
      } else {
        prompt += `Analysis returned no data.\n\n`;
      }
    } else {
      logger.warn('No analysis result available for data query');
    }
    
    prompt += `Question: ${query}`;
    return prompt;
  }

  /**
   * Generate a data query from natural language using LLM
   */
  private static async generateDataQuery(
    query: string, 
    context: QueryContext,
    relationshipAnalysis?: { allowedPairs: Array<{ source1Id: string; source2Id: string; reason: string }> }
  ): Promise<DataQuery | null> {
    try {
      // Check if we have multiple data sources and relationship information
      const hasMultipleSources = context.dataSources.length > 1;
      const allowedSourcePairs = relationshipAnalysis?.allowedPairs || [];
      
      // Build the multi-source rules based on relationship analysis
      let multiSourceRules = '';
      if (hasMultipleSources) {
        if (allowedSourcePairs.length > 0) {
          const allowedSourceIds = new Set<string>();
          allowedSourcePairs.forEach(pair => {
            allowedSourceIds.add(pair.source1Id);
            allowedSourceIds.add(pair.source2Id);
          });
          
          multiSourceRules = `
MULTI-SOURCE QUERY RULES:
- You MAY query from multiple data sources IF they are related
- Related source pairs: ${allowedSourcePairs.map(p => `${p.source1Id} <-> ${p.source2Id}`).join(', ')}
- When querying multiple sources, ensure they are in the allowed pairs list
- Use appropriate join conditions based on common fields or business relationships`;
        } else {
          multiSourceRules = `
IMPORTANT: Only query from a SINGLE data source. The available data sources are not related enough for cross-source queries.`;
        }
      }
      
      const systemPrompt = `You are a data query generator. Based on the metadata context provided, generate either a structured query OR JavaScript code to answer the user's question.

DECISION CRITERIA:
- Use 'code' type for complex calculations, transformations, or when fields need processing (e.g., calculating age from date_of_birth)
- Use 'analysis' type for simple filtering, sorting, and direct aggregations on numeric fields

FOR CODE QUERIES:
- Generate clean, efficient JavaScript code
- Data sources are available as properties of the 'data' object
- IMPORTANT: Use the exact property names shown in the Sample Data section (e.g., data.patients_with_relationships)
- Property names have spaces/special chars replaced with underscores
- Set the 'result' variable with your final answer
- Available utilities:
  - utils.calculateAge(dateString) - converts date of birth to age in years
  - utils.groupBy(array, key) - groups array by field value
  - utils.average(numbers) - calculates average of number array
- Standard JavaScript available: Math, Date, Array, JSON, String methods
- Always handle null/undefined values in your calculations

Example code query for average age:
{
  "type": "code",
  "sources": ["patient-data-id"],
  "code": "const ages = data.patient_records.map(p => utils.calculateAge(p.date_of_birth)).filter(age => age !== null); result = { average_age: utils.average(ages), count: ages.length };"
}

FOR ANALYSIS QUERIES:
Follow the existing rules for structured queries:
1. ONLY use field names that actually exist in the table columns
2. Use the relationships section to understand foreign key connections
3. NEVER guess field names - if a field doesn't exist, don't use it
4. For single-table sources, omit the 'tables' field

${multiSourceRules}

Query Schemas:

CODE QUERY:
${JSON.stringify({
  type: 'code',
  sources: ['data source IDs'],
  code: 'JavaScript code that sets the result variable'
}, null, 2)}

ANALYSIS QUERY (for filtering, sorting, and DIRECT aggregations on numeric fields):
${JSON.stringify({
  type: 'analysis',
  sources: ['data source IDs'],
  tables: ['optional: table names'],
  operations: [{
    type: 'aggregate',
    aggregations: [{ // REQUIRED for aggregate operations
      field: 'numeric_field_name',
      operation: 'avg', // or 'sum', 'min', 'max', 'count'
      alias: 'result_name'
    }]
  }],
  output: { format: 'table', limit: 100 }
}, null, 2)}

IMPORTANT RULES:
1. If calculating from non-numeric fields (like date_of_birth to age), use 'code' type
2. For aggregate operations, MUST include 'aggregations' array (not 'measures' or other names)
3. Each aggregation MUST have: field, operation, and optionally alias

Respond ONLY with valid JSON. No explanations or additional text.`;

      // Create a compact context summary for query generation
      const contextSummary = {
        dataSources: context.dataSources.slice(0, 5).map((ds) => ({
          id: ds.id,
          name: ds.name,
          type: ds.type,
          recordCount: ds.recordCount
        })),
        tables: context.tables.map((t) => ({
          tableName: t.tableName,
          dataSourceName: t.dataSourceName,
          dataSourceId: t.dataSourceId,
          // CRITICAL: Include column information so LLM knows what fields exist
          columns: t.columns?.slice(0, 20).map(c => ({ name: c.name, type: c.type }))
        })),
        // Only include relationships if there are joins possible
        ...(context.relationships && context.relationships.length > 0 && {
          relationships: context.relationships.slice(0, 10).map(r => ({
            sourceTable: r.sourceTable,
            sourceField: r.sourceField,
            targetTable: r.targetTable,
            targetField: r.targetField
          }))
        }),
        // Include allowed cross-source relationships
        ...(relationshipAnalysis && relationshipAnalysis.allowedPairs.length > 0 && {
          allowedCrossSourceQueries: relationshipAnalysis.allowedPairs
        })
      };

      // Get sample data for context
      const sampleData = await this.getSampleData(context.dataSources.slice(0, 2));
      
      const userPrompt = `Metadata Context:
${JSON.stringify(contextSummary, null, 2)}

Sample Data (IMPORTANT: Use these exact property names in your code):
${JSON.stringify(sampleData, null, 2)}

User Question: ${query}

Generate a query to answer this question. For code queries, you MUST use the exact property names from the Sample Data section above (e.g., if the sample shows "patients_with_relationships", use data.patients_with_relationships, NOT data.patients).`;

      const response = await this.callLLM(systemPrompt, userPrompt);
      
      logger.info('LLM query generation response:', { 
        responseLength: response.length,
        responsePreview: response.substring(0, 200)
      });
      
      // Try to parse the response as JSON
      try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = response.match(/\{[\s\S]*\}/m);
        if (jsonMatch) {
          const dataQuery = JSON.parse(jsonMatch[0]) as DataQuery;
          logger.info('Parsed data query:', {
            type: dataQuery.type,
            sources: dataQuery.sources,
            hasOperations: !!dataQuery.operations,
            hasCode: !!dataQuery.code,
            codeLength: dataQuery.code?.length
          });
          
          // Fix common LLM mistakes in query structure
          if (dataQuery.operations) {
            dataQuery.operations = dataQuery.operations.map(op => {
              // Fix various naming mistakes for aggregations
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const opAny = op as any;
              if (op.type === 'aggregate' && !op.aggregations) {
                // Check for common alternative names
                const altNames = ['measures', 'aggregates', 'metrics', 'calculations'];
                for (const altName of altNames) {
                  if (opAny[altName]) {
                    logger.warn(`Fixing LLM query: converting ${altName} to aggregations`);
                    op.aggregations = opAny[altName];
                    delete opAny[altName];
                    break;
                  }
                }
              }
              return op;
            });
          }
          
          // Validate it has required fields
          if (dataQuery.sources && dataQuery.sources.length > 0) {
            if (dataQuery.type === 'analysis' && dataQuery.operations) {
              return dataQuery;
            } else if (dataQuery.type === 'code' && dataQuery.code) {
              return dataQuery;
            }
          }
        } else {
          logger.warn('No JSON found in LLM response');
        }
      } catch (parseError) {
        logger.error('Failed to parse data query:', parseError);
        logger.error('Response was:', response);
      }

      // If no API key, generate a mock query based on the context
      if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        return this.generateMockDataQuery(query, context);
      }

      return null;
    } catch (error) {
      logger.error('Failed to generate data query:', error);
      return null;
    }
  }

  /**
   * Generate a mock data query for development/testing
   */
  private static generateMockDataQuery(
    query: string,
    context: QueryContext
  ): DataQuery | null {
    // Return a basic query for the first available data source
    if (context.dataSources.length === 0) {
      return null;
    }
    
    // For mock queries, always return a simple filter query
    // The LLM should determine the appropriate query type based on context
    
    // Default to simple analysis query
    return {
      type: 'analysis',
      sources: [context.dataSources[0].id],
      operations: [{
        type: 'filter',
        conditions: [{
          field: 'id',
          operator: 'exists',
          value: true
        }]
      }],
      output: {
        format: 'table',
        limit: 100
      }
    };
  }

  /**
   * Get sample data from data sources for context
   */
  private static async getSampleData(dataSources: { id: string; name: string }[]): Promise<Record<string, Record<string, unknown>>> {
    const samples: Record<string, Record<string, unknown>> = {};
    
    for (const ds of dataSources) {
      try {
        const { DataSourceService } = await import('./dataSourceService');
        const dataSource = await DataSourceService.getDataSourceById(ds.id);
        
        if (dataSource?.transformedData) {
          const transformedData = JSON.parse(dataSource.transformedData);
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let sampleRecords: any[] = [];
          
          if (Array.isArray(transformedData)) {
            sampleRecords = transformedData.slice(0, 3);
          } else if (transformedData.records && Array.isArray(transformedData.records)) {
            // Extract 2-3 sample records from UnifiedDataCatalog structure
            sampleRecords = transformedData.records.slice(0, 3).map((record: { data?: Record<string, unknown> }) => {
              // Extract actual data from UnifiedDataRecord structure
              return record.data || record;
            });
          } else if (transformedData.data && Array.isArray(transformedData.data)) {
            sampleRecords = transformedData.data.slice(0, 3);
          }
          
          if (sampleRecords.length > 0) {
            
            // Use the same key transformation as CodeExecutionService
            const dataKey = ds.name.replace(/[^a-zA-Z0-9]/g, '_');
            samples[dataKey] = {
              originalName: ds.name,
              recordCount: transformedData.totalRecords || transformedData.records.length,
              fields: transformedData.schema?.fields?.map((f: { name: string }) => f.name) || 
                      Object.keys(sampleRecords[0] || {}),
              samples: sampleRecords
            };
          }
        }
      } catch {
        // Silently skip on error
      }
    }
    
    return samples;
  }

}