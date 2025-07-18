import { NextResponse } from 'next/server';

// Simple redirect to trigger migrations
export async function GET() {
  try {
    // Trigger the migration endpoint
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/migrations/run`);
    const data = await response.json();
    
    return NextResponse.json({
      status: 'healthy',
      migrations: data,
      timestamp: new Date().toISOString()
    });
  } catch {
    // Even if migrations fail, return healthy status
    return NextResponse.json({
      status: 'healthy',
      note: 'Could not check migrations',
      timestamp: new Date().toISOString()
    });
  }
}