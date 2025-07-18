import React from 'react';
import { 
  DocumentTextIcon, 
  ShieldCheckIcon, 
  SparklesIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ActivityItem } from '@/types/dashboard';
import { DashboardClientService } from '@/services/dashboardClientService';

interface RecentActivityProps {
  activities: ActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
      {activities.length === 0 ? (
        <div className="text-center py-8">
          <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No activity yet</p>
          <p className="text-sm text-gray-400 mt-2">Activities will appear here as you use the system</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(activity.status)}
                  <p className="text-xs text-gray-500">
                    {DashboardClientService.formatRelativeTime(activity.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}