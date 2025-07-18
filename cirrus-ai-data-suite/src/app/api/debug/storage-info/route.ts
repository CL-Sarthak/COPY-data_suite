import { NextResponse } from 'next/server';
import { StorageService } from '@/services/storage/storageService';

export async function GET() {
  try {
    // Get storage service instance
    let storageService: StorageService | null = null;
    let storageError: string | null = null;
    
    try {
      storageService = StorageService.getInstance();
    } catch (error) {
      storageError = error instanceof Error ? error.message : 'Unknown storage initialization error';
    }

    // Check environment variables (existence only, not values)
    const envVars = {
      VERCEL: !!process.env.VERCEL,
      BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
      S3_ACCESS_KEY_ID: !!process.env.S3_ACCESS_KEY_ID,
      S3_SECRET_ACCESS_KEY: !!process.env.S3_SECRET_ACCESS_KEY,
      S3_REGION: !!process.env.S3_REGION,
      S3_BUCKET: !!process.env.S3_BUCKET,
      STORAGE_PATH: !!process.env.STORAGE_PATH,
      NODE_ENV: process.env.NODE_ENV,
    };

    // Get provider info
    let providerInfo = {
      name: 'unknown',
      configured: false,
      error: storageError,
    };

    if (storageService && !storageError) {
      providerInfo = {
        name: storageService.getProviderName(),
        configured: true,
        error: null,
      };
    }

    // Test storage operations
    const storageTest = {
      canUpload: false,
      canRead: false,
      canList: false,
      error: null as string | null,
    };

    if (storageService && !storageError) {
      try {
        // Test upload
        const testKey = `debug/test-${Date.now()}.txt`;
        const testContent = 'Debug test file';
        
        await storageService.uploadFile(testKey, testContent, {
          contentType: 'text/plain',
        });
        storageTest.canUpload = true;

        // Test read
        const readContent = await storageService.getFileAsString(testKey);
        storageTest.canRead = readContent === testContent;

        // Test list
        const files = await storageService.listFiles('debug/');
        storageTest.canList = files.length > 0;

        // Clean up
        await storageService.deleteFile(testKey);
      } catch (error) {
        storageTest.error = error instanceof Error ? error.message : 'Unknown test error';
      }
    }

    // Get expected provider based on environment
    let expectedProvider = 'local';
    if (envVars.VERCEL && envVars.BLOB_READ_WRITE_TOKEN) {
      expectedProvider = 'vercel';
    } else if (envVars.S3_ACCESS_KEY_ID && envVars.S3_SECRET_ACCESS_KEY) {
      expectedProvider = 's3';
    } else if (envVars.VERCEL) {
      expectedProvider = 'vercel-temp';
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: envVars.NODE_ENV,
        isVercel: envVars.VERCEL,
        variables: envVars,
      },
      storage: {
        provider: providerInfo,
        expected: expectedProvider,
        test: storageTest,
      },
      recommendations: getRecommendations(envVars, providerInfo, storageTest),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get storage info',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function getRecommendations(
  envVars: Record<string, boolean | string | undefined>,
  providerInfo: { name: string; configured: boolean; error: string | null },
  storageTest: { canUpload: boolean; canRead: boolean; canList: boolean; error: string | null }
): string[] {
  const recommendations: string[] = [];

  // Check if running on Vercel without blob storage
  if (envVars.VERCEL && !envVars.BLOB_READ_WRITE_TOKEN) {
    recommendations.push(
      'Running on Vercel without Blob storage configured. Add BLOB_READ_WRITE_TOKEN to use Vercel Blob storage.'
    );
  }

  // Check if provider doesn't match expected
  if (envVars.VERCEL && envVars.BLOB_READ_WRITE_TOKEN && providerInfo.name !== 'vercel-blob') {
    recommendations.push(
      'Vercel Blob storage is configured but not being used. Check initialization errors.'
    );
  }

  // Check if storage tests failed
  if (providerInfo.configured && storageTest.error) {
    recommendations.push(
      `Storage provider is configured but operations are failing: ${storageTest.error}`
    );
  }

  // Check if using temp storage in production
  if (envVars.NODE_ENV === 'production' && providerInfo.name === 'vercel-temp') {
    recommendations.push(
      'Using temporary storage in production. This may cause data loss. Configure Vercel Blob or S3 storage.'
    );
  }

  return recommendations;
}