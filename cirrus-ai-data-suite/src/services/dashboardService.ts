import { getDatabase } from '@/database/connection';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { withRepository } from '@/database/repository-helper';
import { PatternEntity } from '@/entities/PatternEntity';
import { AnnotationSession } from '@/entities/AnnotationSession';
import { ProcessedFile } from '@/entities/ProcessedFile';
import { SyntheticDataset } from '@/entities/SyntheticDataset';
import { DashboardMetrics, ActivityItem, EnvironmentStatus, PipelineStage } from '@/types/dashboard';

export class DashboardService {
  /**
   * Parse dashboard data from API response (client-side)
   */
  static parseDashboardData(data: DashboardMetrics & { recentActivity: Array<{ timestamp: string }>, environmentStatus: Array<{ lastSync: string }> }): DashboardMetrics {
    return {
      ...data,
      recentActivity: data.recentActivity.map((activity) => ({
        ...activity,
        timestamp: new Date(activity.timestamp)
      })),
      environmentStatus: data.environmentStatus.map((env) => ({
        ...env,
        lastSync: new Date(env.lastSync)
      }))
    };
  }

  /**
   * Get fallback metrics when API is unavailable (client-side)
   */
  static getFallbackMetrics(): DashboardMetrics {
    return {
      dataSources: 0,
      definedPatterns: 0,
      assembledDatasets: 0,
      syntheticRecordsGenerated: 0,
      complianceScore: 0,
      recentActivity: [],
      environmentStatus: [],
      pipelineStages: [
        {
          name: 'Data Discovery',
          status: 'pending',
          count: 0,
          description: 'data sources',
          link: '/discovery'
        },
        {
          name: 'Pattern Definition',
          status: 'pending',
          count: 0,
          description: 'patterns',
          link: '/redaction'
        },
        {
          name: 'Synthetic Generation',
          status: 'pending',
          count: 0,
          description: 'datasets',
          link: '/synthetic'
        },
        {
          name: 'Data Assembly',
          status: 'pending',
          count: 0,
          description: 'sessions',
          link: '/assembly'
        },
        {
          name: 'Environment Deployment',
          status: 'pending',
          count: 0,
          description: 'environments',
          link: '/environments'
        }
      ]
    };
  }

