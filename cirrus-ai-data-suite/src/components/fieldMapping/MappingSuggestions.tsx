import React from 'react';
import { SparklesIcon, CheckIcon } from '@heroicons/react/24/outline';
import { MappingSuggestion } from '@/types/fieldMapping';
import { FieldMappingService } from '@/services/fieldMappingService';

interface MappingSuggestionsProps {
  suggestions: MappingSuggestion[];
  loading: boolean;
  onApplySuggestion: (sourceField: string, catalogFieldId: string) => void;
  onApplyAll: () => void;
}

export function MappingSuggestions({
  suggestions,
  loading,
  onApplySuggestion,
  onApplyAll
}: MappingSuggestionsProps) {
  const highConfidenceSuggestions = suggestions.filter(
    s => s.suggestedMappings.length > 0 && s.suggestedMappings[0].confidence >= 0.7
  );

  if (loading) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <SparklesIcon className="h-5 w-5 text-yellow-600 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-900">
              Generating AI suggestions...
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Analyzing field names and data patterns
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" data-testid="mapping-suggestions">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-medium text-blue-900">
            AI Mapping Suggestions
          </h3>
        </div>
        {highConfidenceSuggestions.length > 0 && (
          <button
            onClick={onApplyAll}
            className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply All ({highConfidenceSuggestions.length})
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {suggestions.map(suggestion => {
          if (suggestion.suggestedMappings.length === 0) return null;
          
          const topSuggestion = suggestion.suggestedMappings[0];
          const confidenceColor = FieldMappingService.getConfidenceColor(topSuggestion.confidence);
          
          return (
            <div
              key={suggestion.sourceFieldName}
              className="bg-white rounded-lg p-3 border border-blue-100"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {suggestion.sourceFieldName}
                    </span>
                    <span className="text-xs">→</span>
                    <span className="text-sm text-gray-700">
                      {topSuggestion.field.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${confidenceColor}`}>
                      {FieldMappingService.formatConfidence(topSuggestion.confidence)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {topSuggestion.reason}
                    </span>
                  </div>
                  {suggestion.suggestedMappings.length > 1 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        {suggestion.suggestedMappings.length - 1} other suggestions
                      </summary>
                      <div className="mt-1 space-y-1">
                        {suggestion.suggestedMappings.slice(1).map((alt, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
                            <span>{alt.field.displayName}</span>
                            <span className="text-gray-400">
                              ({FieldMappingService.formatConfidence(alt.confidence)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
                <button
                  onClick={() => onApplySuggestion(
                    suggestion.sourceFieldName,
                    topSuggestion.field.id
                  )}
                  className="ml-3 p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                  title="Apply this suggestion"
                >
                  <CheckIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}