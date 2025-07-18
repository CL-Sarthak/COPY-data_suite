import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { FieldDetailSidebarProps } from './types';
import { getQualityColor } from './utils';

export function FieldDetailSidebar({ field, onClose }: FieldDetailSidebarProps) {
  return (
    <div className="w-96 border-l border-gray-200 bg-gray-50 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">{field.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">Field Details & Analysis</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Basic Info */}
        <BasicInfo field={field} />

        {/* Quality Metrics */}
        <QualityMetrics field={field} />

        {/* Value Range */}
        <ValueRange field={field} />

        {/* Most Common Values */}
        <MostCommonValues field={field} />

        {/* Patterns */}
        <Patterns field={field} />

        {/* Quality Issues */}
        <QualityIssuesSection field={field} />
      </div>
    </div>
  );
}

function BasicInfo({ field }: { field: FieldDetailSidebarProps['field'] }) {
  return (
    <div>
      <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Type:</span>
          <span className="font-medium">{field.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Nullable:</span>
          <span className="font-medium">{field.nullable ? 'Yes' : 'No'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Total Count:</span>
          <span className="font-medium">{field.totalCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Unique Values:</span>
          <span className="font-medium">{field.uniqueCount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Null Count:</span>
          <span className="font-medium">{field.nullCount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function QualityMetrics({ field }: { field: FieldDetailSidebarProps['field'] }) {
  return (
    <div>
      <h4 className="font-medium text-gray-900 mb-2">Quality Metrics</h4>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Overall Score:</span>
          <div className={`px-2 py-1 rounded text-xs font-medium ${getQualityColor(field.qualityScore)}`}>
            {Math.round(field.qualityScore * 100)}%
          </div>
        </div>
        <div className="text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Completeness:</span>
            <span>{Math.round(field.completeness * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${field.completeness * 100}%` }}
            ></div>
          </div>
        </div>
        <div className="text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Uniqueness:</span>
            <span>{Math.round(field.uniqueness * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className="bg-green-600 h-2 rounded-full" 
              style={{ width: `${field.uniqueness * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueRange({ field }: { field: FieldDetailSidebarProps['field'] }) {
  if (field.minValue === undefined && field.maxValue === undefined) {
    return null;
  }

  return (
    <div>
      <h4 className="font-medium text-gray-900 mb-2">Value Range</h4>
      <div className="space-y-2 text-sm">
        {field.minValue !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-600">Minimum:</span>
            <span className="font-mono">{String(field.minValue)}</span>
          </div>
        )}
        {field.maxValue !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-600">Maximum:</span>
            <span className="font-mono">{String(field.maxValue)}</span>
          </div>
        )}
        {field.avgValue !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-600">Average:</span>
            <span className="font-mono">{field.avgValue.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MostCommonValues({ field }: { field: FieldDetailSidebarProps['field'] }) {
  if (field.mostCommonValues.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="font-medium text-gray-900 mb-2">Most Common Values</h4>
      <div className="space-y-1">
        {field.mostCommonValues.slice(0, 5).map((item, index) => (
          <div key={index} className="flex justify-between items-center text-sm">
            <span className="font-mono text-gray-900 truncate flex-1 mr-2">
              {String(item.value)}
            </span>
            <span className="text-gray-600 text-xs">
              {item.count} ({Math.round(item.percentage * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Patterns({ field }: { field: FieldDetailSidebarProps['field'] }) {
  if (field.patterns.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="font-medium text-gray-900 mb-2">Patterns</h4>
      <div className="space-y-2">
        {field.patterns.slice(0, 3).map((pattern, index) => (
          <div key={index} className="text-sm">
            <div className="flex justify-between">
              <span className="font-mono text-gray-900">{pattern.pattern}</span>
              <span className="text-gray-600">{Math.round(pattern.percentage * 100)}%</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Examples: {pattern.examples.join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QualityIssuesSection({ field }: { field: FieldDetailSidebarProps['field'] }) {
  if (field.qualityIssues.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="font-medium text-gray-900 mb-2">Quality Issues</h4>
      <div className="space-y-2">
        {field.qualityIssues.map((issue, index) => (
          <div key={index} className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <span className="text-yellow-800">{issue}</span>
          </div>
        ))}
      </div>
    </div>
  );
}