import { NextRequest, NextResponse } from 'next/server';
import { SyntheticDataService } from '@/services/syntheticDataService';

// GET /api/synthetic/[id]/preview - Generate a small preview of synthetic data (max 10 records)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const maxRecords = Math.min(parseInt(searchParams.get('count') || '5'), 10);

    const preview = await SyntheticDataService.generatePreviewData(id, maxRecords);
    return NextResponse.json(preview);
  } catch (error) {
    console.error('Error generating preview data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate preview data' },
      { status: 500 }
    );
  }
}