  /**
   * Format relative time (client-side utility)
   */
  static formatRelativeTime(date: Date): string {
    const minutes = Math.floor((Date.now() - date.getTime()) / 1000 / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    console.log('DashboardService: Initializing database connection...');
    
    try {
      const db = await getDatabase();
      console.log('DashboardService: Database connection established');
      
      console.log('DashboardService: Fetching entity counts...');
    
    // Fetch counts from database with individual error handling
    const [
      dataSourceCount,
      patternCount,
      sessionCount,
      fileCount,
      syntheticDatasetCount,
      syntheticRecordsTotal
    ] = await Promise.all([
      withRepository(DataSourceEntity, repo => repo.count()).catch(err => {
        console.warn('Failed to count DataSourceEntity:', err.message);
        return 0;
      }),
      withRepository(PatternEntity, repo => repo.count({ where: { isActive: true } })).catch(err => {
        console.warn('Failed to count PatternEntity:', err.message);
        return 0;
      }),
      withRepository(AnnotationSession, repo => repo.count()).catch(err => {
        console.warn('Failed to count AnnotationSession:', err.message);
        return 0;
      }),
      withRepository(ProcessedFile, repo => repo.count()).catch(err => {
        console.warn('Failed to count ProcessedFile:', err.message);
        return 0;
      }),
      withRepository(SyntheticDataset, repo => repo.count({ where: { status: 'completed' } })).catch(err => {
        console.warn('Failed to count SyntheticDataset:', err.message);
        return 0;
      }),
      db.getRepository(SyntheticDataset)
        .createQueryBuilder('dataset')
        .select('SUM(dataset.recordCount)', 'total')
        .where('dataset.status = :status', { status: 'completed' })
        .getRawOne()
        .then(result => parseInt(result?.total || '0'))
        .catch(err => {
          console.warn('Failed to sum synthetic records:', err.message);
          return 0;
        })
    ]);
    
    console.log('DashboardService: Entity counts fetched successfully');

    // Fetch recent data sources for activity
    const recentDataSources = await withRepository(DataSourceEntity, repo => 
      repo.find({
        order: { createdAt: 'DESC' },
        take: 5
      })
    ).catch(err => {
      console.warn('Failed to fetch recent DataSourceEntity:', err.message);
      return [];
    });

    // Fetch recent patterns for activity
    const recentPatterns = await withRepository(PatternEntity, repo => 
      repo.find({
        order: { createdAt: 'DESC' },
        take: 5
      })
    ).catch(err => {
      console.warn('Failed to fetch recent PatternEntity:', err.message);
      return [];
    });

    // Fetch recent synthetic datasets for activity
    const recentSyntheticDatasets = await withRepository(SyntheticDataset, repo => 
      repo.find({
        order: { createdAt: 'DESC' },
        take: 5
      })
    ).catch(err => {
      console.warn('Failed to fetch recent SyntheticDataset:', err.message);
      return [];
    });

    // Generate recent activity from data sources and patterns
    const recentActivity: ActivityItem[] = [];
    
    // Add data source activities
    recentDataSources.forEach(ds => {
      recentActivity.push({
        id: `ds-${ds.id}`,
        type: 'discovery',
        description: `Connected data source: ${ds.name}`,
        timestamp: ds.createdAt,
        status: 'completed'
      });
    });

    // Add pattern activities
    recentPatterns.forEach(pattern => {
      recentActivity.push({
        id: `pattern-${pattern.id}`,
        type: 'redaction',
        description: `Defined pattern: ${pattern.name}`,
        timestamp: pattern.createdAt,
        status: 'completed'
      });
    });

    // Add synthetic data activities
    recentSyntheticDatasets.forEach(dataset => {
      recentActivity.push({
        id: `synthetic-${dataset.id}`,
        type: 'synthetic',
        description: `Generated ${dataset.recordCount} records: ${dataset.name}`,
        timestamp: dataset.updatedAt,
        status: dataset.status === 'completed' ? 'completed' : 
                dataset.status === 'generating' ? 'in-progress' : 'failed'
      });
    });

    // Sort by timestamp
    recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Calculate pipeline stages
    const pipelineStages: PipelineStage[] = [
      {
        name: 'Data Discovery',
        status: dataSourceCount > 0 ? 'completed' : 'pending',
        count: dataSourceCount,
        description: 'data sources',
        link: '/discovery'
      },
      {
        name: 'Pattern Definition',
        status: patternCount > 0 ? 'completed' : dataSourceCount > 0 ? 'in-progress' : 'pending',
        count: patternCount,
        description: 'patterns',
        link: '/redaction'
      },
      {
        name: 'Synthetic Generation',
        status: syntheticDatasetCount > 0 ? 'completed' : patternCount > 0 ? 'in-progress' : 'pending',
        count: syntheticDatasetCount,
        description: 'datasets',
        link: '/synthetic'
      },
      {
        name: 'Data Assembly',
        status: sessionCount > 0 ? 'in-progress' : 'pending',
        count: sessionCount,
        description: 'sessions',
        link: '/assembly'
      },
      {
        name: 'Environment Deployment',
        status: 'pending', // Will be updated when we implement environments
        count: 0,
        description: 'environments',
        link: '/environments'
      }
    ];

    // Calculate compliance score (mock for now, based on pattern coverage)
    const complianceScore = patternCount > 0 ? Math.min(95, patternCount * 15) : 0;

    // Mock environment status (will be real when we implement environments)
    const environmentStatus: EnvironmentStatus[] = [];
    if (sessionCount > 0) {
      environmentStatus.push({
        name: 'Development',
        type: 'test',
        lastSync: new Date(),
        status: 'active',
        recordCount: fileCount
      });
    }

    return {
      dataSources: dataSourceCount,
      definedPatterns: patternCount,
      assembledDatasets: sessionCount,
      syntheticRecordsGenerated: syntheticRecordsTotal,
      complianceScore,
      recentActivity: recentActivity.slice(0, 10), // Limit to 10 most recent
      environmentStatus,
      pipelineStages
    };
    } catch (error) {
      console.error('DashboardService: Failed to fetch metrics:', error);
      
      // Return default empty metrics to prevent dashboard crash
      return {
        dataSources: 0,
        definedPatterns: 0,
        assembledDatasets: 0,
        syntheticRecordsGenerated: 0,
        complianceScore: 0,
        recentActivity: [],
        environmentStatus: [],
        pipelineStages: [
          {
            name: 'Data Discovery',
            status: 'pending',
            count: 0,
            description: 'data sources',
            link: '/discovery'
          },
          {
            name: 'Pattern Definition',
            status: 'pending',
            count: 0,
            description: 'patterns',
            link: '/redaction'
          },
          {
            name: 'Synthetic Generation',
            status: 'pending',
            count: 0,
            description: 'datasets',
            link: '/synthetic'
          },
          {
            name: 'Data Assembly',
            status: 'pending',
            count: 0,
            description: 'sessions',
            link: '/assembly'
          },
          {
            name: 'Environment Deployment',
            status: 'pending',
            count: 0,
            description: 'environments',
            link: '/environments'
          }
        ]
      };
    }
  }

  static async getQuickStats() {
    const [sources, patterns, sessions] = await Promise.all([
      withRepository(DataSourceEntity, repo => repo.count()),
      withRepository(PatternEntity, repo => repo.count({ where: { isActive: true } })),
      withRepository(AnnotationSession, repo => repo.count())
    ]);

    return { sources, patterns, sessions };
  }
}