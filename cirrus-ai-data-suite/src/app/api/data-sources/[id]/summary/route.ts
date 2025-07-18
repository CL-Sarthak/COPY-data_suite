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

// GET /api/data-sources/[id]/summary - Get data source summary
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
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

    return NextResponse.json({
      aiSummary: dataSource.aiSummary,
      userSummary: dataSource.userSummary,
      summaryGeneratedAt: dataSource.summaryGeneratedAt,
      summaryUpdatedAt: dataSource.summaryUpdatedAt,
      summaryVersion: dataSource.summaryVersion
    });
  } catch (error) {
    logger.error('Error fetching data source summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data source summary' },
      { status: 500 }
    );
  }
}

// POST /api/data-sources/[id]/summary - Generate or update summary
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, userSummary } = body;

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

    if (action === 'generate') {
      // Generate AI summary
      try {
        // llmService is already imported as singleton
        
        // Get sample data for context
        let sampleData = '';
        let metadata = {};
        
        try {
          if (dataSource.transformedData) {
            const transformed = JSON.parse(dataSource.transformedData);
            // Check for data in different possible locations
            const records = transformed.data?.slice(0, 5) || 
                          transformed.records?.slice(0, 5) || 
                          [];
            sampleData = JSON.stringify(records, null, 2);
          }
          
          if (dataSource.metadata) {
            metadata = JSON.parse(dataSource.metadata);
          }
        } catch (e) {
          logger.error('Error parsing data source data:', e);
        }

        const prompt = `Analyze this data source and provide a concise summary (2-3 sentences) describing:
- What type of data it contains
- The primary purpose or use case
- Key fields or attributes
- Any notable patterns or characteristics

Data Source Information:
- Name: ${dataSource.name}
- Type: ${dataSource.type}
- Record Count: ${dataSource.recordCount || 'Unknown'}
- Tags: ${dataSource.tags || 'None'}
- Metadata: ${JSON.stringify(metadata, null, 2)}

Sample Data (first 5 records):
${sampleData || 'No sample data available'}

Provide a clear, business-friendly summary that helps users understand what this data represents.`;

        const response = await llmService.analyze({
          prompt,
          maxTokens: 200,
          temperature: 0.3
        });
        
        const summary = response.content;

        // Update the data source with AI summary
        dataSource.aiSummary = summary;
        dataSource.summaryGeneratedAt = new Date();
        dataSource.summaryVersion = (dataSource.summaryVersion || 0) + 1;
        
        await repository.save(dataSource);

        return NextResponse.json({
          aiSummary: summary,
          summaryGeneratedAt: dataSource.summaryGeneratedAt,
          summaryVersion: dataSource.summaryVersion
        });
      } catch (error) {
        logger.error('Error generating AI summary:', error);
        return NextResponse.json(
          { error: 'Failed to generate AI summary' },
          { status: 500 }
        );
      }
    } else if (action === 'update') {
      // Update user summary
      if (!userSummary) {
        return NextResponse.json(
          { error: 'User summary is required' },
          { status: 400 }
        );
      }

      dataSource.userSummary = userSummary;
      dataSource.summaryUpdatedAt = new Date();
      dataSource.summaryVersion = (dataSource.summaryVersion || 0) + 1;
      
      await repository.save(dataSource);

      return NextResponse.json({
        userSummary: dataSource.userSummary,
        summaryUpdatedAt: dataSource.summaryUpdatedAt,
        summaryVersion: dataSource.summaryVersion
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "generate" or "update".' },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Error processing summary request:', error);
    return NextResponse.json(
      { error: 'Failed to process summary request' },
      { status: 500 }
    );
  }
}

// DELETE /api/data-sources/[id]/summary - Clear summaries
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
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

    // Clear summaries
    dataSource.aiSummary = undefined;
    dataSource.userSummary = undefined;
    dataSource.summaryGeneratedAt = undefined;
    dataSource.summaryUpdatedAt = undefined;
    dataSource.summaryVersion = 1;
    
    await repository.save(dataSource);

    return NextResponse.json({
      message: 'Summaries cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing summaries:', error);
    return NextResponse.json(
      { error: 'Failed to clear summaries' },
      { status: 500 }
    );
  }
}