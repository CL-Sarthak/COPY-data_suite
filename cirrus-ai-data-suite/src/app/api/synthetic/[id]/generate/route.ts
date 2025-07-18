import { NextRequest, NextResponse } from 'next/server';
import { SyntheticDataService } from '@/services/syntheticDataService';

// POST /api/synthetic/[id]/generate - Generate data for specific dataset
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await SyntheticDataService.generateData(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating synthetic data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate synthetic data' },
      { status: 500 }
    );
  }
}