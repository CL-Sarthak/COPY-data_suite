import React, { useState, useEffect } from 'react';
import { HybridPatternService, HybridMatch, HybridDetectionResult } from '@/services/hybridPatternService';
import { AlertCircle, CheckCircle, XCircle, Database, FileText, Network, Users } from 'lucide-react';
import { ClusterPatternDetector } from './ClusterPatternDetector';
import { SensitivePattern } from '@/types';

interface Props {
  text: string;
  onPatternSelect?: (pattern: string, examples: string[], isCluster?: boolean, clusterFields?: string[]) => void;
}

export function ContextAwarePatternDetector({ text, onPatternSelect }: Props) {
  const [detectionResult, setDetectionResult] = useState<HybridDetectionResult | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{
    pattern: string;
    matches: HybridMatch[];
    totalConfidence: number;
  }>>([]);
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [showRelationships, setShowRelationships] = useState(true);
  const [structuredData, setStructuredData] = useState<Record<string, unknown> | null>(null);
  
  useEffect(() => {
    const hybridService = new HybridPatternService();
    if (text) {
      // Try to parse as JSON for structured data detection
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === 'object' && parsed !== null) {
          setStructuredData(parsed);
        }
      } catch {
        // Not JSON, continue with regular text analysis
        setStructuredData(null);
      }

      const result = hybridService.detectPatternsWithRelationships(text);
      
      // Group matches by pattern name
      const groupedMatches = result.matches.reduce((groups, match) => {
        if (!groups[match.patternName]) {
          groups[match.patternName] = [];
        }
        groups[match.patternName].push(match);
        return groups;
      }, {} as Record<string, HybridMatch[]>);
      
      // Create suggestions with confidence scores
      const patternSuggestions = Object.entries(groupedMatches).map(([pattern, matches]) => ({
        pattern,
        matches,
        totalConfidence: matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
      })).sort((a, b) => b.totalConfidence - a.totalConfidence);
      
      setDetectionResult(result);
      setSuggestions(patternSuggestions);
    }
  }, [text]);

  const toggleMatch = (matchKey: string) => {
    const newSelected = new Set(selectedMatches);
    if (newSelected.has(matchKey)) {
      newSelected.delete(matchKey);
    } else {
      newSelected.add(matchKey);
    }
    setSelectedMatches(newSelected);
  };

  const acceptPattern = (patternName: string) => {
    if (!detectionResult) return;
    
    const patternMatches = detectionResult.matches.filter(m => m.patternName === patternName);
    const examples = patternMatches
      .filter(m => selectedMatches.has(`${m.startIndex}-${m.endIndex}`))
      .map(m => m.value);
    
    if (onPatternSelect && examples.length > 0) {
      onPatternSelect(patternName, examples);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4" />;
    if (confidence >= 0.6) return <AlertCircle className="w-4 h-4" />;
    return <XCircle className="w-4 h-4" />;
  };

  const getMethodIcon = (method: string) => {
    return method === 'field-aware' ? 
      <Database className="w-4 h-4 text-blue-600" /> : 
      <FileText className="w-4 h-4 text-purple-600" />;
  };

  if (!text || !detectionResult || detectionResult.matches.length === 0) {
    return (
      <div className="text-center py-8 text-gray-700">
        No sensitive patterns detected in the current text.
      </div>
    );
  }

  const { matches, relationships, stats } = detectionResult;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Detection Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Total Matches:</span> <span className="font-semibold text-gray-900">{stats.total}</span>
          </div>
          <div>
            <span className="text-blue-700">Avg Confidence:</span> <span className="font-semibold text-gray-900">{Math.round(stats.averageConfidence * 100)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-blue-700">Field-Aware:</span> <span className="font-semibold text-gray-900">{stats.fieldAware}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4 text-purple-600" />
            <span className="text-blue-700">Context-Aware:</span> <span className="font-semibold text-gray-900">{stats.contextAware}</span>
          </div>
          {stats.relationships.totalRelationships > 0 && (
            <>
              <div className="flex items-center gap-1">
                <Network className="w-4 h-4 text-green-600" />
                <span className="text-blue-700">Relationships:</span> <span className="font-semibold text-gray-900">{stats.relationships.totalRelationships}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-blue-700">Related Fields:</span> <span className="font-semibold text-gray-900">{stats.relationships.totalRelatedFields}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Field Relationships Section */}
      {relationships.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-green-600" />
              <h3 className="text-sm font-medium text-green-900">Field Relationships Detected</h3>
            </div>
            <button
              onClick={() => setShowRelationships(!showRelationships)}
              className="text-xs text-green-700 hover:text-green-900 transition-colors"
            >
              {showRelationships ? 'Hide' : 'Show'} ({relationships.length})
            </button>
          </div>
          
          {showRelationships && (
            <div className="space-y-3">
              {relationships.map((relationship, index) => (
                <div key={index} className="bg-white rounded-lg border border-green-200 p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-green-900">
                        {relationship.relatedFields[0]?.relationship.name || 'Related Fields'}
                      </h4>
                      <p className="text-xs text-green-700">
                        Primary: {relationship.primaryMatch.patternName} • {relationship.totalRelatedCount} related fields
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-green-600">
                      <span className="text-xs font-medium">
                        {Math.round(relationship.relationshipConfidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded text-xs">
                        PRIMARY
                      </span>
                      <span className="font-mono text-gray-900">{relationship.primaryMatch.fieldName}: {relationship.primaryMatch.value}</span>
                    </div>
                    
                    {relationship.relatedFields.slice(0, 3).map((relatedField, rfIndex) => (
                      <div key={rfIndex} className="flex items-center gap-2 text-sm ml-4">
                        <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs">
                          RELATED
                        </span>
                        <span className="font-mono text-gray-900">{relatedField.fieldName}</span>
                        {relatedField.suggestedPattern && (
                          <span className="text-xs text-gray-700">({relatedField.suggestedPattern})</span>
                        )}
                        <span className="text-xs text-green-600">
                          {Math.round(relatedField.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                    
                    {relationship.totalRelatedCount > 3 && (
                      <div className="text-xs text-gray-700 ml-4">
                        ... and {relationship.totalRelatedCount - 3} more related fields
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2 text-xs text-green-700 bg-green-100 rounded p-2">
                    <strong>Category:</strong> {relationship.relatedFields[0]?.relationship.category} • 
                    <strong> Priority:</strong> {relationship.relatedFields[0]?.relationship.priority}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cluster Patterns Section */}
      {structuredData && (
        <ClusterPatternDetector
          data={structuredData}
          onClusterSelect={(patterns) => {
            // Convert cluster patterns to regular pattern selection with cluster metadata
            if (patterns.length > 0 && onPatternSelect) {
              patterns.forEach((pattern) => {
                // Check if pattern has cluster fields (cast to check extended type)
                const clusterPattern = pattern as SensitivePattern & { isCluster?: boolean; clusterFields?: string[] };
                if (clusterPattern.isCluster && clusterPattern.clusterFields) {
                  onPatternSelect(pattern.label, pattern.examples, true, clusterPattern.clusterFields);
                } else {
                  onPatternSelect(pattern.label, pattern.examples);
                }
              });
            }
          }}
          onCreateCluster={(cluster) => {
            // Create a new pattern from the custom cluster
            if (onPatternSelect) {
              const examples = cluster.fields.map(f => f.fieldName);
              const clusterFields = cluster.fields.map(f => f.fieldName);
              onPatternSelect(cluster.name, examples, true, clusterFields);
            }
          }}
        />
      )}
      
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Detected Patterns ({matches.length} potential matches)
        </h3>
        
        <div className="space-y-4">
          {suggestions.map(({ pattern, matches: patternMatches, totalConfidence }) => (
            <div key={pattern} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{pattern}</h4>
                  <p className="text-sm text-gray-700">
                    {patternMatches.length} match{patternMatches.length !== 1 ? 'es' : ''} found
                  </p>
                </div>
                <div className={`flex items-center gap-1 ${getConfidenceColor(totalConfidence)}`}>
                  {getConfidenceIcon(totalConfidence)}
                  <span className="text-sm font-medium">
                    {Math.round(totalConfidence * 100)}% confidence
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 mb-3">
                {patternMatches.slice(0, 5).map((match) => {
                  const matchKey = `${match.startIndex}-${match.endIndex}`;
                  const confidence = match.confidence;
                  const isSelected = selectedMatches.has(matchKey);
                  
                  return (
                    <div
                      key={matchKey}
                      className={`border rounded p-3 cursor-pointer transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => toggleMatch(matchKey)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-mono mb-1">
                            {match.method === 'field-aware' && match.fieldName ? (
                              <>
                                <span className="text-gray-700 font-medium">{match.fieldName}:</span>
                                <span className="ml-2 font-semibold text-blue-600 bg-blue-100 px-1 rounded">
                                  {match.value}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-gray-700">...</span>
                                <span className="text-gray-800">{match.context?.slice(0, 30) || ''}</span>
                                <span className="font-semibold text-blue-600 bg-blue-100 px-1 rounded">
                                  {match.value}
                                </span>
                                <span className="text-gray-800">{match.context?.slice(-30) || ''}</span>
                                <span className="text-gray-700">...</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-700 mt-1">
                            <div className="flex items-center gap-1">
                              {getMethodIcon(match.method)}
                              <span className="capitalize">{match.method.replace('-', ' ')}</span>
                            </div>
                            <span className={getConfidenceColor(confidence)}>
                              {Math.round(confidence * 100)}% confidence
                            </span>
                            <span className="text-gray-700" title={match.reason}>
                              {match.reason.length > 40 ? match.reason.slice(0, 40) + '...' : match.reason}
                            </span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMatch(matchKey)}
                          onClick={(e) => e.stopPropagation()}
                          className="ml-3 mt-1"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {patternMatches.length > 5 && (
                <p className="text-sm text-gray-700 mb-3">
                  ... and {patternMatches.length - 5} more matches
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <span>Methods used:</span>
                  {patternMatches.some(m => m.method === 'field-aware') && (
                    <div className="flex items-center gap-1">
                      <Database className="w-3 h-3 text-blue-600" />
                      <span>Field-aware</span>
                    </div>
                  )}
                  {patternMatches.some(m => m.method === 'context-aware') && (
                    <div className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-purple-600" />
                      <span>Context-aware</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => acceptPattern(pattern)}
                  disabled={!patternMatches.some(m => selectedMatches.has(`${m.startIndex}-${m.endIndex}`))}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Add Selected as {pattern} Pattern
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">How Hybrid Detection Works</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <div className="flex items-center gap-1 mb-2">
              <Database className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-gray-900">Field-Aware Detection</span>
            </div>
            <ul className="space-y-1 ml-5">
              <li>• Recognizes structured data (field: value format)</li>
              <li>• Uses field names to determine data type</li>
              <li>• Very high confidence for exact field matches</li>
              <li>• Eliminates false positives in wrong fields</li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-2">
              <FileText className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-gray-900">Context-Aware Detection</span>
            </div>
            <ul className="space-y-1 ml-5">
              <li>• Analyzes unstructured text content</li>
              <li>• Uses surrounding context for validation</li>
              <li>• Applies format rules and checksums</li>
              <li>• Best for documents and free-form text</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}