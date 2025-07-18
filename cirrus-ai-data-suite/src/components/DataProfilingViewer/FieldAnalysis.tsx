import React from 'react';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { FieldAnalysisProps, ProfileViewerState } from './types';
import { getQualityColor } from './utils';

export function FieldAnalysis({ 
  profile, 
  expanded, 
  onToggle,
  selectedField,
  searchTerm,
  qualityFilter,
  onFieldSelect,
  onSearchChange,
  onQualityFilterChange
}: FieldAnalysisProps) {
  const filteredFields = profile.fields.filter(field => {
    const matchesSearch = field.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesQuality = 
      qualityFilter === 'all' ||
      (qualityFilter === 'excellent' && field.qualityScore > 0.9) ||
      (qualityFilter === 'good' && field.qualityScore > 0.7 && field.qualityScore <= 0.9) ||
      (qualityFilter === 'fair' && field.qualityScore > 0.5 && field.qualityScore <= 0.7) ||
      (qualityFilter === 'poor' && field.qualityScore <= 0.5);
    
    return matchesSearch && matchesQuality;
  });

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
          Field Analysis
        </h3>
        <span className="text-sm text-gray-600">{filteredFields.length} of {profile.fields.length} fields</span>
      </div>
      
      {expanded && (
        <div className="mt-4">
          {/* Field Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search fields..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={qualityFilter}
              onChange={(e) => onQualityFilterChange(e.target.value as ProfileViewerState['qualityFilter'])}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Quality Levels</option>
              <option value="excellent">Excellent (90%+)</option>
              <option value="good">Good (70-90%)</option>
              <option value="fair">Fair (50-70%)</option>
              <option value="poor">Poor (&lt;50%)</option>
            </select>
          </div>

          {/* Field List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredFields.map((field) => (
              <div
                key={field.name}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedField === field.name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onFieldSelect(field.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{field.name}</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{field.type}</span>
                    {field.qualityIssues.length > 0 && (
                      <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getQualityColor(field.qualityScore)}`}>
                    {Math.round(field.qualityScore * 100)}%
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span>Completeness: {Math.round(field.completeness * 100)}%</span>
                  <span>Uniqueness: {Math.round(field.uniqueness * 100)}%</span>
                  <span>Values: {field.uniqueCount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}