import React from 'react';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CatalogField, Category } from '@/types/catalog';
import { CatalogCategoryService } from '@/services/catalogCategoryService';

interface FieldsTableProps {
  fields: CatalogField[];
  categories: Category[];
  onEditField: (field: CatalogField) => void;
  onDeleteField: (field: CatalogField) => void;
}

export function FieldsTable({ fields, categories, onEditField, onDeleteField }: FieldsTableProps) {
  const getCategoryDisplay = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (!category) return null;
    
    const colorClasses = CatalogCategoryService.getColorClasses(category.color, category.isStandard);
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClasses}`}>
        {category.displayName}
      </span>
    );
  };

  if (fields.length === 0) {
    return (
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <p className="text-gray-500">No fields found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Field Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Display Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Required
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fields.map((field) => (
              <tr key={field.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{field.name}</div>
                  {field.description && (
                    <div className="text-xs text-gray-500 mt-1">{field.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {field.displayName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                    {field.dataType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getCategoryDisplay(field.category)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {field.isRequired ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {field.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {!field.isStandard && (
                      <>
                        <button
                          onClick={() => onEditField(field)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit Field"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteField(field)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete Field"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}