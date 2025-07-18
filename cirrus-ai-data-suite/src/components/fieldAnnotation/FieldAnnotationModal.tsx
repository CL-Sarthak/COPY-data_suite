import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { FieldAnnotationBadge } from './FieldAnnotationBadge';


interface FieldAnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSourceId: string;
  fieldPath: string;
  fieldName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentAnnotation?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (annotation: any) => void;
  sampleValues?: string[];
}

const SEMANTIC_TYPES = [
  { value: 'identifier', label: 'Identifier/Key' },
  { value: 'metric', label: 'Metric/Measure' },
  { value: 'dimension', label: 'Dimension/Attribute' },
  { value: 'timestamp', label: 'Date/Time' },
  { value: 'category', label: 'Category/Status' },
  { value: 'text', label: 'Text/Description' },
  { value: 'reference', label: 'Reference/Link' },
  { value: 'other', label: 'Other' }
];

export function FieldAnnotationModal({
  isOpen,
  onClose,
  dataSourceId,
  fieldPath,
  fieldName,
  currentAnnotation,
  onSave,
  sampleValues = []
}: FieldAnnotationModalProps) {
  const [annotation, setAnnotation] = useState({
    semanticType: '',
    description: '',
    businessContext: '',
    tags: [] as string[],
    ...currentAnnotation
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (currentAnnotation) {
      setAnnotation({
        semanticType: '',
        description: '',
        businessContext: '',
        tags: [],
        ...currentAnnotation
      });
    }
  }, [currentAnnotation]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      dataSourceId,
      fieldPath,
      fieldName,
      ...annotation,
      exampleValues: sampleValues.slice(0, 5)
    });
    onClose();
  };

  const addTag = () => {
    if (tagInput.trim() && !annotation.tags.includes(tagInput.trim())) {
      setAnnotation({
        ...annotation,
        tags: [...annotation.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setAnnotation({
      ...annotation,
      tags: annotation.tags.filter((t: string) => t !== tag)
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-gray-900/50" 
          onClick={onClose}
        />

        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Catalog Field: {fieldName}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Field Path: <code className="text-gray-900">{fieldPath}</code></p>
              {sampleValues.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-1">Sample Values:</p>
                  <div className="flex flex-wrap gap-1">
                    {sampleValues.slice(0, 5).map((value, idx) => (
                      <span key={idx} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700">
                        {value}
                      </span>
                    ))}
                    {sampleValues.length > 5 && (
                      <span className="px-2 py-1 text-xs text-gray-500">
                        +{sampleValues.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Semantic Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semantic Type
                </label>
                <select
                  value={annotation.semanticType}
                  onChange={(e) => setAnnotation({ ...annotation, semanticType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a type...</option>
                  {SEMANTIC_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>


              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={annotation.description}
                  onChange={(e) => setAnnotation({ ...annotation, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of this field..."
                />
              </div>

              {/* Business Context */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Context
                </label>
                <textarea
                  value={annotation.businessContext}
                  onChange={(e) => setAnnotation({ ...annotation, businessContext: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="How is this field used in business processes..."
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add a tag..."
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {annotation.tags.map((tag: string) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

            </div>

            {/* Preview */}
            {annotation.semanticType && (
              <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-gray-900">{fieldName}</code>
                  <FieldAnnotationBadge
                    semanticType={annotation.semanticType}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleSave}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Save to Catalog
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}