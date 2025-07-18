import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

// Simple cron endpoint to trigger API refreshes
// This should be called periodically (e.g., every 5 minutes) by an external cron service
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if provided
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    logger.info('Cron job: Checking API connections for refresh');
    
    // Call the refresh endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const refreshUrl = `${baseUrl}/api/api-connections/refresh`;
    
    const response = await fetch(refreshUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Refresh endpoint returned ${response.status}`);
    }
    
    const result = await response.json();
    
    logger.info('Cron job completed:', {
      refreshed: result.refreshed,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      refreshed: result.refreshed,
      results: result.results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Cron job failed:', error);
    return NextResponse.json(
      { 
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}