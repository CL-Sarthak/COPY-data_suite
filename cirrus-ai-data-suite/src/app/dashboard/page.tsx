'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import { HelpButton } from '@/components/HelpSystem';
import { getHelpContent } from '@/content/helpContent';
import { useDashboard } from '@/hooks/useDashboard';
import { MetricsCard } from '@/components/dashboard/MetricsCard';
import { PipelineProgress } from '@/components/dashboard/PipelineProgress';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { EnvironmentStatus } from '@/components/dashboard/EnvironmentStatus';
import { WelcomeMessage } from '@/components/dashboard/WelcomeMessage';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { 
  DocumentTextIcon, 
  ShieldCheckIcon, 
  SparklesIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  WifiIcon
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const { metrics, loading, error, isConnected, refetch } = useDashboard();

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
                onClick={refetch}
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

  const showWelcome = metrics.dataSources === 0;

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
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

          {/* Error/Warning Banner */}
          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
                <div>
                  <p className="text-amber-800 text-sm">{error}</p>
                  <button
                    onClick={refetch}
                    className="mt-2 text-xs text-amber-700 hover:text-amber-900 underline"
                  >
                    Try to reload data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Welcome Message */}
          <WelcomeMessage showWelcome={showWelcome} />

          {/* Pipeline Progress */}
          <PipelineProgress stages={metrics.pipelineStages} />

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricsCard
              title="Data Sources"
              value={metrics.dataSources}
              icon={<DocumentTextIcon className="h-8 w-8" />}
              iconColor="text-blue-500"
            />
            <MetricsCard
              title="Defined Patterns"
              value={metrics.definedPatterns}
              icon={<ShieldCheckIcon className="h-8 w-8" />}
              iconColor="text-green-500"
            />
            <MetricsCard
              title="Training Datasets"
              value={metrics.assembledDatasets}
              icon={<SparklesIcon className="h-8 w-8" />}
              iconColor="text-purple-500"
            />
            <MetricsCard
              title="Compliance Score"
              value={`${metrics.complianceScore}%`}
              icon={<ChartBarIcon className="h-8 w-8" />}
              iconColor="text-amber-500"
            />
          </div>

          {/* Activity and Environment Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <RecentActivity activities={metrics.recentActivity} />
            <EnvironmentStatus environments={metrics.environmentStatus} />
          </div>

          {/* Quick Actions */}
          <QuickActions />
        </div>
      </div>
    </AppLayout>
  );
}