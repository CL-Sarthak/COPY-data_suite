import React from 'react';
import { Pattern } from '@/services/patternService';
import { TrashIcon } from '@heroicons/react/24/outline';
import { EmptyState } from '@/features/shared/components';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

interface PatternListProps {
  patterns: Pattern[];
  selectedPattern: Pattern | null;
  onSelectPattern: (pattern: Pattern) => void;
  onTogglePattern: (pattern: Pattern) => void;
  onDeletePattern: (pattern: Pattern) => void;
  category: string;
}

export function PatternList({
  patterns,
  selectedPattern,
  onSelectPattern,
  onTogglePattern,
  onDeletePattern,
  category
}: PatternListProps) {
  if (patterns.length === 0) {
    return (
      <EmptyState
        icon={<ShieldCheckIcon />}
        title={category === 'all' ? 'No patterns defined' : `No ${category} patterns`}
        description={category === 'all' 
          ? 'Create your first pattern to start detecting sensitive data'
          : `Create a ${category} pattern to detect this type of sensitive data`
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      {patterns.map((pattern) => (
        <div
          key={pattern.id}
          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
            selectedPattern?.id === pattern.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onSelectPattern(pattern)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">{pattern.name}</h3>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  pattern.type === 'PII' ? 'bg-red-100 text-red-700' :
                  pattern.type === 'MEDICAL' ? 'bg-purple-100 text-purple-700' :
                  pattern.type === 'FINANCIAL' ? 'bg-blue-100 text-blue-700' :
                  pattern.type === 'CLASSIFICATION' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {pattern.type}
                </span>
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                  {pattern.category}
                </span>
              </div>
              {pattern.description && (
                <p className="text-sm text-gray-600 mt-1">{pattern.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                {pattern.examples && pattern.examples.length > 0 && (
                  <span>{pattern.examples.length} examples</span>
                )}
                {pattern.regex && pattern.regex.length > 0 && (
                  <span className="font-mono truncate max-w-xs">
                    {pattern.regex[0]}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pattern.isActive}
                  onChange={(e) => {
                    e.stopPropagation();
                    onTogglePattern(pattern);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePattern(pattern);
                }}
                className="text-gray-400 hover:text-red-600 transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}