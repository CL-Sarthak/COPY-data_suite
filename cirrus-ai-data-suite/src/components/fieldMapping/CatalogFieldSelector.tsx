import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { CatalogField, CatalogCategory, FieldMapping } from '@/types/fieldMapping';

interface CatalogFieldSelectorProps {
  catalogFields: CatalogField[];
  categories: CatalogCategory[];
  mappings: FieldMapping[];
  selectedCategory: string;
  searchQuery: string;
  selectedSourceField: string | null;
  onCategoryChange: (category: string) => void;
  onSearchChange: (query: string) => void;
  onFieldSelect: (field: CatalogField) => void;
  onRemoveMapping: () => void;
}

export function CatalogFieldSelector({
  catalogFields,
  categories,
  mappings,
  selectedCategory,
  searchQuery,
  selectedSourceField,
  onCategoryChange,
  onSearchChange,
  onFieldSelect,
  onRemoveMapping
}: CatalogFieldSelectorProps) {
  const currentMapping = selectedSourceField 
    ? mappings.find(m => m.sourceFieldName === selectedSourceField)
    : null;

  const getCategoryColor = (category: CatalogCategory): string => {
    const colorMap: Record<string, string> = {
      '#3b82f6': 'bg-blue-100 text-blue-700',
      '#10b981': 'bg-green-100 text-green-700',
      '#8b5cf6': 'bg-purple-100 text-purple-700',
      '#f59e0b': 'bg-yellow-100 text-yellow-700',
      '#6366f1': 'bg-indigo-100 text-indigo-700',
      '#6b7280': 'bg-gray-100 text-gray-700',
      '#f97316': 'bg-orange-100 text-orange-700',
      '#ec4899': 'bg-pink-100 text-pink-700'
    };
    return colorMap[category.color] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Catalog Fields</h3>
        {selectedSourceField && (
          <p className="text-xs text-gray-500 mt-1">
            Select a field to map to &ldquo;{selectedSourceField}&rdquo;
          </p>
        )}
      </div>

      {/* Category Filter */}
      <div className="px-4 py-2 border-b border-gray-200">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onCategoryChange('all')}
            className={`px-2 py-1 text-xs rounded-full transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.name)}
              className={`px-2 py-1 text-xs rounded-full transition-colors ${
                selectedCategory === category.name
                  ? getCategoryColor(category)
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category.displayName}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-gray-200">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search fields..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Fields List */}
      <div className="flex-1 overflow-y-auto">
        {catalogFields.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No fields found
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {catalogFields.map(field => {
              const isCurrentlyMapped = currentMapping?.catalogFieldId === field.id;
              const category = categories.find(c => c.name === field.category);
              
              return (
                <li
                  key={field.id}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    isCurrentlyMapped
                      ? 'bg-blue-50 hover:bg-blue-100'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onFieldSelect(field)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          isCurrentlyMapped ? 'text-blue-700' : 'text-gray-900'
                        }`}>
                          {field.displayName}
                        </span>
                        {field.isRequired && (
                          <span className="text-xs text-red-600">*</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {field.name}
                      </p>
                      {field.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {field.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {field.dataType}
                        </span>
                        {category && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(category)}`}>
                            {category.displayName}
                          </span>
                        )}
                        {field.tags.map(tag => (
                          <span key={tag} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Remove Mapping Option */}
      {selectedSourceField && currentMapping && (
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={onRemoveMapping}
            className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Remove Current Mapping
          </button>
        </div>
      )}
    </div>
  );
}