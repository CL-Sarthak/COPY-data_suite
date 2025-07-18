'use client';

import { useState } from 'react';
import {
  FunnelIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export interface TemplateFilterOptions {
  showCustom: boolean;
  showSystem: boolean;
  showGlobal: boolean;
  templateTypes: ('remediation' | 'normalization' | 'global')[];
  categories: string[];
  searchTerm: string;
}

interface TemplateFilterProps {
  options: TemplateFilterOptions;
  onChange: (options: TemplateFilterOptions) => void;
  availableCategories: string[];
  showTemplateTypes?: boolean;
}

export default function TemplateFilter({
  options,
  onChange,
  availableCategories,
  showTemplateTypes = true
}: TemplateFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = (field: keyof TemplateFilterOptions, value?: string | boolean) => {
    if (field === 'templateTypes' || field === 'categories') {
      if (typeof value === 'string') {
        const currentArray = options[field] as string[];
        const newArray = currentArray.includes(value)
          ? currentArray.filter(item => item !== value)
          : [...currentArray, value];
        onChange({ ...options, [field]: newArray });
      }
    } else {
      onChange({ ...options, [field]: value });
    }
  };

  const activeFilterCount = [
    !options.showCustom && 'custom',
    !options.showSystem && 'system',
    !options.showGlobal && 'global',
    options.templateTypes.length < 3 && 'types',
    options.categories.length > 0 && 'categories',
    options.searchTerm && 'search'
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-900">Filter Templates</h3>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFilterCount} active
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? 'Hide' : 'Show'} filters
        </button>
      </div>

      {/* Search Bar */}
      <div className="mt-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={options.searchTerm}
            onChange={(e) => onChange({ ...options, searchTerm: e.target.value })}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {options.searchTerm && (
            <button
              onClick={() => onChange({ ...options, searchTerm: '' })}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => handleToggle('showCustom', !options.showCustom)}
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            options.showCustom 
              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Custom Templates
        </button>
        <button
          onClick={() => handleToggle('showSystem', !options.showSystem)}
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            options.showSystem 
              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          System Templates
        </button>
        <button
          onClick={() => handleToggle('showGlobal', !options.showGlobal)}
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            options.showGlobal 
              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Global Templates
        </button>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          {/* Template Types */}
          {showTemplateTypes && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Template Types</h4>
              <div className="space-y-2">
                {['remediation', 'normalization', 'global'].map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={options.templateTypes.includes(type as 'remediation' | 'normalization' | 'global')}
                      onChange={() => handleToggle('templateTypes', type)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Categories</h4>
            <div className="space-y-2">
              {availableCategories.map(category => (
                <label key={category} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.categories.includes(category)}
                    onChange={() => handleToggle('categories', category)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          <div className="pt-2">
            <button
              onClick={() => onChange({
                showCustom: true,
                showSystem: true,
                showGlobal: true,
                templateTypes: ['remediation', 'normalization', 'global'],
                categories: [],
                searchTerm: ''
              })}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}