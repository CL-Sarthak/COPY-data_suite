import React from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { QualityIssuesProps } from './types';
import { IssueIcon } from './IssueIcon';

export function QualityIssues({ profile, expanded, onToggle }: QualityIssuesProps) {
  if (profile.qualityMetrics.totalIssues === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          {expanded ? 
            <ChevronDownIcon className="h-5 w-5" /> : 
            <ChevronRightIcon className="h-5 w-5" />
          }
          Quality Issues
        </h3>
        <div className="flex items-center gap-2">
          {profile.qualityMetrics.criticalIssues > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
              {profile.qualityMetrics.criticalIssues} Critical
            </span>
          )}
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
            {profile.qualityMetrics.totalIssues} Total
          </span>
        </div>
      </div>
      
      {expanded && (
        <div className="mt-4 space-y-2">
          {profile.qualityMetrics.issues.map((issue, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <IssueIcon type={issue.type} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{issue.field}</span>
                  <span className="text-sm text-gray-600">({issue.count} occurrences)</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{issue.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}