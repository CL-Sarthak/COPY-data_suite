import React, { useState } from 'react';
import { Button } from '@/features/shared/components';
import { SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { AnnotationPattern } from '../types';

interface PatternDetectionPanelProps {
  detectedPatterns: AnnotationPattern[];
  onDetect: () => Promise<void>;
  onSave: (patterns: AnnotationPattern[]) => Promise<void>;
}

export function PatternDetectionPanel({ 
  detectedPatterns, 
  onDetect, 
  onSave 
}: PatternDetectionPanelProps) {
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPatterns, setSelectedPatterns] = useState<Set<number>>(new Set());

  const handleDetect = async () => {
    setDetecting(true);
    try {
      await onDetect();
      // Select all patterns by default
      setSelectedPatterns(new Set(detectedPatterns.map((_, idx) => idx)));
    } catch (err) {
      console.error('Detection failed:', err);
    } finally {
      setDetecting(false);
    }
  };

  const handleSave = async () => {
    const patternsToSave = detectedPatterns.filter((_, idx) => selectedPatterns.has(idx));
    if (patternsToSave.length === 0) return;

    setSaving(true);
    try {
      await onSave(patternsToSave);
      setSelectedPatterns(new Set());
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const togglePattern = (idx: number) => {
    const newSelected = new Set(selectedPatterns);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedPatterns(newSelected);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Pattern Detection</h3>
        <Button
          size="sm"
          icon={<SparklesIcon className="h-4 w-4" />}
          onClick={handleDetect}
          loading={detecting}
        >
          Detect with ML
        </Button>
      </div>

      {detectedPatterns.length > 0 && (
        <>
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
            {detectedPatterns.map((pattern, idx) => (
              <label
                key={idx}
                className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedPatterns.has(idx)}
                  onChange={() => togglePattern(idx)}
                  className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {pattern.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {pattern.field}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Pattern: {pattern.pattern}
                  </p>
                  <p className="text-xs text-gray-500">
                    Example: {pattern.value}
                  </p>
                </div>
              </label>
            ))}
          </div>

          <Button
            size="sm"
            icon={<CheckCircleIcon className="h-4 w-4" />}
            onClick={handleSave}
            loading={saving}
            disabled={selectedPatterns.size === 0}
            className="w-full"
          >
            Save {selectedPatterns.size} Pattern{selectedPatterns.size !== 1 ? 's' : ''}
          </Button>
        </>
      )}

      {detectedPatterns.length === 0 && !detecting && (
        <p className="text-sm text-gray-500 text-center py-4">
          Click &quot;Detect with ML&quot; to find patterns in your data
        </p>
      )}
    </div>
  );
}