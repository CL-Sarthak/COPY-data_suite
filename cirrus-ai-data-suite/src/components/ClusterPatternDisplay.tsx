import React from 'react';
import { UserGroupIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface ClusterPatternDisplayProps {
  pattern: {
    name: string;
    description: string;
    metadata?: string;
    color: string;
    examples: string[];
  };
}

export function ClusterPatternDisplay({ pattern }: ClusterPatternDisplayProps) {
  let clusterData = null;
  try {
    if (pattern.metadata) {
      clusterData = JSON.parse(pattern.metadata);
    }
  } catch {
    // Not a cluster pattern
  }

  if (!clusterData?.isCluster) {
    return null;
  }

  return (
    <div className="mt-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
      <div className="flex items-start gap-2">
        <UserGroupIcon className="w-4 h-4 text-purple-600 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-medium text-purple-900">Cluster Pattern</p>
          <p className="text-xs text-purple-700 mt-1">
            This pattern groups {clusterData.clusterFields?.length || 0} related fields together
          </p>
          <div className="mt-2">
            <p className="text-xs font-medium text-purple-800 mb-1">Included Fields:</p>
            <div className="flex flex-wrap gap-1">
              {clusterData.clusterFields?.map((field: string, idx: number) => (
                <span 
                  key={idx}
                  className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-2 p-2 bg-purple-100 rounded flex items-start gap-2">
            <InformationCircleIcon className="w-3 h-3 text-purple-700 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-800">
              When this pattern is applied, all {clusterData.clusterFields?.length} fields will be 
              redacted together to ensure complete data protection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}