import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { llmService } from '@/services/llmService';
import { logger } from '@/utils/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { question, explainMethodology = false, requestedFields, recordLimit = 100, conversationHistory = [] } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    const database = await getDatabase();
    const repository = database.getRepository(DataSourceEntity);
    
    const dataSource = await repository.findOne({
      where: { id }
    });

    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    // Get sample data for context
    let sampleData = '';
    let recordCount = dataSource.recordCount || 0;
    let dataStructure = '';
    let actualRecordCount = 0;
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let allRecords: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let transformedSchema: any = null;
      
      if (dataSource.transformedData) {
        const transformed = JSON.parse(dataSource.transformedData);
        allRecords = transformed.data || transformed.records || [];
        transformedSchema = transformed.schema;
      } else if (dataSource.type === 'database' && dataSource.configuration) {
        // For database sources that haven't been transformed, check configuration
        let config = dataSource.configuration;
        if (typeof config === 'string') {
          config = JSON.parse(config);
        }
        if (config && typeof config === 'object' && 'data' in config) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          allRecords = (config as any).data;
        }
      }
      
      if (allRecords.length > 0) {
        const records = allRecords.slice(0, recordLimit);
        actualRecordCount = records.length;
        
        // If we're fetching a large dataset for specific fields, handle appropriately
        if (requestedFields && requestedFields.length > 0 && recordLimit > 500) {
          // Calculate statistics for the requested fields
          const stats: Record<string, unknown> = {};
          
          requestedFields.forEach((field: string) => {
            const values = allRecords
              .slice(0, recordLimit)
              .map((r: Record<string, unknown>) => r[field])
              .filter((v: unknown) => v !== null && v !== undefined);
            
            // Calculate statistics based on field type
            if (values.length > 0) {
              const firstValue = values[0];
              
              if (typeof firstValue === 'number') {
                // Numeric statistics
                const numbers = values.filter((v): v is number => typeof v === 'number');
                const sum = numbers.reduce((a: number, b: number) => a + b, 0);
                stats[field] = {
                  count: numbers.length,
                  sum: sum,
                  average: sum / numbers.length,
                  min: Math.min(...numbers),
                  max: Math.max(...numbers),
                  nullCount: allRecords.slice(0, recordLimit).length - numbers.length
                };
              } else if (typeof firstValue === 'string' && !isNaN(Date.parse(firstValue))) {
                // Date statistics
                const dates = values
                  .filter((v): v is string => typeof v === 'string')
                  .map((v: string) => new Date(v).getTime());
                stats[field] = {
                  count: dates.length,
                  earliest: new Date(Math.min(...dates)).toISOString(),
                  latest: new Date(Math.max(...dates)).toISOString(),
                  nullCount: allRecords.slice(0, recordLimit).length - dates.length
                };
              } else {
                // String/categorical statistics
                const valueCounts: Record<string, number> = {};
                values.forEach((v: unknown) => {
                  const key = String(v);
                  valueCounts[key] = (valueCounts[key] || 0) + 1;
                });
                
                // Check if data size is manageable
                const uniqueCount = Object.keys(valueCounts).length;
                const estimatedSize = JSON.stringify(valueCounts).length;
                
                if (estimatedSize > 50000) { // ~50KB limit for categorical data
                  stats[field] = {
                    error: "TOO_MUCH_DATA",
                    message: `Too many unique values (${uniqueCount}) to process. Consider filtering or aggregating the data.`,
                    uniqueValues: uniqueCount,
                    sampleValues: Object.entries(valueCounts)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 20)
                      .map(([value, count]) => ({ value, count })),
                    totalCount: values.length
                  };
                } else {
                  // For manageable data, include full distribution
                  stats[field] = {
                    count: values.length,
                    uniqueValues: uniqueCount,
                    distribution: Object.entries(valueCounts)
                      .sort(([,a], [,b]) => b - a)
                      .map(([value, count]) => ({ 
                        value, 
                        count,
                        percentage: ((count / values.length) * 100).toFixed(2) + '%'
                      })),
                    nullCount: allRecords.slice(0, recordLimit).length - values.length
                  };
                }
              }
            }
          });
          
          sampleData = `Statistics calculated from ${actualRecordCount} records:\n${JSON.stringify(stats, null, 2)}`;
        } else if (requestedFields && Array.isArray(requestedFields) && requestedFields.length > 0) {
          // For smaller datasets, extract only requested fields
          const filteredRecords = records.map((record: Record<string, unknown>) => {
            const filtered: Record<string, unknown> = {};
            requestedFields.forEach((field: string) => {
              if (record[field] !== undefined) {
                filtered[field] = record[field];
              }
            });
            return filtered;
          });
          sampleData = JSON.stringify(filteredRecords, null, 2);
        } else {
          sampleData = JSON.stringify(records, null, 2);
        }
        
        // Extract schema information
        if (transformedSchema && transformedSchema.fields) {
          const fields = transformedSchema.fields.map((f: { name: string; type: string }) => 
            `${f.name} (${f.type})`
          ).join(', ');
          dataStructure = `Fields: ${fields}`;
        }
        
        // Extract schema information
        if (dataSource.transformedData) {
          const transformed = JSON.parse(dataSource.transformedData);
          if (transformed.schema && transformed.schema.fields) {
            const fields = transformed.schema.fields.map((f: { name: string; type: string }) => 
              `${f.name} (${f.type})`
            ).join(', ');
            dataStructure = `Fields: ${fields}`;
          }
          recordCount = transformed.totalRecords || recordCount;
        } else if (allRecords.length > 0 && allRecords[0]) {
          // For non-transformed data, extract field names from first record
          const fields = Object.keys(allRecords[0]).join(', ');
          dataStructure = `Fields: ${fields}`;
          recordCount = allRecords.length;
        }
      }
      
      // Note: metadata field exists but not currently used in prompts
      // Could be used for additional context in future
    } catch (e) {
      logger.error('Error parsing data source data:', e);
    }

    // Include any existing summaries for better context
    const existingSummary = dataSource.userSummary || dataSource.aiSummary || '';

    const methodologyInstructions = explainMethodology 
      ? `When answering, please explain your methodology:
- Describe what data you analyzed
- Explain any calculations or analysis steps
- Detail any assumptions made
- Note if you're working with a sample vs full data

Answer format: First provide the answer, then explain the methodology used.`
      : `Provide a direct, concise answer based on the available data. Do NOT hedge or caveat about sample sizes. Simply answer the question.`;

    // Build conversation context
    const conversationContext = conversationHistory.length > 0 
      ? `Previous conversation:
${conversationHistory.map((msg: {role: string, content: string}) => 
  `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
).join('\n\n')}

