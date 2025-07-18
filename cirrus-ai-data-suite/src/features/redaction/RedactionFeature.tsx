import React, { useState, useEffect } from 'react';
import { Panel, Button, LoadingState } from '@/features/shared/components';
import { ShieldCheckIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Pattern } from '@/services/patternService';
import { PatternList } from './components/patterns/PatternList';

export function RedactionFeature() {
  const [loading, setLoading] = useState(true);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      const response = await fetch('/api/patterns');
      if (response.ok) {
        const data = await response.json();
        setPatterns(data);
      }
    } catch (error) {
      console.error('Error loading patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        <LoadingState message="Loading patterns..." />
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pattern Definition</h1>
          <p className="text-gray-600 mt-1">Define patterns to identify and redact sensitive data</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={<ShieldCheckIcon className="h-4 w-4" />}
          >
            Smart Detection
          </Button>
          <Button
            icon={<PlusIcon className="h-4 w-4" />}
          >
            New Pattern
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Panel title="Patterns" noPadding>
        <div className="p-4">
          <PatternList
            patterns={patterns}
            selectedPattern={selectedPattern}
            onSelectPattern={setSelectedPattern}
            onTogglePattern={() => {}} // Stub for now
            onDeletePattern={() => {}} // Stub for now
            category="all"
          />
        </div>
      </Panel>

      {/* Connected Data Sources section - to be implemented */}
      
      {/* Modals - to be implemented */}
    </div>
  );
}