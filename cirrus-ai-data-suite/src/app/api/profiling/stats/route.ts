import { NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';

/**
 * GET /api/profiling/stats
 * Get overall profiling statistics across all data sources
 */
export async function GET() {
  try {
    // Get all data sources
    const dataSources = await DataSourceService.getAllDataSources();
    
    // Filter for transformed data sources
    const transformedSources = dataSources.filter(source => source.hasTransformedData);
    
    // Calculate basic statistics
    const stats = {
      totalDataSources: dataSources.length,
      transformedDataSources: transformedSources.length,
      readyForProfiling: transformedSources.length,
      transformationRate: dataSources.length > 0 ? transformedSources.length / dataSources.length : 0,
      
      // Data source type breakdown
      sourceTypes: {} as Record<string, number>,
      
      // Basic metrics for transformed sources
      totalRecords: 0,
      avgRecordsPerSource: 0,
      
      // File types processed
      fileTypes: {} as Record<string, number>,
      
      // Recommendations
      recommendations: [] as string[]
    };

    // Calculate source type distribution
    dataSources.forEach(source => {
      stats.sourceTypes[source.type] = (stats.sourceTypes[source.type] || 0) + 1;
    });

    // Calculate record statistics
    transformedSources.forEach(source => {
      if (source.recordCount) {
        stats.totalRecords += source.recordCount;
      }
    });

    stats.avgRecordsPerSource = transformedSources.length > 0 
      ? stats.totalRecords / transformedSources.length 
      : 0;

    // Analyze file types from filesystem sources
    dataSources
      .filter(source => source.type === 'filesystem' && source.configuration.files)
      .forEach(source => {
        source.configuration.files?.forEach(file => {
          const extension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
          stats.fileTypes[extension] = (stats.fileTypes[extension] || 0) + 1;
        });
      });

    // Generate recommendations
    if (stats.transformationRate < 0.5) {
      stats.recommendations.push('Consider transforming more data sources for comprehensive profiling');
    }
    
    if (stats.transformedDataSources === 0) {
      stats.recommendations.push('Transform your first data source to start data profiling');
    } else if (stats.transformedDataSources < 3) {
      stats.recommendations.push('Add more data sources to get comprehensive data quality insights');
    }

    if (Object.keys(stats.fileTypes).length > 5) {
      stats.recommendations.push('Multiple file types detected - consider standardizing data formats');
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting profiling stats:', error);
    return NextResponse.json(
      { error: 'Failed to get profiling statistics' },
      { status: 500 }
    );
  }
}