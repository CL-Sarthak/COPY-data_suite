'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, TrendingUp, ChevronRight, Lightbulb } from 'lucide-react';
import { PatternEntity } from '@/entities/PatternEntity';
import { PatternAccuracyMetrics } from '@/services/patternFeedbackService';

interface RefinementSuggestion {
  suggestedRegex?: string;
  excludePatterns?: string[];
  confidenceAdjustment?: number;
  reasoning: string[];
}

interface PatternWithMetrics {
  pattern: PatternEntity;
  metrics: PatternAccuracyMetrics;
}

export function PatternRefinementSuggestions() {
  const [patternsNeedingRefinement, setPatternsNeedingRefinement] = useState<PatternWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, RefinementSuggestion>>({});

  useEffect(() => {
    fetchPatternsNeedingRefinement();
  }, []);

  const fetchPatternsNeedingRefinement = async () => {
    try {
      const response = await fetch('/api/patterns/feedback/refinements');
      if (response.ok) {
        const data = await response.json();
        setPatternsNeedingRefinement(data.patterns);
      }
    } catch (error) {
      console.error('Error fetching patterns needing refinement:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async (patternId: string) => {
    try {
      const response = await fetch(`/api/patterns/feedback/refinements?patternId=${patternId}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(prev => ({ ...prev, [patternId]: data }));
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const applyRefinements = async (patternId: string, refinements: RefinementSuggestion) => {
    try {
      const response = await fetch('/api/patterns/feedback/refinements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId, refinements }),
      });

      if (response.ok) {
        // Refresh the list
        fetchPatternsNeedingRefinement();
        setSuggestions(prev => {
          const updated = { ...prev };
          delete updated[patternId];
          return updated;
        });
        setSelectedPattern(null);
      }
    } catch (error) {
      console.error('Error applying refinements:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading pattern improvement suggestions...
      </div>
    );
  }

  if (patternsNeedingRefinement.length === 0) {
    return (
      <div className="p-6 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center space-x-2 text-green-800">
          <TrendingUp className="h-5 w-5" />
          <span className="font-medium">All patterns are performing well!</span>
        </div>
        <p className="text-sm text-green-700 mt-1">
          No patterns currently need refinement based on user feedback.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900">Pattern Improvement Suggestions</h3>
            <p className="text-sm text-yellow-800 mt-1">
              The following patterns have accuracy below 70% based on user feedback and may benefit from refinement.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {patternsNeedingRefinement.map(({ pattern, metrics }) => (
          <div key={pattern.id} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => {
                if (selectedPattern === pattern.id) {
                  setSelectedPattern(null);
                } else {
                  setSelectedPattern(pattern.id);
                  if (!suggestions[pattern.id]) {
                    fetchSuggestions(pattern.id);
                  }
                }
              }}
              className="w-full px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ChevronRight
                    className={`h-4 w-4 text-gray-400 transition-transform ${
                      selectedPattern === pattern.id ? 'rotate-90' : ''
                    }`}
                  />
                  <span className="font-medium text-gray-900">{pattern.name}</span>
                  <span className="text-sm text-gray-500">
                    {Math.round(metrics.precision * 100)}% accuracy
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-green-600">👍 {metrics.positiveFeedback}</span>
                  <span className="text-red-600">👎 {metrics.negativeFeedback}</span>
                </div>
              </div>
            </button>

            {selectedPattern === pattern.id && (
              <div className="border-t bg-gray-50 p-4">
                {!suggestions[pattern.id] ? (
                  <div className="text-center text-gray-500">Loading suggestions...</div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <h4 className="font-medium text-gray-900">Improvement Suggestions:</h4>
                        {suggestions[pattern.id].reasoning.map((reason, idx) => (
                          <p key={idx} className="text-sm text-gray-700">• {reason}</p>
                        ))}
                      </div>
                    </div>

                    {suggestions[pattern.id].excludePatterns && (
                      <div className="bg-white rounded border p-3">
                        <p className="text-sm font-medium text-gray-900 mb-2">
                          Recommended exclusions:
                        </p>
                        <div className="space-y-1">
                          {suggestions[pattern.id].excludePatterns!.map((text, idx) => (
                            <code key={idx} className="block text-xs bg-gray-100 px-2 py-1 rounded">
                              {text}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        onClick={() => setSelectedPattern(null)}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => applyRefinements(pattern.id, suggestions[pattern.id])}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Apply Refinements
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}