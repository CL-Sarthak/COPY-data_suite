import React from 'react';
import { ChartBarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { ProfileHeaderProps } from './types';

export function ProfileHeader({ profile, onRefresh, onClose }: ProfileHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChartBarIcon className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Data Profile</h2>
            <p className="text-sm text-gray-600">
              {profile.sourceName} • {profile.recordCount.toLocaleString()} records • {profile.fieldCount} fields
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}