import React from 'react';
import { Plus } from 'lucide-react';

interface PatternSelectorProps {
  selectedText: string;
  selectedPatternId: string;
  showCustomForm: boolean;
  customLabel: string;
  isContextClue: boolean;
  onAddExample: () => void;
  onShowCustomForm: () => void;
  onHideCustomForm: () => void;
  onCustomLabelChange: (label: string) => void;
  onAddCustomPattern: () => void;
  onSelectPattern?: (patternId: string) => void;
  onToggleContextClue?: (checked: boolean) => void;
  patterns?: Array<{ id: string; label: string; type: string; examples: string[]; isContextClue?: boolean }>;
}

export function PatternSelector({
  selectedText,
  selectedPatternId,
  showCustomForm,
  customLabel,
  isContextClue,
  onAddExample,
  onShowCustomForm,
  onHideCustomForm,
  onCustomLabelChange,
  onAddCustomPattern,
  onSelectPattern,
  onToggleContextClue,
  patterns = []
}: PatternSelectorProps) {
  if (!selectedText) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-500">
          Select text in the document to tag it with a pattern
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 space-y-4 shadow-lg">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Selected text:</p>
        <p className="text-sm bg-white p-3 rounded border-2 border-blue-300 font-mono break-all text-gray-900 font-semibold">
          &ldquo;{selectedText}&rdquo;
        </p>
      </div>

      {!showCustomForm ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tag this text as:
            </label>
            <select
              value={selectedPatternId}
              onChange={(e) => onSelectPattern?.(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a pattern type...</option>
              <optgroup label="Personal Information">
                {patterns.filter(p => p.type === 'PII').map(pattern => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Financial">
                {patterns.filter(p => p.type === 'FINANCIAL').map(pattern => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Medical">
                {patterns.filter(p => p.type === 'MEDICAL').map(pattern => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Classification">
                {patterns.filter(p => p.type === 'CLASSIFICATION').map(pattern => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Context Clue Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="contextClue"
              checked={isContextClue}
              onChange={(e) => onToggleContextClue?.(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="contextClue" className="text-sm text-gray-700">
              This is a context clue (not sensitive itself)
            </label>
          </div>
          
          <div className="flex gap-2">
            {selectedPatternId ? (
              <button
                onClick={onAddExample}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add as {patterns.find(p => p.id === selectedPatternId)?.label}
              </button>
            ) : (
              <button
                onClick={onShowCustomForm}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create custom pattern
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">New pattern label:</p>
            <button
              onClick={onHideCustomForm}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
          
          <input
            type="text"
            value={customLabel}
            onChange={(e) => onCustomLabelChange(e.target.value)}
            placeholder="e.g., Employee ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onAddCustomPattern();
              }
            }}
            autoFocus
          />

          {/* Context Clue Checkbox for Custom Pattern */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="contextClueCustom"
              checked={isContextClue}
              onChange={(e) => onToggleContextClue?.(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="contextClueCustom" className="text-sm text-gray-700">
              This is a context clue (not sensitive itself)
            </label>
          </div>
          
          <button
            onClick={onAddCustomPattern}
            disabled={!customLabel.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create pattern
          </button>
        </div>
      )}
    </div>
  );
}