Current question: ${question}`
      : `User Question: ${question}`;

    const prompt = `You are an AI assistant helping analyze data from a data source. Answer the user's question based on the provided data and conversation context.

Data Source Information:
- Name: ${dataSource.name}
- Type: ${dataSource.type}
- Total Records: ${recordCount}
- ${dataStructure}

Summary: ${existingSummary}

${requestedFields && requestedFields.length > 0 && recordLimit > 1000 ? 'Statistical Analysis' : 'Sample Data'} (${actualRecordCount} records${recordCount > actualRecordCount ? ` of ${recordCount} total` : ''}):
${sampleData || 'No sample data available'}

${conversationContext}

${methodologyInstructions}

${actualRecordCount < recordCount && (question.toLowerCase().includes('how many different') || question.toLowerCase().includes('how many unique') || question.toLowerCase().includes('number of unique') || question.toLowerCase().includes('count unique')) ? `
MANDATORY: This question is asking about counting unique values and you only have a sample. You MUST:
1. Answer based on the sample
2. End your response with:

NEEDS_MORE_DATA: {"fields": ["${question.match(/(?:different|unique)\s+(\w+[\s\w]*?)(?:\s+are|\s+in|\?|$)/i)?.[1] || 'relevant_field'}"], "recordLimit": ${recordCount}, "reason": "To count all unique values in the full dataset of ${recordCount} records"}
` : ''}

IMPORTANT: When answering statistical questions, follow these rules:

1. If you receive "Statistical Analysis" data:
   - For numeric fields: use the pre-calculated average, sum, count, min, max
   - For categorical fields: use the distribution data to show value counts and percentages
   - If you see "error": "TOO_MUCH_DATA", inform the user that there are too many unique values to process

2. For categorical/text field distributions:
   - If full distribution is provided, analyze and present it clearly
   - If only sampleValues are shown due to size limits, mention this limitation

3. If you have only a SAMPLE (${actualRecordCount} < ${recordCount}), and need more data:
   - First provide an answer based on the sample
   - Then request more data:
   
NEEDS_MORE_DATA: {"fields": ["fieldName"], "recordLimit": ${recordCount}, "reason": "To get complete distribution of states across all ${recordCount} records"}

Examples when to ALWAYS request more data:
- "What's the average age?" → Request age field for accurate average
- "What's the distribution of states?" → Request state field for complete distribution
- "How many patients are over 65?" → Request age field to count accurately
- "How many unique [anything]?" → Request that field to count all unique values
- "How many different [anything]?" → Request that field for complete count

CRITICAL: For questions about counting unique/different values, you MUST request the full data because the sample may not contain all unique values.

Do NOT request more data when:
- You already have statistics calculated for the exact question
- The data indicates TOO_MUCH_DATA error and you've shown the limitation`;

    try {
      const response = await llmService.analyze({
        prompt,
        maxTokens: 800,
        temperature: 0.3
      });

      // Check if the response indicates a need for more data
      const needsMoreData = response.content.includes('NEEDS_MORE_DATA:');
      let dataRequest = null;
      
      if (needsMoreData) {
        // Extract data request details
        const match = response.content.match(/NEEDS_MORE_DATA:\s*({[\s\S]*?})/);
        if (match) {
          try {
            dataRequest = JSON.parse(match[1]);
            // Remove the NEEDS_MORE_DATA marker from the answer
            response.content = response.content.replace(/NEEDS_MORE_DATA:\s*{[\s\S]*?}/, '').trim();
          } catch (e) {
            logger.error('Failed to parse data request:', e);
          }
        }
      }

      return NextResponse.json({
        answer: response.content,
        metadata: {
          recordsAnalyzed: actualRecordCount,
          totalRecords: recordCount,
          dataSource: dataSource.name,
          currentFields: requestedFields || 'all'
        },
        dataRequest
      });
    } catch (error) {
      logger.error('Error generating AI answer:', error);
      return NextResponse.json(
        { error: 'Failed to generate answer' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error processing question:', error);
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    );
  }
}