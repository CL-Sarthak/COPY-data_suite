import React from 'react';
import { useRouter } from 'next/navigation';
import { Tooltip } from '@/components/HelpSystem';

export function QuickActions() {
  const router = useRouter();

  return (
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
        <Tooltip text="Create datasets for AI applications by combining and transforming your data sources">
          <button 
            onClick={() => router.push('/assembly')}
            className="bg-white hover:bg-gray-50 border border-gray-300 rounded-lg p-4 text-left transition-colors"
          >
            <h3 className="font-medium text-gray-900">Assemble Dataset</h3>
            <p className="text-sm text-gray-600 mt-1">Compose and transform data for AI applications</p>
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
  );
}