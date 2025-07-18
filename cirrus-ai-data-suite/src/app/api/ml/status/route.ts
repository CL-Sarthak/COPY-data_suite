import { NextResponse } from 'next/server';
import { getMLPatternService } from '@/services/mlPatternService';

export async function GET() {
  try {
    console.log('[ML Status API] Environment check:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- VERCEL:', process.env.VERCEL);
    console.log('- ML_DETECTION_ENABLED:', process.env.ML_DETECTION_ENABLED);
    console.log('- ML_PROVIDER:', process.env.ML_PROVIDER);
    console.log('- GOOGLE_CLOUD_API_KEY exists:', !!process.env.GOOGLE_CLOUD_API_KEY);
    console.log('- ML_API_KEY exists:', !!process.env.ML_API_KEY);
    
    // Get a fresh instance to ensure we have current env vars
    const mlService = getMLPatternService();
    const status = mlService.getConfigStatus();
    console.log('[ML Status API] Service status:', status);
    
    // Don't expose actual API keys in the response
    const safeStatus = {
      ...status,
      envVars: {
        ML_DETECTION_ENABLED: process.env.ML_DETECTION_ENABLED,
        ML_PROVIDER: process.env.ML_PROVIDER,
        hasGoogleKey: !!process.env.GOOGLE_CLOUD_API_KEY,
        hasAWSKey: !!process.env.AWS_ACCESS_KEY_ID,
        hasAzureKey: !!process.env.AZURE_API_KEY,
        hasGenericKey: !!process.env.ML_API_KEY,
        hasEndpoint: !!process.env.ML_ENDPOINT
      }
    };
    
    return NextResponse.json(safeStatus);
  } catch (error) {
    console.error('Error getting ML status:', error);
    return NextResponse.json(
      { error: 'Failed to get ML status' },
      { status: 500 }
    );
  }
}