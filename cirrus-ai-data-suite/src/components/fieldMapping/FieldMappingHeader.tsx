import React from 'react';
import { ArrowPathIcon, SparklesIcon, ArrowDownTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface FieldMappingHeaderProps {
  mappedCount: number;
  unmappedCount: number;
  totalFields: number;
  progress: number;
  autoMapping: boolean;
  onGenerateSuggestions: () => void;
  onTransform: () => void;
  canTransform: boolean;
}

export function FieldMappingHeader({
  mappedCount,
  unmappedCount,
  totalFields,
  progress,
  autoMapping,
  onGenerateSuggestions,
  onTransform,
  canTransform
}: FieldMappingHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Field Mapping</h2>
          <p className="text-sm text-gray-600 mt-1">
            Map source fields to catalog fields for structured data transformation
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onGenerateSuggestions}
            disabled={autoMapping || totalFields === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SparklesIcon className={`h-4 w-4 ${autoMapping ? 'animate-pulse' : ''}`} />
            {autoMapping ? 'Generating...' : 'AI Suggestions'}
          </button>
          
          <button
            onClick={onTransform}
            disabled={!canTransform}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Transform Data
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Mapping Progress</span>
          <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <div>
              <div className="text-lg font-semibold text-gray-900">{mappedCount}</div>
              <div className="text-xs text-gray-600">Mapped Fields</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <ArrowPathIcon className="h-5 w-5 text-yellow-600" />
            <div>
              <div className="text-lg font-semibold text-gray-900">{unmappedCount}</div>
              <div className="text-xs text-gray-600">Unmapped Fields</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-lg font-semibold text-gray-900">{totalFields}</div>
          <div className="text-xs text-gray-600">Total Fields</div>
        </div>
      </div>

      {unmappedCount > 0 && (
        <div className="mt-3 text-sm text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2 border border-yellow-200">
          <strong>{unmappedCount}</strong> fields still need to be mapped before transformation
        </div>
      )}
    </div>
  );
}