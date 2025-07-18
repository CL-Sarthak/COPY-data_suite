'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { HelpButton, Tooltip } from '@/components/HelpSystem';
import { getHelpContent } from '@/content/helpContent';
import { useSSE } from '@/hooks/useSSE';
import { 
  DocumentTextIcon, 
  ShieldCheckIcon, 
  SparklesIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ServerStackIcon,
  ArrowPathIcon,
  WifiIcon
} from '@heroicons/react/24/outline';

interface DashboardMetrics {
  dataSources: number;
  definedPatterns: number;
  assembledDatasets: number;
  syntheticRecordsGenerated: number;
  complianceScore: number;
  recentActivity: ActivityItem[];
  environmentStatus: EnvironmentStatus[];
  pipelineStages: PipelineStage[];
}

interface PipelineStage {
  name: string;
  status: 'completed' | 'in-progress' | 'pending';
  count: number;
  description: string;
  link?: string;
}

interface ActivityItem {
  id: string;
  type: 'discovery' | 'redaction' | 'synthetic' | 'deployment';
  description: string;
  timestamp: Date;
  status: 'completed' | 'in-progress' | 'failed';
}

interface EnvironmentStatus {
  name: string;
  type: 'production' | 'uat' | 'test';
  lastSync: Date;
  status: 'active' | 'syncing' | 'error';
  recordCount: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize SSE callbacks to prevent reconnections
  const handleSSEMessage = useCallback((data: unknown) => {
    const messageData = data as { type: string; data?: DashboardMetrics; message?: string };
    
    if (messageData.type === 'dashboard_update' && messageData.data) {
      // Parse dates in the data
      const parsedData = {
        ...messageData.data,
        recentActivity: messageData.data.recentActivity.map((activity: ActivityItem) => ({
          ...activity,
          timestamp: new Date(activity.timestamp)
        })),
        environmentStatus: messageData.data.environmentStatus.map((env: EnvironmentStatus) => ({
          ...env,
          lastSync: new Date(env.lastSync)
        }))
      };
      setMetrics(parsedData);
      setError(null);
      setLoading(false);
    } else if (messageData.type === 'error') {
      console.error('Dashboard SSE error:', messageData.message);
      setError(messageData.message || 'Failed to load dashboard data');
      setLoading(false);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        // If dashboard API fails, try to continue with degraded functionality
        console.warn('Dashboard API failed, using fallback data');
        setMetrics({
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
        });
        setError('Dashboard data unavailable in serverless environment. Functionality may be limited.');
        return;
      }
      
      const data = await response.json();
      
      // Parse dates
      data.recentActivity = data.recentActivity.map((activity: ActivityItem) => ({
        ...activity,
        timestamp: new Date(activity.timestamp)
      }));
      data.environmentStatus = data.environmentStatus.map((env: EnvironmentStatus) => ({
        ...env,
        lastSync: new Date(env.lastSync)
      }));
      
      setMetrics(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. This may be due to serverless environment limitations.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSSEError = useCallback(() => {
    console.warn('SSE connection error, falling back to manual fetch');
    // Fallback to manual fetch if SSE fails
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSSEOpen = useCallback(() => {
    console.log('Dashboard SSE connection established');
  }, []);

  // Use SSE for real-time dashboard updates
  const { isConnected } = useSSE('dashboard', {
    url: '/api/dashboard/updates',
    onMessage: handleSSEMessage,
    onError: handleSSEError,
    onOpen: handleSSEOpen
  });

  useEffect(() => {
    // Initial data fetch as fallback
    if (!isConnected) {
      fetchDashboardData();
    }
  }, [isConnected, fetchDashboardData]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'discovery': return <DocumentTextIcon className="h-5 w-5" />;
      case 'redaction': return <ShieldCheckIcon className="h-5 w-5" />;
      case 'synthetic': return <SparklesIcon className="h-5 w-5" />;
      case 'deployment': return <ChartBarIcon className="h-5 w-5" />;
    }
  };

  const getStatusIcon = (status: ActivityItem['status']) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'in-progress': return <ClockIcon className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed': return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
    }
  };

  const formatTime = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 1000 / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!metrics) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800">{error || 'Failed to load dashboard data'}</p>
              <button
                onClick={fetchDashboardData}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">Data Preparedness Dashboard</h1>
                {isConnected && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    <WifiIcon className="h-3.5 w-3.5" />
                    <span>Live Updates</span>
                  </div>
                )}
              </div>
              <p className="text-gray-600 mt-1">Monitor your data preparation activities and track progress</p>
            </div>
            <HelpButton 
              content={getHelpContent('dashboard')} 
              className="ml-2"
            />
          </div>

