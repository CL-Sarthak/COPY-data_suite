import { useState, useEffect } from 'react';
import { 
  LinkIcon, 
  TagIcon,
  QuestionMarkCircleIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';

interface SchemaAnalysis {
  sourceId: string;
  sourceName: string;
  originalSchema: {
    fields: Array<{
      name: string;
      type: string;
      nullable: boolean;
      examples: unknown[];
    }>;
  };
  normalizedSchema: {
    fields: Array<{
      normalizedName: string;
      originalNames: string[];
      dataType: string;
      category: string;
      sources: string[];
      confidence: number;
    }>;
    mappings: Record<string, Array<{
      sourceField: string;
      targetField: string;
      confidence: number;
      reason: string;
    }>>;
  };
  relationships: Array<{
    field1: string;
    field2: string;
    type: string;
    confidence: number;
  }>;
  analysis: {
    totalFields: number;
    normalizedFields: number;
    customFields: number;
    categories: string[];
  };
}

interface SchemaAnalyzerProps {
  dataSourceId: string;
  dataSourceName: string;
  onClose: () => void;
}

export default function SchemaAnalyzer({ dataSourceId, dataSourceName, onClose }: SchemaAnalyzerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schemaAnalysis, setSchemaAnalysis] = useState<SchemaAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'fields' | 'mappings' | 'relationships'>('fields');

  useEffect(() => {
    loadSchemaAnalysis();
  }, [dataSourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSchemaAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/data-sources/${dataSourceId}/schema`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze schema');
      }
      
      const data = await response.json();
      
      // Check if it's the full analysis or just basic schema
      if (data.normalizedSchema) {
        setSchemaAnalysis(data);
      } else {
        setError(data.message || 'Please transform this data source first for full analysis');
      }
    } catch (err) {
      console.error('Error loading schema analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schema analysis');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'personal': return 'bg-blue-100 text-blue-800';
      case 'contact': return 'bg-green-100 text-green-800';
      case 'location': return 'bg-purple-100 text-purple-800';
      case 'financial': return 'bg-red-100 text-red-800';
      case 'temporal': return 'bg-yellow-100 text-yellow-800';
      case 'identifier': return 'bg-indigo-100 text-indigo-800';
      case 'metadata': return 'bg-gray-100 text-gray-800';
      case 'custom': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl border-2 border-gray-600 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Schema Analysis</h2>
              <p className="text-sm text-gray-600 mt-1">{dataSourceName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Analyzing schema...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <QuestionMarkCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">{error}</p>
              </div>
            </div>
          ) : schemaAnalysis ? (
            <>
              {/* Stats */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Fields</p>
                    <p className="text-xl font-semibold text-gray-900">{schemaAnalysis.analysis.totalFields}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Normalized Fields</p>
                    <p className="text-xl font-semibold text-green-600">{schemaAnalysis.analysis.normalizedFields}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Custom Fields</p>
                    <p className="text-xl font-semibold text-orange-600">{schemaAnalysis.analysis.customFields}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Categories</p>
                    <p className="text-xl font-semibold text-blue-600">{schemaAnalysis.analysis.categories.length}</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-6 border-b border-gray-200">
                <div className="flex gap-6">
                  <button
                    onClick={() => setActiveTab('fields')}
                    className={`py-3 border-b-2 transition-colors ${
                      activeTab === 'fields'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <TagIcon className="h-5 w-5" />
                      <span>Normalized Fields</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('mappings')}
                    className={`py-3 border-b-2 transition-colors ${
                      activeTab === 'mappings'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowsRightLeftIcon className="h-5 w-5" />
                      <span>Field Mappings</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('relationships')}
                    className={`py-3 border-b-2 transition-colors ${
                      activeTab === 'relationships'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5" />
                      <span>Relationships</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-auto p-6">
                {activeTab === 'fields' && (
                  <div className="space-y-4">
                    {schemaAnalysis.normalizedSchema.fields.map((field, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">{field.normalizedName}</h4>
                            <p className="text-sm text-gray-600">{field.dataType}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(field.category)}`}>
                              {field.category}
                            </span>
                            <span className={`text-sm font-medium ${getConfidenceColor(field.confidence)}`}>
                              {Math.round(field.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                        {field.originalNames.length > 1 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">Original names:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {field.originalNames.map((name, i) => (
                                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'mappings' && (
                  <div className="space-y-6">
                    {Object.entries(schemaAnalysis.normalizedSchema.mappings).map(([sourceId, mappings]) => (
                      <div key={sourceId}>
                        <h4 className="font-medium text-gray-900 mb-3">Source: {sourceId}</h4>
                        <div className="space-y-2">
                          {mappings.map((mapping, index) => (
                            <div key={index} className="flex items-center gap-4 bg-gray-50 rounded-lg p-3">
                              <span className="text-sm text-gray-700">{mapping.sourceField}</span>
                              <ArrowsRightLeftIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm font-medium text-gray-900">{mapping.targetField}</span>
                              <span className={`text-sm ${getConfidenceColor(mapping.confidence)}`}>
                                {Math.round(mapping.confidence * 100)}%
                              </span>
                              <span className="text-xs text-gray-500 flex-1 text-right">{mapping.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'relationships' && (
                  <div className="space-y-4">
                    {schemaAnalysis.relationships.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No relationships detected</p>
                    ) : (
                      schemaAnalysis.relationships.map((rel, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center gap-4">
                            <span className="font-medium text-gray-900">{rel.field1}</span>
                            <div className="flex items-center gap-2 text-gray-500">
                              <LinkIcon className="h-4 w-4" />
                              <span className="text-sm">{rel.type}</span>
                            </div>
                            <span className="font-medium text-gray-900">{rel.field2}</span>
                            <span className={`text-sm ml-auto ${getConfidenceColor(rel.confidence)}`}>
                              {Math.round(rel.confidence * 100)}% confidence
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}