import { NextResponse } from 'next/server';
import { SyntheticDataService } from '@/services/syntheticDataService';

// GET /api/synthetic/jobs - Get all synthetic data jobs
export async function GET() {
  try {
    const jobs = await SyntheticDataService.getAllJobs();
    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error fetching synthetic data jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch synthetic data jobs' },
      { status: 500 }
    );
  }
}