          {/* Show warning if there are limitations */}
          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
                <div>
                  <p className="text-amber-800 text-sm">{error}</p>
                  <button
                    onClick={fetchDashboardData}
                    className="mt-2 text-xs text-amber-700 hover:text-amber-900 underline"
                  >
                    Try to reload data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Welcome Message for New Users */}
          {metrics.dataSources === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">Welcome to Cirrus Data Preparedness Studio</h2>
              <p className="text-blue-800 mb-4">
                Get started by following the data pipeline to prepare your datasets for AI training:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-blue-700">
                <li><strong>Connect Data Sources</strong> - Link databases, APIs, and cloud storage</li>
                <li><strong>Define Patterns</strong> - Identify sensitive data that needs protection</li>
                <li><strong>Generate Synthetic Data</strong> - Create privacy-preserving alternatives</li>
                <li><strong>Assemble Datasets</strong> - Combine and transform data for training</li>
                <li><strong>Deploy to Environments</strong> - Push datasets to secure environments</li>
              </ol>
              <Tooltip text="Begin your data preparation journey by connecting your first data source">
                <button
                  onClick={() => router.push('/discovery')}
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start with Data Discovery →
                </button>
              </Tooltip>
            </div>
          )}

          {/* Pipeline Progress */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Pipeline Progress</h2>
            <div className="flex items-center justify-between">
              {metrics.pipelineStages.map((stage, idx) => (
                <div key={stage.name} className="flex-1 relative">
                  <div 
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => stage.link && router.push(stage.link)}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
                      stage.status === 'completed' ? 'bg-green-100 text-green-600' :
                      stage.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {stage.status === 'completed' ? (
                        <CheckCircleIcon className="h-6 w-6" />
                      ) : stage.status === 'in-progress' ? (
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <div className="w-3 h-3 bg-gray-400 rounded-full" />
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-900 mt-2 text-center group-hover:text-blue-600">{stage.name}</p>
                    <p className="text-xs text-gray-500">{stage.count} {stage.description}</p>
                  </div>
                  {idx < metrics.pipelineStages.length - 1 && (
                    <div className={`absolute top-6 left-12 w-full h-0.5 ${
                      stage.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Data Sources</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.dataSources}</p>
                </div>
                <DocumentTextIcon className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Defined Patterns</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.definedPatterns}</p>
                </div>
                <ShieldCheckIcon className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Training Datasets</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.assembledDatasets}</p>
                </div>
                <SparklesIcon className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Compliance Score</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.complianceScore}%</p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-amber-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              {metrics.recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No activity yet</p>
                  <p className="text-sm text-gray-400 mt-2">Activities will appear here as you use the system</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {metrics.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(activity.status)}
                        <p className="text-xs text-gray-500">{formatTime(activity.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>

            {/* Environment Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Environment Status</h2>
              {metrics.environmentStatus.length === 0 ? (
                <div className="text-center py-8">
                  <ServerStackIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No environments configured</p>
                  <p className="text-sm text-gray-400 mt-2">Configure environments to deploy your datasets</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {metrics.environmentStatus.map((env) => (
                  <div key={env.name} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{env.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        env.status === 'active' ? 'bg-green-100 text-green-700' :
                        env.status === 'syncing' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {env.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Records</p>
                        <p className="font-medium">{env.recordCount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Last Sync</p>
                        <p className="font-medium">{formatTime(env.lastSync)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Tooltip text="Navigate to Data Discovery to connect databases, upload files, or connect to cloud storage">
                <button 
                  onClick={() => router.push('/discovery')}
                  className="bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-4 text-left transition-colors"
                >
                  <h3 className="font-medium text-gray-900">Connect New Data Source</h3>
                  <p className="text-sm text-gray-600 mt-1">Add databases, APIs, or file systems</p>
                </button>
              </Tooltip>
              <Tooltip text="Create datasets for AI training by combining and transforming your data sources">
                <button 
                  onClick={() => router.push('/assembly')}
                  className="bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-4 text-left transition-colors"
                >
                  <h3 className="font-medium text-gray-900">Assemble Training Dataset</h3>
                  <p className="text-sm text-gray-600 mt-1">Compose and transform data for AI training</p>
                </button>
              </Tooltip>
              <Tooltip text="Deploy your prepared datasets to development, staging, or production environments">
                <button 
                  onClick={() => router.push('/environments')}
                  className="bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-4 text-left transition-colors"
                >
                  <h3 className="font-medium text-gray-900">Deploy to Environment</h3>
                  <p className="text-sm text-gray-600 mt-1">Push datasets to secure environments</p>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}