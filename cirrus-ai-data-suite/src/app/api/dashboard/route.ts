import { NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboardService';

export async function GET() {
  try {
    console.log('Dashboard API: Starting to fetch metrics...');
    const metrics = await DashboardService.getDashboardMetrics();
    console.log('Dashboard API: Successfully fetched metrics');
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Dashboard API: Error fetching dashboard metrics:', error);
    
    // Return more detailed error information in development
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMessage = isDevelopment 
      ? (error instanceof Error ? error.message : 'Unknown error')
      : 'Failed to fetch dashboard metrics';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        ...(isDevelopment && { stack: error instanceof Error ? error.stack : undefined })
      },
      { status: 500 }
    );
  }
}