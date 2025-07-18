import { useState, useEffect } from 'react';
import { 
  CheckCircleIcon,
  SparklesIcon,
  TrashIcon,
  ArrowPathIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface CatalogField {
  id: string;
  name: string;
  displayName: string;
  description: string;
  dataType: string;
  category: string;
  isRequired: boolean;
  isStandard: boolean;
  tags: string[];
}

interface CatalogCategory {
  id: string;
  name: string;
  displayName: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
}

interface FieldMapping {
  id: string;
  sourceId: string;
  sourceFieldName: string;
  catalogFieldId: string;
  confidence: number;
  isManual: boolean;
}

interface TransformationResult {
  success: boolean;
  transformedRecords: number;
  statistics?: {
    successfulRecords: number;
    failedRecords: number;
    unmappedFields: string[];
  };
  validationErrors?: Array<{
    recordIndex: number;
    field: string;
    value: unknown;
    errors: string[];
  }>;
  transformedData?: unknown[];
}

interface ConfirmationData {
  lastTransformationDate: string;
  recordCount: number;
  estimatedDuration: string;
}

interface MappingSuggestion {
  sourceFieldName: string;
  suggestedMappings: Array<{
    field: CatalogField;
    confidence: number;
    reason: string;
  }>;
}

interface FieldMappingInterfaceProps {
  sourceId: string;
  sourceName: string;
  sourceFields?: string[];
  onMappingsChanged?: () => void;
  onClose: () => void;
}

export default function FieldMappingInterface({ 
  sourceId, 
  sourceName, 
  sourceFields = [], 
  onMappingsChanged,
  onClose 
}: FieldMappingInterfaceProps) {
  const [catalogFields, setCatalogFields] = useState<CatalogField[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoMapping, setAutoMapping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actualSourceFields, setActualSourceFields] = useState<string[]>([]);
  const [selectedSourceField, setSelectedSourceField] = useState<string | null>(null);
  const [showCreateFieldModal, setShowCreateFieldModal] = useState(false);
  const [creatingField, setCreatingField] = useState(false);
  const [newFieldData, setNewFieldData] = useState({
    name: '',
    displayName: '',
    description: '',
    dataType: 'string',
    category: 'custom',
    isRequired: false,
    tags: [] as string[]
  });
  const [showTransformModal, setShowTransformModal] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [transformationResult, setTransformationResult] = useState<TransformationResult | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null);

  useEffect(() => {
    loadCatalogData();
    loadMappings();
    generateSuggestions();
  }, [sourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCatalogData = async () => {
    try {
      const response = await fetch('/api/catalog/fields');
      if (response.ok) {
        const data = await response.json();
        setCatalogFields(data.fields);
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error loading catalog data:', error);
    }
  };

  const loadMappings = async () => {
    try {
      const response = await fetch(`/api/catalog/mappings?sourceId=${sourceId}`);
      if (response.ok) {
        const data = await response.json();
        setMappings(data.mappings);
        
        // Add mapped field names to the actual fields list (they might not appear in suggestions since they're already mapped)
        const mappedFieldNames = data.mappings.map((m: FieldMapping) => m.sourceFieldName);
        setActualSourceFields(prev => {
          const combined = [...new Set([...prev, ...mappedFieldNames])];
          return combined;
        });
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async () => {
    try {
      const requestBody: { sourceId: string; sourceFields?: string[] } = { sourceId };
      
      // Only include sourceFields if it's a non-empty array
      if (sourceFields && sourceFields.length > 0) {
        requestBody.sourceFields = sourceFields;
      }
      
      const response = await fetch('/api/catalog/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
        setError(null);
        
        // Use the complete source fields list returned by the API
        if (data.sourceFields && Array.isArray(data.sourceFields)) {
          setActualSourceFields(prev => {
            // Combine API fields with any existing mapped fields
            const combined = [...new Set([...data.sourceFields, ...prev])];
            return combined;
          });
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to generate field mapping suggestions');
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      setError('Network error while generating suggestions');
      setSuggestions([]);
    }
  };

  const handleAutoMap = async () => {
    try {
      setAutoMapping(true);
      const requestBody: { sourceId: string; sourceFields?: string[]; autoMap: boolean } = { 
        sourceId, 
        autoMap: true 
      };
      
      // Only include sourceFields if it's a non-empty array
      if (sourceFields && sourceFields.length > 0) {
        requestBody.sourceFields = sourceFields;
      }
      
      const response = await fetch('/api/catalog/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        await loadMappings();
        await generateSuggestions();
        onMappingsChanged?.();
      }
    } catch (error) {
      console.error('Error auto-mapping:', error);
    } finally {
      setAutoMapping(false);
    }
  };

  const handleCreateMapping = async (sourceFieldName: string, catalogFieldId: string, confidence = 1.0) => {
    try {
      const response = await fetch('/api/catalog/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          sourceFieldName,
          catalogFieldId,
          confidence,
          isManual: true
        })
      });
      
      if (response.ok) {
        await loadMappings();
        await generateSuggestions();
        onMappingsChanged?.();
        // Clear selection after successful mapping
        setSelectedSourceField(null);
      }
    } catch (error) {
      console.error('Error creating mapping:', error);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      const response = await fetch(`/api/catalog/mappings/${mappingId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadMappings();
        await generateSuggestions();
        onMappingsChanged?.();
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
    }
  };

  const handleCreateNewField = async () => {
    if (!selectedSourceField) return;

    setCreatingField(true);
    try {
      // Create the new catalog field
      const response = await fetch('/api/catalog/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newFieldData,
          isStandard: false
        })
      });
      
      if (response.ok) {
        const createdField = await response.json();
        
        // Refresh catalog data
        await loadCatalogData();
        
        // Automatically create mapping to the selected source field
        await handleCreateMapping(selectedSourceField, createdField.id, 1.0);
        
        // Reset form and close modal
        resetNewFieldForm();
        setShowCreateFieldModal(false);
      }
    } catch (error) {
      console.error('Error creating new field:', error);
    } finally {
      setCreatingField(false);
    }
  };

  const resetNewFieldForm = () => {
    setNewFieldData({
      name: '',
      displayName: '',
      description: '',
      dataType: 'string',
      category: 'custom',
      isRequired: false,
      tags: []
    });
  };

  const openCreateFieldModal = () => {
    if (selectedSourceField) {
      // Pre-populate field name based on source field
      const cleanName = selectedSourceField.toLowerCase().replace(/[^a-z0-9]/g, '_');
      setNewFieldData(prev => ({
        ...prev,
        name: cleanName,
        displayName: selectedSourceField.split('_').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
      }));
    }
    setShowCreateFieldModal(true);
  };

  const handleApplyTransformation = async (forceRetransform = false) => {
    setTransforming(true);
    setTransformationResult(null);
    
    try {
      const response = await fetch(`/api/data-sources/${sourceId}/transform/apply-mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          forceRetransform,
          validateOnly: false,
          includeValidationDetails: true 
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Check if we need user confirmation for re-transformation
        if (result.requiresConfirmation && !forceRetransform) {
          setConfirmationData(result);
          setShowConfirmationModal(true);
          setTransforming(false);
          return;
        }
        
        setTransformationResult(result);
        if (result.success) {
          onMappingsChanged?.();
          // Don't auto-close, let user review results and close manually
        }
      } else {
        setError(result.error || 'Failed to apply transformation');
      }
    } catch (error) {
      console.error('Error applying transformation:', error);
      setError('Network error while applying transformation');
    } finally {
      setTransforming(false);
    }
  };

  const handleValidateTransformation = async () => {
    setTransforming(true);
    setTransformationResult(null);
    
    try {
      const response = await fetch(`/api/data-sources/${sourceId}/transform/apply-mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          validateOnly: true,
          includeValidationDetails: true 
        })
      });
      
      const result = await response.json();
      setTransformationResult(result);
      
      if (!response.ok) {
        setError(result.error || 'Failed to validate transformation');
      }
    } catch (error) {
      console.error('Error validating transformation:', error);
      setError('Network error while validating transformation');
    } finally {
      setTransforming(false);
    }
  };

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || 'bg-gray-100 text-gray-800';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const filteredCatalogFields = catalogFields.filter(field => {
    const matchesCategory = selectedCategory === 'all' || field.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      field.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getMappedFields = () => {
    const mappedFieldNames = new Set(mappings.map(m => m.sourceFieldName));
    return actualSourceFields.filter(field => mappedFieldNames.has(field));
  };

  const getUnmappedFields = () => {
    const mappedFieldNames = new Set(mappings.map(m => m.sourceFieldName));
    return actualSourceFields.filter(field => !mappedFieldNames.has(field));
  };

  const getSuggestionForField = (fieldName: string) => {
    return suggestions.find(s => s.sourceFieldName === fieldName);
  };

  const DATA_TYPES = [
    { value: 'string', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'date', label: 'Date' },
    { value: 'datetime', label: 'DateTime' },
    { value: 'email', label: 'Email' },
    { value: 'url', label: 'URL' },
    { value: 'enum', label: 'Enum (List)' },
    { value: 'array', label: 'Array' },
    { value: 'object', label: 'Object' }
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl border-2 border-gray-600 max-w-6xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading field mapping interface...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl border-2 border-gray-600 max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Field Mapping</h2>
              <p className="text-sm text-gray-600 mt-1">Map {sourceName} fields to global catalog</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAutoMap}
                disabled={autoMapping}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {autoMapping ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <SparklesIcon className="h-4 w-4" />
                )}
                Auto Map
              </button>
              
              {getMappedFields().length > 0 && (
                <button
                  onClick={() => setShowTransformModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                  Apply Transformation
                </button>
              )}
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
          
          {/* Stats */}
          <div className="mt-4 grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">{actualSourceFields.length}</div>
              <div className="text-xs text-gray-500">Total Fields</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">{getMappedFields().length}</div>
              <div className="text-xs text-gray-500">Mapped</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-orange-600">{getUnmappedFields().length}</div>
              <div className="text-xs text-gray-500">Unmapped</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">{suggestions.length}</div>
              <div className="text-xs text-gray-500">Suggestions</div>
            </div>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <div className="text-sm font-medium text-red-800">Field Mapping Error</div>
                  <div className="text-sm text-red-700">{error}</div>
                  {error.includes('No source fields provided and no transformed data available') && (
                    <div className="text-xs text-red-600 mt-1">
                      Please transform this data source first to enable field mapping.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Source Fields Panel */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Source Fields</h3>
              <p className="text-sm text-gray-600">{sourceName}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Mapped Fields */}
              {getMappedFields().length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-700 mb-2">Mapped Fields</h4>
                  {getMappedFields().map(fieldName => {
                    const mapping = mappings.find(m => m.sourceFieldName === fieldName);
                    const catalogField = catalogFields.find(f => f.id === mapping?.catalogFieldId);
                    return (
                      <div key={fieldName} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{fieldName}</div>
                            <div className="text-sm text-gray-600">
                              → {catalogField?.displayName}
                            </div>
                            <div className={`text-xs ${getConfidenceColor(mapping?.confidence || 0)}`}>
                              {Math.round((mapping?.confidence || 0) * 100)}% confidence
                            </div>
                          </div>
                          <button
                            onClick={() => mapping && handleDeleteMapping(mapping.id)}
                            className="p-1 text-red-400 hover:text-red-600 transition-colors"
                            title="Remove mapping"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Unmapped Fields */}
              {getUnmappedFields().length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-orange-700 mb-2">Unmapped Fields</h4>
                  {getUnmappedFields().map(fieldName => {
                    const suggestion = getSuggestionForField(fieldName);
                    const topSuggestion = suggestion?.suggestedMappings[0];
                    const isSelected = selectedSourceField === fieldName;
                    
                    return (
                      <div 
                        key={fieldName} 
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
                            : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                        }`}
                        onClick={() => setSelectedSourceField(isSelected ? null : fieldName)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900">{fieldName}</div>
                          {isSelected && (
                            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Selected for mapping
                            </div>
                          )}
                        </div>
                        {topSuggestion && (
                          <div className="mt-2 space-y-1">
                            <div className="text-sm text-gray-800 font-medium">Suggested:</div>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{topSuggestion.field.displayName}</div>
                                <div className="text-xs text-gray-700">{topSuggestion.reason}</div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCreateMapping(fieldName, topSuggestion.field.id, topSuggestion.confidence);
                                }}
                                className="p-1 text-blue-500 hover:text-blue-700 transition-colors"
                                title="Apply suggestion"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Catalog Fields Panel */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Catalog Fields</h3>
                <div className="flex items-center gap-3">
                  {selectedSourceField && (
                    <button
                      onClick={openCreateFieldModal}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                      title={`Create new catalog field for ${selectedSourceField}`}
                    >
                      <PlusIcon className="h-4 w-4" />
                      Create Field
                    </button>
                  )}
                  {selectedSourceField && (
                    <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">
                      Mapping: <span className="font-medium">{selectedSourceField}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedSourceField ? (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-blue-900">
                        Click a catalog field below to create a manual mapping
                      </div>
                      <div className="text-xs text-blue-700">
                        Source field &quot;{selectedSourceField}&quot; is selected
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedSourceField(null)}
                      className="text-blue-400 hover:text-blue-600 transition-colors"
                      title="Cancel selection"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : getUnmappedFields().length > 0 && (
                <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="text-sm text-gray-700">
                    <strong>Manual Mapping:</strong> Click an unmapped source field (left panel) to select it, 
                    then click a catalog field below to create a mapping.
                  </div>
                </div>
              )}
              
              {/* Filters */}
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Search fields..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-2 py-1 text-xs rounded ${
                      selectedCategory === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    All ({catalogFields.length})
                  </button>
                  {categories.map(category => (
                    <button
                      key={category.name}
                      onClick={() => setSelectedCategory(category.name)}
                      className={`px-2 py-1 text-xs rounded ${
                        selectedCategory === category.name ? category.color : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {category.displayName} ({catalogFields.filter(f => f.category === category.name).length})
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-3">
                {filteredCatalogFields.map(field => {
                  const isAlreadyMapped = mappings.some(m => m.catalogFieldId === field.id);
                  const canMap = selectedSourceField && !isAlreadyMapped;
                  
                  return (
                    <div 
                      key={field.id} 
                      className={`bg-white border rounded-lg p-3 transition-all ${
                        canMap 
                          ? 'border-blue-300 hover:border-blue-400 hover:shadow-md cursor-pointer' 
                          : isAlreadyMapped 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-gray-200 hover:shadow-sm'
                      }`}
                      onClick={() => canMap && handleCreateMapping(selectedSourceField, field.id, 1.0)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{field.displayName}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getCategoryColor(field.category)}`}>
                              {field.category}
                            </span>
                            {field.isRequired && (
                              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                                Required
                              </span>
                            )}
                            {isAlreadyMapped && (
                              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                Mapped
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mb-1">{field.name}</div>
                          <div className="text-xs text-gray-500">{field.description}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            Type: {field.dataType} | Tags: {field.tags.join(', ')}
                          </div>
                        </div>
                        {canMap && (
                          <div className="ml-2 flex items-center">
                            <button
                              className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
                              title={`Map ${selectedSourceField} to ${field.displayName}`}
                            >
                              <PlusIcon className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Create New Field Modal */}
        {showCreateFieldModal && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-gray-600">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Create New Catalog Field
                </h2>
                {selectedSourceField && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-900">
                      Creating field for source: <span className="font-medium">{selectedSourceField}</span>
                    </div>
                    <div className="text-xs text-blue-700 mt-1">
                      Field will be automatically mapped after creation
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Field Name (snake_case)
                      </label>
                      <input
                        type="text"
                        value={newFieldData.name}
                        onChange={(e) => setNewFieldData({ ...newFieldData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="field_name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={newFieldData.displayName}
                        onChange={(e) => setNewFieldData({ ...newFieldData, displayName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Field Name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newFieldData.description}
                      onChange={(e) => setNewFieldData({ ...newFieldData, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Describe the purpose of this field..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data Type
                      </label>
                      <select
                        value={newFieldData.dataType}
                        onChange={(e) => setNewFieldData({ ...newFieldData, dataType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        {DATA_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={newFieldData.category}
                        onChange={(e) => setNewFieldData({ ...newFieldData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.displayName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newFieldData.tags.join(', ')}
                      onChange={(e) => setNewFieldData({ 
                        ...newFieldData, 
                        tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="custom, business-specific"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isRequired"
                      checked={newFieldData.isRequired}
                      onChange={(e) => setNewFieldData({ ...newFieldData, isRequired: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isRequired" className="ml-2 text-sm text-gray-700">
                      Required field
                    </label>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateFieldModal(false);
                      resetNewFieldForm();
                    }}
                    disabled={creatingField}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateNewField}
                    disabled={creatingField || !newFieldData.name || !newFieldData.displayName}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {creatingField ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-4 w-4" />
                        Create & Map Field
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Apply Transformation Modal */}
        {showTransformModal && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-gray-600">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Apply Field Transformations
                </h2>
                
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-900 mb-2">
                    <strong>Transformation Process:</strong>
                  </div>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Convert source field names to catalog field names</li>
                    <li>• Apply validation rules from catalog field definitions</li>
                    <li>• Generate AI/Analytics-ready standardized data</li>
                    <li>• Preserve original data for audit purposes</li>
                  </ul>
                </div>

                {/* Transformation Statistics */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">{getMappedFields().length}</div>
                    <div className="text-sm text-green-600">Fields Mapped</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-700">{getUnmappedFields().length}</div>
                    <div className="text-sm text-orange-600">Fields Unmapped</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">{actualSourceFields.length}</div>
                    <div className="text-sm text-blue-600">Total Records</div>
                  </div>
                </div>

                {/* Validation Results */}
                {transformationResult && (
                  <div className="mb-6 p-4 border rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      {transformationResult.success ? 'Validation Passed' : 'Validation Issues Found'}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {transformationResult.statistics?.successfulRecords || 0}
                        </div>
                        <div className="text-sm text-gray-600">Successful Records</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600">
                          {transformationResult.statistics?.failedRecords || 0}
                        </div>
                        <div className="text-sm text-gray-600">Records with Errors</div>
                      </div>
                    </div>

                    {transformationResult.validationErrors && transformationResult.validationErrors.length > 0 && (
                      <div className="max-h-40 overflow-y-auto">
                        <h4 className="font-medium text-red-800 mb-2">Validation Errors:</h4>
                        <div className="space-y-2">
                          {transformationResult.validationErrors.slice(0, 10).map((error, index: number) => (
                            <div key={index} className="text-sm bg-red-50 p-2 rounded border border-red-200">
                              <strong>Record {error.recordIndex + 1}, Field &quot;{error.field}&quot;:</strong>
                              <div className="text-red-700">
                                Value: {JSON.stringify(error.value)} - {error.errors.join(', ')}
                              </div>
                            </div>
                          ))}
                          {transformationResult.validationErrors.length > 10 && (
                            <div className="text-sm text-gray-600">
                              ... and {transformationResult.validationErrors.length - 10} more errors
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {transformationResult.statistics?.unmappedFields && transformationResult.statistics.unmappedFields.length > 0 && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <h4 className="font-medium text-yellow-800 mb-2">Unmapped Fields:</h4>
                        <div className="text-sm text-yellow-700">
                          {transformationResult.statistics.unmappedFields.join(', ')}
                        </div>
                        <div className="text-xs text-yellow-600 mt-1">
                          These fields will be preserved with original names
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <div className="flex gap-3">
                    <button
                      onClick={handleValidateTransformation}
                      disabled={transforming}
                      className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50 flex items-center gap-2"
                    >
                      {transforming ? (
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircleIcon className="h-4 w-4" />
                      )}
                      Validate Only
                    </button>
                  </div>
                  
                  <div className="flex gap-3">
                    {transformationResult?.success ? (
                      // Show only "Done" button when transformation is complete
                      <button
                        onClick={() => {
                          setShowTransformModal(false);
                          setTransformationResult(null);
                        }}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        Done
                      </button>
                    ) : (
                      // Show Cancel and Apply buttons during transformation process
                      <>
                        <button
                          onClick={() => {
                            setShowTransformModal(false);
                            setTransformationResult(null);
                          }}
                          disabled={transforming}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleApplyTransformation(false)}
                          disabled={transforming}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          {transforming ? (
                            <>
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                              Transforming...
                            </>
                          ) : (
                            <>
                              <ArrowPathIcon className="h-4 w-4" />
                              Apply Transformation
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Re-transformation Confirmation Modal */}
        {showConfirmationModal && confirmationData && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full border-2 border-gray-600">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Confirm Re-transformation
                </h2>
                
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div className="text-sm font-medium text-yellow-800">
                      Existing transformation detected
                    </div>
                  </div>
                  <div className="text-sm text-yellow-700">
                    This data source has already been transformed on{' '}
                    <span className="font-medium">
                      {new Date(confirmationData.lastTransformationDate).toLocaleString()}
                    </span>
                    . Re-transforming will overwrite the existing data.
                  </div>
                </div>

                <div className="mb-6 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-lg font-bold text-blue-700">
                        {confirmationData.recordCount?.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-blue-600">Records to process</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <div className="text-lg font-bold text-orange-700">
                        {confirmationData.estimatedDuration || 'Unknown'}
                      </div>
                      <div className="text-sm text-orange-600">Estimated time</div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <strong>What will happen:</strong>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      <li>Apply current field mappings to all records</li>
                      <li>Validate data according to catalog field rules</li>
                      <li>Replace existing transformed data</li>
                      <li>Generate validation error report if needed</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowConfirmationModal(false);
                      setConfirmationData(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmationModal(false);
                      setConfirmationData(null);
                      handleApplyTransformation(true); // Force re-transformation
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Proceed with Re-transformation
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}