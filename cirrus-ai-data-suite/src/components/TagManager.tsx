'use client';

import { useState } from 'react';
import { Tooltip } from '@/components/HelpSystem';
import {
  TagIcon,
  XMarkIcon,
  PlusIcon,
  CheckIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface TagManagerProps {
  tags: string[];
  availableTags: string[];
  onTagsChange: (tags: string[]) => void;
  onCreateTag?: (tag: string) => void;
  className?: string;
  size?: 'sm' | 'md';
  readOnly?: boolean;
}

interface TagFilterProps {
  allTags: string[];
  selectedTags: string[];
  onTagFilterChange: (tags: string[]) => void;
  className?: string;
}

// Individual tag component
export function Tag({ 
  children, 
  onRemove, 
  className = '', 
  size = 'md',
  color = 'blue' 
}: {
  children: React.ReactNode;
  onRemove?: () => void;
  className?: string;
  size?: 'sm' | 'md';
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray';
}) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  };

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    purple: 'bg-purple-100 text-purple-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800'
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${colorClasses[color]} ${className}`}>
      <span>{children}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
          type="button"
        >
          <XMarkIcon className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

// Tag manager for editing tags
export function TagManager({ 
  tags, 
  availableTags, 
  onTagsChange, 
  onCreateTag,
  className = '',
  size = 'md',
  readOnly = false 
}: TagManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag]);
      if (onCreateTag && !availableTags.includes(trimmedTag)) {
        onCreateTag(trimmedTag);
      }
    }
    setNewTag('');
    setIsAdding(false);
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSuggestionClick = (tag: string) => {
    if (!tags.includes(tag)) {
      onTagsChange([...tags, tag]);
    }
    setNewTag('');
    setIsAdding(false);
    setShowSuggestions(false);
  };

  const suggestions = availableTags.filter(tag => 
    !tags.includes(tag) && 
    tag.toLowerCase().includes(newTag.toLowerCase())
  ).slice(0, 5);

  const getTagColor = (tag: string): 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray' => {
    // Simple hash-based color assignment for consistency
    const hash = tag.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const colors: ('blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray')[] = ['blue', 'green', 'purple', 'yellow', 'red', 'gray'];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {tags.map(tag => (
        <Tag
          key={tag}
          size={size}
          color={getTagColor(tag)}
          onRemove={readOnly ? undefined : () => handleRemoveTag(tag)}
        >
          {tag}
        </Tag>
      ))}
      
      {!readOnly && (
        <>
          {isAdding ? (
            <div className="relative">
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => {
                    setNewTag(e.target.value);
                    setShowSuggestions(e.target.value.length > 0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    } else if (e.key === 'Escape') {
                      setNewTag('');
                      setIsAdding(false);
                      setShowSuggestions(false);
                    }
                  }}
                  placeholder="Add tag..."
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-0"
                  style={{ width: Math.max(80, newTag.length * 8 + 40) }}
                  autoFocus
                />
                <button
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  <CheckIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setNewTag('');
                    setIsAdding(false);
                    setShowSuggestions(false);
                  }}
                  className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                  type="button"
                  data-testid="cancel-button"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
              
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-full">
                  <div className="p-2">
                    <div className="text-xs text-gray-700 mb-1">Suggestions:</div>
                    {suggestions.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleSuggestionClick(tag)}
                        className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded transition-colors"
                        type="button"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Tooltip text="Add a tag to categorize this data source">
              <button
                onClick={() => setIsAdding(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-500 border border-dashed border-gray-300 rounded-full hover:border-gray-400 hover:text-gray-600 transition-colors"
                type="button"
              >
                <PlusIcon className="h-3 w-3" />
                Add tag
              </button>
            </Tooltip>
          )}
        </>
      )}
    </div>
  );
}

// Tag filter component for filtering data sources by tags
export function TagFilter({ allTags, selectedTags, onTagFilterChange, className = '' }: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagFilterChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagFilterChange([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    onTagFilterChange([]);
  };

  const getTagColor = (tag: string): 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray' => {
    const hash = tag.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const colors: ('blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray')[] = ['blue', 'green', 'purple', 'yellow', 'red', 'gray'];
    return colors[Math.abs(hash) % colors.length];
  };

  if (allTags.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <Tooltip text="Filter data sources by tags">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
            selectedTags.length > 0
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <FunnelIcon className="h-4 w-4" />
          Filter by tags
          {selectedTags.length > 0 && (
            <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {selectedTags.length}
            </span>
          )}
        </button>
      </Tooltip>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-64">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Filter by tags</h4>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            
            {selectedTags.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Active filters:</span>
                  <button
                    onClick={clearFilters}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedTags.map(tag => (
                    <Tag
                      key={tag}
                      size="sm"
                      color={getTagColor(tag)}
                      onRemove={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <TagIcon className="h-4 w-4" />
                  <span className="flex-1 text-left">{tag}</span>
                  {selectedTags.includes(tag) && (
                    <CheckIcon className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}