import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { NewFieldFormData, DATA_TYPE_OPTIONS } from '@/types/fieldMapping';
import { CatalogCategory } from '@/types/fieldMapping';
import { FieldMappingService } from '@/services/fieldMappingService';

interface CreateFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
  formData: NewFieldFormData;
  onFormChange: (data: NewFieldFormData) => void;
  categories: CatalogCategory[];
  creating: boolean;
  sourceFieldName?: string;
}

export function CreateFieldModal({
  isOpen,
  onClose,
  onCreate,
  formData,
  onFormChange,
  categories,
  creating,
  sourceFieldName
}: CreateFieldModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate();
  };

  const fieldNameError = formData.name ? FieldMappingService.validateFieldName(formData.name) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Create New Field
            </h2>
            {sourceFieldName && (
              <p className="text-sm text-gray-600 mt-1">
                For source field: &ldquo;{sourceFieldName}&rdquo;
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Field Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                fieldNameError ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., customer_email"
              required
            />
            {fieldNameError && (
              <p className="mt-1 text-xs text-red-600">{fieldNameError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Lowercase letters, numbers, and underscores only
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => onFormChange({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Customer Email"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Describe what this field contains..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Data Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.dataType}
                onChange={(e) => onFormChange({ ...formData, dataType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {DATA_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => onFormChange({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {categories
                  .filter(cat => !cat.name.startsWith('standard_'))
                  .map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.displayName}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => onFormChange({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., pii, email, contact (comma-separated)"
            />
          </div>

          {/* Required Field */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRequired"
              checked={formData.isRequired}
              onChange={(e) => onFormChange({ ...formData, isRequired: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="isRequired" className="text-sm font-medium text-gray-700">
              Required Field
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !!fieldNameError || !formData.name || !formData.displayName}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Field'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}