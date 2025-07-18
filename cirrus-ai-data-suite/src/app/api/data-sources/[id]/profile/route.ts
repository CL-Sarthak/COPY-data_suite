import { NextRequest, NextResponse } from 'next/server';
import { dataProfilingService } from '@/services/dataProfilingService';
import { DataSourceService } from '@/services/dataSourceService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/data-sources/[id]/profile
 * Generate or retrieve data profile for a data source
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Data source ID is required' },
        { status: 400 }
      );
    }

    // Get the data source
    const dataSource = await DataSourceService.getDataSourceById(id);
    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    // Check if data source has transformed data
    if (!dataSource.hasTransformedData) {
      return NextResponse.json(
        { error: 'Data source must be transformed before profiling. Please transform the data source first.' },
        { status: 400 }
      );
    }

    // Get the transformed data catalog
    const transformResponse = await fetch(
      `${request.nextUrl.protocol}//${request.nextUrl.host}/api/data-sources/${id}/transform`,
      { 
        method: 'GET',
        headers: request.headers 
      }
    );

    if (!transformResponse.ok) {
      throw new Error('Failed to get transformed data catalog');
    }

    const catalog = await transformResponse.json();

    // Generate data profile
    const profile = await dataProfilingService.profileDataCatalog(catalog);

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error generating data profile:', error);
    return NextResponse.json(
      { error: 'Failed to generate data profile' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data-sources/[id]/profile
 * Force regenerate data profile for a data source
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Data source ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { forceRegenerate = false } = body;
    
    // Note: forceRegenerate could be used to implement cache invalidation
    console.log('Force regenerate requested:', forceRegenerate);

    // Get the data source
    const dataSource = await DataSourceService.getDataSourceById(id);
    if (!dataSource) {
      return NextResponse.json(
        { error: 'Data source not found' },
        { status: 404 }
      );
    }

    // Check if data source has transformed data
    if (!dataSource.hasTransformedData) {
      return NextResponse.json(
        { error: 'Data source must be transformed before profiling. Please transform the data source first.' },
        { status: 400 }
      );
    }

    // Get the transformed data catalog
    const transformResponse = await fetch(
      `${request.nextUrl.protocol}//${request.nextUrl.host}/api/data-sources/${id}/transform`,
      { 
        method: 'GET',
        headers: request.headers 
      }
    );

    if (!transformResponse.ok) {
      throw new Error('Failed to get transformed data catalog');
    }

    const catalog = await transformResponse.json();

    // Generate fresh data profile
    const profile = await dataProfilingService.profileDataCatalog(catalog);

    return NextResponse.json({
      message: 'Data profile generated successfully',
      profile
    });
  } catch (error) {
    console.error('Error regenerating data profile:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate data profile' },
      { status: 500 }
    );
  }
}