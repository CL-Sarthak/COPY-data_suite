import React from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { QualitySummaryProps } from './types';
import { getQualityColor, getQualityLabel } from './utils';

export function QualitySummary({ profile, expanded, onToggle }: QualitySummaryProps) {
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
          Overall Quality Summary
        </h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getQualityColor(profile.qualityMetrics.overallScore)}`}>
          {Math.round(profile.qualityMetrics.overallScore * 100)}% • {getQualityLabel(profile.qualityMetrics.overallScore)}
        </div>
      </div>
      
      {expanded && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(profile.qualityMetrics.completeness * 100)}%
            </div>
            <div className="text-sm text-gray-600">Completeness</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(profile.qualityMetrics.consistency * 100)}%
            </div>
            <div className="text-sm text-gray-600">Consistency</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(profile.qualityMetrics.validity * 100)}%
            </div>
            <div className="text-sm text-gray-600">Validity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(profile.qualityMetrics.uniqueness * 100)}%
            </div>
            <div className="text-sm text-gray-600">Uniqueness</div>
          </div>
        </div>
      )}
    </div>
  );
}