import React, { useState, useEffect } from 'react';
import { useTransformedPreview } from '@/hooks/useTransformedPreview';
import { FieldAnnotationModal } from './FieldAnnotationModal';
import { FieldAnnotationBadge } from './FieldAnnotationBadge';
import { TagIcon } from '@heroicons/react/24/outline';

interface FieldAnnotation {
  id: string;
  dataSourceId: string;
  fieldPath: string;
  fieldName: string;
  semanticType?: string;
  isPII: boolean;
  piiType?: string;
  sensitivityLevel?: string;
  tags?: string[];
  description?: string;
}

interface FieldAnnotatedPreviewProps {
  sourceId: string;
}

export function FieldAnnotatedPreview({ sourceId }: FieldAnnotatedPreviewProps) {
  const { previewData, loading, error, viewMode, setViewMode } = useTransformedPreview(sourceId);
  const [annotations, setAnnotations] = useState<Record<string, FieldAnnotation>>({});
  const [selectedField, setSelectedField] = useState<{ path: string; name: string; sampleValues: string[] } | null>(null);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [loadingAnnotations, setLoadingAnnotations] = useState(true);

  // Load existing annotations
  useEffect(() => {
    const fetchAnnotations = async () => {
      try {
        const response = await fetch(`/api/field-annotations?dataSourceId=${sourceId}`);
        if (response.ok) {
          const data = await response.json();
          const annotationMap: Record<string, FieldAnnotation> = {};
          data.forEach((annotation: FieldAnnotation) => {
            annotationMap[annotation.fieldPath] = annotation;
          });
          setAnnotations(annotationMap);
        }
      } catch (err) {
        console.error('Failed to load field annotations:', err);
      } finally {
        setLoadingAnnotations(false);
      }
    };

    fetchAnnotations();
  }, [sourceId]);

  const handleFieldClick = (fieldPath: string, fieldName: string, sampleValues: string[]) => {
    setSelectedField({ path: fieldPath, name: fieldName, sampleValues });
    setShowAnnotationModal(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaveAnnotation = async (annotation: any) => {
    try {
      const response = await fetch('/api/field-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(annotation)
      });

      if (response.ok) {
        const savedAnnotation = await response.json();
        setAnnotations(prev => ({
          ...prev,
          [annotation.fieldPath]: savedAnnotation
        }));
      }
    } catch (err) {
      console.error('Failed to save annotation:', err);
    }
  };


  if (loading || loadingAnnotations) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-blue-600 font-medium">
          📊 Loading annotated data preview...
        </div>
        <div className="animate-pulse bg-gray-200 h-16 rounded"></div>
      </div>
    );
  }

  if (error || !previewData) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-red-600 font-medium">
          ⚠️ Unable to load data preview
        </div>
      </div>
    );
  }

  const previewRecords = previewData.records?.slice(0, 2) || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractSampleValues = (records: any[], fieldPath: string): string[] => {
    const values = new Set<string>();
    records.forEach(record => {
      const recordData = record.data || record;
      const value = recordData[fieldPath];
      if (value !== null && value !== undefined && !Array.isArray(value) && typeof value !== 'object') {
        values.add(String(value));
      }
    });
    return Array.from(values).slice(0, 5);
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-blue-600 font-medium">
          📊 Data Catalog Fields ({(previewData.totalRecords || 0).toLocaleString()} total records)
        </div>
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('formatted')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === 'formatted'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Formatted
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === 'raw'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Raw JSON
          </button>
        </div>
      </div>
      
      {/* Annotation Summary */}
      {Object.keys(annotations).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <TagIcon className="h-4 w-4" />
            <span className="font-medium">{Object.keys(annotations).length} fields cataloged</span>
          </div>
        </div>
      )}

      {/* Preview Content */}
      <div className="w-full bg-white rounded border p-4 max-h-96 overflow-y-auto">
        <div className="text-sm font-medium text-gray-700 mb-4">
          Click field names to add business context and categorization:
        </div>
        
        {viewMode === 'formatted' ? (
          <div className="w-full space-y-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {previewRecords.map((record: any, index: number) => {
              const recordData = record.data || record;
              
              return (
                <div key={index} className="w-full bg-gray-50 rounded p-4 border">
                  <div className="text-sm font-medium text-gray-600 mb-3">Record {index + 1}:</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-3">
                    {Object.entries(recordData).map(([key, value]) => {
                      const displayKey = key.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ');
                      
                      const annotation = annotations[key];
                      const sampleValues = extractSampleValues(previewData.records || [], key);
                      
                      return (
                        <div key={key} className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <button
                              onClick={() => handleFieldClick(key, displayKey, sampleValues)}
                              className="text-xs font-medium text-gray-600 hover:text-blue-600 hover:underline truncate text-left"
                              title="Click to annotate field"
                            >
                              {displayKey}
                            </button>
                            {annotation && (
                              <FieldAnnotationBadge
                                semanticType={annotation.semanticType}
                                isPII={annotation.isPII}
                                piiType={annotation.piiType}
                                sensitivityLevel={annotation.sensitivityLevel}
                              />
                            )}
                          </div>
                          <div className="text-sm text-gray-900 break-words">
                            {formatValue(value)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full space-y-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {previewRecords.map((record: any, index: number) => {
              const recordData = record.data || record;
              return (
                <div key={index} className="w-full bg-gray-50 rounded p-4 border">
                  <div className="text-sm font-medium text-gray-600 mb-3">Record {index + 1} (Raw JSON):</div>
                  <pre className="text-xs font-mono bg-gray-900 text-green-400 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(recordData, null, 2)}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Annotation Modal */}
      {showAnnotationModal && selectedField && (
        <FieldAnnotationModal
          isOpen={showAnnotationModal}
          onClose={() => {
            setShowAnnotationModal(false);
            setSelectedField(null);
          }}
          dataSourceId={sourceId}
          fieldPath={selectedField.path}
          fieldName={selectedField.name}
          currentAnnotation={annotations[selectedField.path]}
          onSave={handleSaveAnnotation}
          sampleValues={selectedField.sampleValues}
        />
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">—</span>;
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400">Empty list</span>;
    }
    if (typeof value[0] === 'object') {
      return (
        <div className="space-y-1">
          <span className="text-xs text-blue-600">{value.length} items</span>
          <details className="cursor-pointer">
            <summary className="text-xs text-gray-500 hover:text-gray-700">
              Click to expand
            </summary>
            <div className="mt-1 text-xs bg-gray-100 p-2 rounded max-h-32 overflow-y-auto">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(value, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      );
    }
    return value.join(', ');
  }
  
  if (typeof value === 'object') {
    const objKeys = Object.keys(value);
    if (objKeys.includes('_ref')) {
      return (
        <span className="text-xs text-purple-600">
          → {value._ref} (ref)
        </span>
      );
    }
    return (
      <details className="cursor-pointer">
        <summary className="text-xs text-gray-500 hover:text-gray-700">
          {objKeys.length} fields
        </summary>
        <div className="mt-1 text-xs bg-gray-100 p-2 rounded max-h-32 overflow-y-auto">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      </details>
    );
  }
  
  if (typeof value === 'boolean') {
    return (
      <span className={value ? 'text-green-600' : 'text-red-600'}>
        {value ? '✓' : '✗'} {String(value)}
      </span>
    );
  }
  
  return String(value);
}