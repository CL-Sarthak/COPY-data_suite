import { NextRequest, NextResponse } from 'next/server';
import { SyntheticDataService } from '@/services/syntheticDataService';

// GET /api/synthetic - Get all synthetic datasets
export async function GET() {
  try {
    console.log('Fetching synthetic datasets...');
    const datasets = await SyntheticDataService.getAllDatasets();
    console.log('Successfully fetched datasets:', datasets.length);
    return NextResponse.json(datasets);
  } catch (error) {
    console.error('Error fetching synthetic datasets:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch synthetic datasets' },
      { status: 500 }
    );
  }
}

// POST /api/synthetic - Create new synthetic dataset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Creating synthetic dataset with body:', body);
    const dataset = await SyntheticDataService.createSyntheticDataset(body);
    console.log('Successfully created dataset:', dataset.id);
    return NextResponse.json(dataset, { status: 201 });
  } catch (error) {
    console.error('Error creating synthetic dataset:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // Check if this is a serverless persistence issue
    const errorMessage = error instanceof Error ? error.message : 'Failed to create synthetic dataset';
    const isServerlessIssue = errorMessage.includes('table') || errorMessage.includes('database') || 
                             errorMessage.includes('SQLITE_') || errorMessage.includes('schema');
    
    if (isServerlessIssue && (process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME)) {
      return NextResponse.json(
        { 
          error: 'Dataset creation failed in serverless environment. In-memory database does not persist between requests. Please configure a persistent database connection for production use.',
          serverless: true
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}