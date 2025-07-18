import React from 'react';
import { CircleStackIcon } from '@heroicons/react/24/outline';

export function EmptyState() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-12 text-center">
        <CircleStackIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Sources Connected</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Your data sources will appear here as a sortable table. Connect your first data source to get started.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto">
          <p className="text-sm text-blue-800">
            <strong>Pro Tip:</strong> The table view allows you to sort by name, type, status, record count, and last activity to easily manage multiple data sources.
          </p>
        </div>
      </div>
    </div>
  );
}