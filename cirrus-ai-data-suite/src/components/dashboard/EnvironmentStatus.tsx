import React from 'react';
import { ServerStackIcon } from '@heroicons/react/24/outline';
import { EnvironmentStatus as EnvironmentStatusType } from '@/types/dashboard';
import { DashboardClientService } from '@/services/dashboardClientService';

interface EnvironmentStatusProps {
  environments: EnvironmentStatusType[];
}

export function EnvironmentStatus({ environments }: EnvironmentStatusProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Environment Status</h2>
      {environments.length === 0 ? (
        <div className="text-center py-8">
          <ServerStackIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No environments configured</p>
          <p className="text-sm text-gray-400 mt-2">Configure environments to deploy your datasets</p>
        </div>
      ) : (
        <div className="space-y-4">
          {environments.map((env) => (
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
                  <p className="font-medium">
                    {DashboardClientService.formatRelativeTime(env.lastSync)}
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