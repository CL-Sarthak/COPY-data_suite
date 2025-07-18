import React from 'react';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Category } from '@/types/catalog';

interface CategoriesSidebarProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  onCreateCategory: () => void;
  onEditCategory: (category: Category) => void;
  standardFieldsCount: number;
  customFieldsCount: number;
  totalFieldsCount: number;
}

export function CategoriesSidebar({
  categories,
  selectedCategory,
  onCategorySelect,
  onCreateCategory,
  onEditCategory,
  standardFieldsCount,
  customFieldsCount,
  totalFieldsCount
}: CategoriesSidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Categories</h3>
        <button
          onClick={onCreateCategory}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Add Category"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
      
      <div className="space-y-1">
        {/* All Fields */}
        <button
          onClick={() => onCategorySelect('all')}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
            selectedCategory === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="text-sm">All Fields</span>
          <span className="text-xs text-gray-500">{totalFieldsCount}</span>
        </button>
        
        {/* Standard Fields */}
        <button
          onClick={() => onCategorySelect('standard')}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
            selectedCategory === 'standard' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="text-sm">Standard Fields</span>
          <span className="text-xs text-gray-500">{standardFieldsCount}</span>
        </button>
        
        {/* Custom Fields */}
        <button
          onClick={() => onCategorySelect('custom')}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
            selectedCategory === 'custom' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="text-sm">Custom Fields</span>
          <span className="text-xs text-gray-500">{customFieldsCount}</span>
        </button>
        
        {/* Divider */}
        <div className="my-2 border-t border-gray-200"></div>
        
        {/* Categories */}
        {categories.map(category => (
          <div
            key={category.id}
            className={`group relative ${
              selectedCategory === category.name ? 'bg-blue-50' : ''
            }`}
          >
            <button
              onClick={() => onCategorySelect(category.name)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                selectedCategory === category.name ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`inline-block w-3 h-3 rounded-full`} style={{ backgroundColor: category.color }}></span>
                <span className={`text-sm ${
                  selectedCategory === category.name ? '' : 'text-gray-700'
                }`}>{category.displayName}</span>
              </div>
              <span className="text-xs text-gray-500">{category.count}</span>
            </button>
            
            {!category.isStandard && (
              <button
                onClick={() => onEditCategory(category)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                title="Edit Category"
              >
                <PencilIcon className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}