import { DashboardMetrics } from '@/types/dashboard';

/**
 * Client-side dashboard service for browser-safe operations
 */
export class DashboardClientService {
  /**
   * Parse dashboard data from API response
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
   * Get fallback metrics when API is unavailable
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
   * Format relative time
   */
  static formatRelativeTime(date: Date): string {
    const minutes = Math.floor((Date.now() - date.getTime()) / 1000 / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
}