import React, { useState, useEffect } from 'react';
import { ConfigurationPanel } from './components/configurations/ConfigurationPanel';
import { JobsPanel } from './components/jobs/JobsPanel';
import { DatasetEnhancementPanel } from './components/enhancement/DatasetEnhancementPanel';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export function SyntheticDataFeature() {
  const [showServerlessWarning, setShowServerlessWarning] = useState(false);

  useEffect(() => {
    checkServerlessEnvironment();
  }, []);

  const checkServerlessEnvironment = async () => {
    try {
      const response = await fetch('/api/synthetic');
      if (!response.ok && response.status === 500) {
        const errorData = await response.json();
        if (errorData.serverless || (errorData.error && errorData.error.includes('serverless'))) {
          setShowServerlessWarning(true);
        }
      }
    } catch (error) {
      console.log('Environment check failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {showServerlessWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Serverless Environment Detected
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                This application is running in a serverless environment. Synthetic datasets may not persist 
                between function invocations. For production use, please configure a persistent database.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ConfigurationPanel />
          <DatasetEnhancementPanel />
        </div>
        <JobsPanel />
      </div>
    </div>
  );
}