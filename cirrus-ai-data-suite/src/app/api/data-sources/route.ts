// CRITICAL: Import TypeORM initialization first
import '@/lib/init-typeorm';
import { NextRequest, NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';
import { successResponse, errorResponse } from '@/utils/api-response';

// Configure route segment to handle large payloads
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout
export const dynamic = 'force-dynamic';

// For handling large file uploads
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET() {
  try {
    console.log('Data Sources API: Fetching all data sources...');
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      timestamp: new Date().toISOString()
    });
    
    const dataSources = await DataSourceService.getAllDataSources();
    console.log('Data Sources API: Successfully fetched', dataSources.length, 'data sources');
    
    // Log sample data for debugging
    if (dataSources.length > 0) {
      console.log('Sample data source:', {
        id: dataSources[0].id,
        name: dataSources[0].name,
        type: dataSources[0].type,
        connectionStatus: dataSources[0].connectionStatus
      });
    }
    
    return successResponse(dataSources);
  } catch (error) {
    console.error('Data Sources API: Error fetching data sources:', error);
    
    return errorResponse(error, 'Failed to fetch data sources', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Data Sources API POST Request Start ===');
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_URL: process.env.VERCEL_URL,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      RUNTIME: 'serverless'
    });
    
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Check content length
    const contentLength = request.headers.get('content-length');
    console.log('Content length:', contentLength);
    
    // Higher payload limits when using external database, even on Vercel
    const isVercel = process.env.VERCEL || process.env.VERCEL_URL;
    const hasExternalDB = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
    const maxPayloadSize = (isVercel && !hasExternalDB) ? 4 * 1024 * 1024 : 50 * 1024 * 1024; // 4MB for Vercel in-memory, 50MB with external DB
    const maxSizeLabel = (isVercel && !hasExternalDB) ? '4MB' : '50MB';
    
    if (contentLength && parseInt(contentLength) > maxPayloadSize) {
      console.error('Payload too large:', contentLength, 'bytes', 'Environment:', isVercel ? 'Vercel' : 'Other');
      return NextResponse.json(
        { 
          error: `Payload too large for ${isVercel ? 'Vercel deployment' : 'server'}. File content should not exceed ${maxSizeLabel}. Consider reducing file sizes or using smaller content previews.`,
          size: contentLength,
          maxSize: maxPayloadSize,
          environment: isVercel ? 'vercel' : 'standard'
        },
        { status: 413 }
      );
    }
    
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('Failed to parse JSON:', jsonError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }
    
    console.log('Data Sources API: Request body keys:', Object.keys(body));
    console.log('Data Sources API: Body size approximately:', JSON.stringify(body).length, 'characters');
    
    // Log only essential parts to avoid huge logs
    const bodyForLog = {
      ...body,
      configuration: body.configuration ? {
        ...body.configuration,
        files: body.configuration.files ? 
          `[${body.configuration.files.length} files, total size: ${body.configuration.files.reduce((sum: number, f: { size: number }) => sum + (f.size || 0), 0)} bytes]` :
          body.configuration.files
      } : body.configuration
    };
    console.log('Data Sources API: Request body (summarized):', JSON.stringify(bodyForLog, null, 2));
    
    console.log('=== Calling DataSourceService.createDataSource ===');
    const dataSource = await DataSourceService.createDataSource(body);
    console.log('=== Data Sources API: Successfully created data source ===', {
      id: dataSource.id,
      name: dataSource.name,
      type: dataSource.type
    });
    return NextResponse.json(dataSource);
  } catch (error) {
    console.error('=== Data Sources API: CRITICAL ERROR ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    console.error('Error object:', error);
    console.error('=== END ERROR DETAILS ===');
    
    // Always return detailed errors for debugging Vercel issues
    const isVercel = process.env.VERCEL || process.env.VERCEL_URL;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create data source',
        errorType: error?.constructor?.name,
        environment: {
          isVercel: !!isVercel,
          isDevelopment,
          hasDatabase: !!process.env.DATABASE_URL
        },
        ...(isDevelopment && { stack: error instanceof Error ? error.stack : undefined }),
        // Include stack trace in Vercel for debugging
        ...(isVercel && { vercelStack: error instanceof Error ? error.stack : undefined })
      }, 
      { status: 500 }
    );
  }
}