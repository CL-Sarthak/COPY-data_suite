import { NextResponse } from 'next/server';
import { getBuildInfo } from '@/utils/getBuildInfo';

export async function GET() {
  try {
    const buildInfo = getBuildInfo();
    return NextResponse.json(buildInfo);
  } catch (error) {
    console.error('Error getting build info:', error);
    return NextResponse.json({
      environment: process.env.NODE_ENV || 'development',
      branch: 'unknown',
      buildDate: new Date().toISOString()
    });
  }
}