'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

import { Pipeline } from '@/types/pipeline';

interface CreatePipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (pipeline: Pipeline) => void;
}

const PIPELINE_TEMPLATES = [
  {
    name: 'Data Processing Pipeline',
    description: 'Upload files, detect PII, and export cleaned data',
    category: 'data-processing'
  },
  {
    name: 'Data Validation Pipeline',
    description: 'Validate data quality and generate reports',
    category: 'validation'
  },
  {
    name: 'Privacy Protection Pipeline',
    description: 'Detect and redact sensitive information',
    category: 'privacy'
  },
  {
    name: 'Analytics Pipeline',
    description: 'Process and analyze data for insights',
    category: 'analytics'
  },
  {
    name: 'Custom Pipeline',
    description: 'Start with a blank pipeline',
    category: 'custom'
  }
];

export default function CreatePipelineModal({
  isOpen,
  onClose,
  onCreate
}: CreatePipelineModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setSelectedTemplate(null);
      setError(null);
      setIsCreating(false);
      
      // Focus name input after a brief delay
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Validate form
  const validateForm = (): string | null => {
    if (!name.trim()) {
      return 'Pipeline name is required';
    }
    if (name.length > 100) {
      return 'Pipeline name must be 100 characters or less';
    }
    if (description.length > 500) {
      return 'Description must be 500 characters or less';
    }
    if (!/^[a-zA-Z0-9\s\-_().]+$/.test(name.trim())) {
      return 'Pipeline name can only contain letters, numbers, spaces, hyphens, underscores, and parentheses';
    }
    return null;
  };

  // Handle template selection
  const handleTemplateSelect = (template: typeof PIPELINE_TEMPLATES[0]) => {
    setSelectedTemplate(template.category);
    if (!name.trim()) {
      setName(template.name);
    }
    if (!description.trim()) {
      setDescription(template.description);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const newPipeline: Pipeline = {
        id: `pipeline_${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        nodes: [],
        edges: [],
        triggers: [],
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user',
        tags: selectedTemplate && selectedTemplate !== 'custom' 
          ? [selectedTemplate] 
          : [],
        version: 1
      };

      onCreate(newPipeline);
      onClose();
    } catch (error) {
      console.error('Failed to create pipeline:', error);
      setError('Failed to create pipeline. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle key presses
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onKeyDown={handleKeyPress}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create New Pipeline</h2>
            <p className="text-sm text-gray-600 mt-1">
              Build a visual workflow to automate your data processing tasks
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Pipeline Details */}
          <div className="space-y-4">
            <div>
              <label htmlFor="pipeline-name" className="block text-sm font-medium text-gray-700 mb-2">
                Pipeline Name *
              </label>
              <input
                ref={nameInputRef}
                id="pipeline-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter a descriptive name for your pipeline..."
                maxLength={100}
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                {name.length}/100 characters
              </div>
            </div>

            <div>
              <label htmlFor="pipeline-description" className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="pipeline-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Describe what this pipeline will do..."
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {description.length}/500 characters
              </div>
            </div>
          </div>

          {/* Pipeline Templates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose a Template (Optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PIPELINE_TEMPLATES.map((template) => (
                <button
                  key={template.category}
                  type="button"
                  onClick={() => handleTemplateSelect(template)}
                  className={`text-left p-4 border-2 rounded-lg transition-all ${
                    selectedTemplate === template.category
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                      template.category === 'custom' 
                        ? 'bg-gray-100 text-gray-600' 
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      <PlusIcon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm">
                        {template.name}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusIcon className="w-4 h-4" />
                  Create Pipeline
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}