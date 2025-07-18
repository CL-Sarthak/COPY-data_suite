import { NextRequest, NextResponse } from 'next/server';
import { SyntheticDataService } from '@/services/syntheticDataService';

// DELETE /api/synthetic/jobs/[id] - Delete specific job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await SyntheticDataService.deleteJob(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting synthetic data job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete job' },
      { status: 500 }
    );
  }
}