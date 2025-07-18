import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { RecommendationsProps } from './types';

export function Recommendations({ recommendations }: RecommendationsProps) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="text-lg font-medium text-blue-900 mb-3">Recommendations</h3>
      <ul className="space-y-2">
        {recommendations.map((action, index) => (
          <li key={index} className="flex items-start gap-2 text-blue-800">
            <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}