import React from 'react';
import { SensitivePattern } from '@/types';
import { Tag, Trash2, X, Info } from 'lucide-react';

interface PatternListProps {
  patterns: SensitivePattern[];
  selectedPatternId: string;
  onSelectPattern: (patternId: string) => void;
  onRemovePattern: (patternId: string) => void;
  onRemoveExample: (patternId: string, exampleIndex: number) => void;
}

export function PatternList({
  patterns,
  selectedPatternId,
  onSelectPattern,
  onRemovePattern,
  onRemoveExample
}: PatternListProps) {
  const hasPredefinedPatterns = patterns.some(p => p.id.startsWith('pattern-'));
  
  return (
    <div className="space-y-2">
      {hasPredefinedPatterns && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            Removing predefined patterns only affects this session. They will be available again in future sessions.
          </p>
        </div>
      )}
      {patterns.map(pattern => (
        <div
          key={pattern.id}
          className={`border rounded-lg p-4 cursor-pointer transition-all ${
            selectedPatternId === pattern.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onSelectPattern(pattern.id)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-gray-500" />
              <span className={`px-2 py-1 rounded text-sm font-medium ${pattern.color}`}>
                {pattern.label}
              </span>
              {pattern.isContextClue && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  Context Clue
                </span>
              )}
              <span className="text-xs text-gray-500">
                ({pattern.examples.length} example{pattern.examples.length !== 1 ? 's' : ''})
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemovePattern(pattern.id);
              }}
              className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
              title={pattern.id.startsWith('pattern-') ? 'Remove predefined pattern from this session' : 'Delete custom pattern'}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          
          {pattern.examples.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-500 mb-1">Examples:</div>
              {pattern.examples.map((example, index) => (
                <div key={index} className="flex items-center justify-between group">
                  <span className="text-sm text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">
                    {example}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveExample(pattern.id, index);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all ml-2"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {pattern.regex && (
            <div className="mt-2 text-xs text-gray-500">
              <span className="font-medium">Regex:</span> 
              <code className="ml-1 bg-gray-100 px-1 py-0.5 rounded">{pattern.regex}</code>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}