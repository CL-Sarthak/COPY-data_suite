import React from 'react';
import { EnhancementStats } from '../../types/enhancement.types';

interface SummaryStatsProps {
  stats: EnhancementStats;
}

export function SummaryStats({ stats }: SummaryStatsProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-left">
      <h5 className="font-medium text-gray-900 mb-3">Enhancement Summary</h5>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-700">Records processed:</span>
          <span className="font-medium">{stats.enhancedRecords}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Fields added:</span>
          <span className="font-medium">{stats.addedFields}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Total fields:</span>
          <span className="font-medium">{stats.totalFields}</span>
        </div>
      </div>
    </div>
  );
}