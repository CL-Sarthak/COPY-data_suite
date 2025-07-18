import { NextRequest, NextResponse } from 'next/server';
import { SyntheticDataService } from '@/services/syntheticDataService';

// GET /api/synthetic/[id] - Get specific synthetic dataset
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dataset = await SyntheticDataService.getDataset(id);
    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(dataset);
  } catch (error) {
    console.error('Error fetching synthetic dataset:', error);
    return NextResponse.json(
      { error: 'Failed to fetch synthetic dataset' },
      { status: 500 }
    );
  }
}

// PUT /api/synthetic/[id] - Update synthetic dataset
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const dataset = await SyntheticDataService.updateDataset(id, body);
    return NextResponse.json(dataset);
  } catch (error) {
    console.error('Error updating synthetic dataset:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update synthetic dataset' },
      { status: 500 }
    );
  }
}

// DELETE /api/synthetic/[id] - Delete specific synthetic dataset
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await SyntheticDataService.deleteDataset(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting synthetic dataset:', error);
    return NextResponse.json(
      { error: 'Failed to delete synthetic dataset' },
      { status: 500 }
    );
  }
}