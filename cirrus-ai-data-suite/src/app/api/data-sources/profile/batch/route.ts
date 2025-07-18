import { NextRequest, NextResponse } from 'next/server';
import { dataProfilingService } from '@/services/dataProfilingService';
import { DataSourceService } from '@/services/dataSourceService';

/**
 * POST /api/data-sources/profile/batch
 * Generate data profiles for multiple data sources
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceIds, includeDetails = true } = body;

    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      return NextResponse.json(
        { error: 'Array of data source IDs is required' },
        { status: 400 }
      );
    }

    if (sourceIds.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 data sources can be profiled at once' },
        { status: 400 }
      );
    }

    const results: Array<{
      sourceId: string;
      status: 'success' | 'error' | 'skipped';
      profile?: unknown;
      error?: string;
      reason?: string;
    }> = [];

    // Process each data source
    for (const sourceId of sourceIds) {
      try {
        // Get the data source
        const dataSource = await DataSourceService.getDataSourceById(sourceId);
        if (!dataSource) {
          results.push({
            sourceId,
            status: 'error',
            error: 'Data source not found'
          });
          continue;
        }

        // Check if data source has transformed data
        if (!dataSource.hasTransformedData) {
          results.push({
            sourceId,
            status: 'skipped',
            reason: 'Data source not transformed'
          });
          continue;
        }

        // Get the transformed data catalog
        const transformResponse = await fetch(
          `${request.nextUrl.protocol}//${request.nextUrl.host}/api/data-sources/${sourceId}/transform`,
          { 
            method: 'GET',
            headers: request.headers 
          }
        );

        if (!transformResponse.ok) {
          results.push({
            sourceId,
            status: 'error',
            error: 'Failed to get transformed data'
          });
          continue;
        }

        const catalog = await transformResponse.json();

        // Generate data profile
        const profile = await dataProfilingService.profileDataCatalog(catalog);

        results.push({
          sourceId,
          status: 'success',
          profile: includeDetails ? profile : {
            sourceId: profile.sourceId,
            sourceName: profile.sourceName,
            recordCount: profile.recordCount,
            fieldCount: profile.fieldCount,
            qualityMetrics: {
              overallScore: profile.qualityMetrics.overallScore,
              completeness: profile.qualityMetrics.completeness,
              consistency: profile.qualityMetrics.consistency,
              totalIssues: profile.qualityMetrics.totalIssues,
              criticalIssues: profile.qualityMetrics.criticalIssues
            },
            summary: profile.summary
          }
        });
      } catch (error) {
        console.error(`Error profiling data source ${sourceId}:`, error);
        results.push({
          sourceId,
          status: 'error',
          error: 'Failed to generate profile'
        });
      }
    }

    // Calculate summary statistics
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'error');
    const skipped = results.filter(r => r.status === 'skipped');

    const summary = {
      total: sourceIds.length,
      successful: successful.length,
      failed: failed.length,
      skipped: skipped.length,
      avgQualityScore: successful.length > 0 
        ? successful.reduce((sum, r) => {
            const profile = r.profile as { qualityMetrics?: { overallScore?: number } };
            return sum + (profile?.qualityMetrics?.overallScore || 0);
          }, 0) / successful.length
        : 0
    };

    return NextResponse.json({
      summary,
      results
    });
  } catch (error) {
    console.error('Error in batch profiling:', error);
    return NextResponse.json(
      { error: 'Failed to process batch profiling request' },
      { status: 500 }
    );
  }
}