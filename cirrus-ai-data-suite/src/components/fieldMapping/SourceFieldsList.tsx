import React from 'react';
import { CheckCircleIcon, XCircleIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { FieldMapping, CatalogField } from '@/types/fieldMapping';

interface SourceFieldsListProps {
  sourceFields: string[];
  mappings: FieldMapping[];
  catalogFields: CatalogField[];
  onSelectField: (field: string) => void;
  onCreateFieldForSource: (sourceField: string) => void;
  onRemoveMapping?: (sourceField: string) => void;
}

export function SourceFieldsList({
  sourceFields,
  mappings,
  catalogFields,
  onSelectField,
  onCreateFieldForSource,
  onRemoveMapping
}: SourceFieldsListProps) {
  const getMappingForField = (fieldName: string): FieldMapping | undefined => {
    return mappings.find(m => m.sourceFieldName === fieldName);
  };

  const getCatalogField = (catalogFieldId: string): CatalogField | undefined => {
    return catalogFields.find(f => f.id === catalogFieldId);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Source Fields</h3>
        <p className="text-xs text-gray-500 mt-1">
          {sourceFields.length} fields • {mappings.length} mapped
        </p>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {sourceFields.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No source fields detected
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {sourceFields.map(field => {
              const mapping = getMappingForField(field);
              const catalogField = mapping ? getCatalogField(mapping.catalogFieldId) : undefined;
              
              return (
                <li
                  key={field}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onSelectField(field)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {mapping ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {field}
                        </span>
                      </div>
                      
                      {catalogField && (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-gray-500">→</span>
                          <span className="text-xs text-gray-600">
                            {catalogField.displayName}
                          </span>
                          {mapping?.isManual && (
                            <span className="text-xs text-blue-600 font-medium">
                              Manual
                            </span>
                          )}
                          {!mapping?.isManual && (
                            <span className="text-xs text-gray-500">
                              {Math.round((mapping?.confidence || 0) * 100)}% confidence
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      {mapping && onRemoveMapping && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveMapping(field);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove mapping"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                      
                      {!mapping && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateFieldForSource(field);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Create new field for this source field"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}