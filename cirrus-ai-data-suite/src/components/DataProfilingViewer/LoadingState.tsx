import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { LoadingStateProps } from './types';

export function LoadingState({ message = "Generating comprehensive data profile with quality metrics, patterns, and recommendations..." }: LoadingStateProps) {
  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-gray-300 p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Data Quality</h3>
          <p className="text-gray-600">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}