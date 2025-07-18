'use client';

import { useState, useEffect } from 'react';
import { useDialog } from '@/contexts/DialogContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface CatalogField {
  id: string;
  name: string;
  displayName: string;
  description: string;
  dataType: string;
  category: string;
  isRequired: boolean;
  isStandard: boolean;
  tags: string[];
  validationRules?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    enumValues?: string[];
    decimalPlaces?: number;
  };
}

interface Category {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  color: string;
  icon?: string;
  sortOrder: number;
  isStandard: boolean;
  isActive: boolean;
  count: number;
}

// Helper function to convert hex color to Tailwind classes
const getColorClasses = (hexColor: string, isStandard: boolean): string => {
  const colorMap: Record<string, string> = {
    '#3b82f6': 'bg-blue-100 text-blue-800',    // identity
    '#10b981': 'bg-green-100 text-green-800',  // contact, financial
    '#8b5cf6': 'bg-purple-100 text-purple-800', // location
    '#f59e0b': 'bg-yellow-100 text-yellow-800', // temporal
    '#6366f1': 'bg-indigo-100 text-indigo-800', // business
    '#6b7280': 'bg-gray-100 text-gray-800',     // system
    '#f97316': 'bg-orange-100 text-orange-800', // custom
    '#94a3b8': 'bg-slate-100 text-slate-800',   // uncategorized
    '#ec4899': 'bg-pink-100 text-pink-800'      // fallback
  };
  
  return colorMap[hexColor] || (isStandard ? 'bg-gray-100 text-gray-800' : 'bg-slate-100 text-slate-800');
};

const DATA_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'enum', label: 'Enum (List)' },
  { value: 'array', label: 'Array' },
  { value: 'object', label: 'Object' }
];

export default function CatalogManager() {
  const dialog = useDialog();
  const [fields, setFields] = useState<CatalogField[]>([]);
  const [filteredFields, setFilteredFields] = useState<CatalogField[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<CatalogField | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingField, setDeletingField] = useState<CatalogField | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Category management state
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    dataType: 'string',
    category: 'custom',
    isRequired: false,
    tags: [] as string[],
    validationRules: {
      pattern: '',
      minLength: undefined as number | undefined,
      maxLength: undefined as number | undefined,
      minValue: undefined as number | undefined,
      maxValue: undefined as number | undefined,
      enumValues: [] as string[],
      decimalPlaces: undefined as number | undefined
    }
  });

  // Category form state
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    color: '#6b7280',
    icon: 'TagIcon',
    sortOrder: 999
  });

  useEffect(() => {
    fetchFields();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, selectedCategory, searchTerm]);

  const fetchFields = async () => {
    try {
      const response = await fetch('/api/catalog/fields');
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched fields data:', data);
        // Handle both response formats - object with fields property or direct array
        const fields = data.fields || data;
        const fieldsArray = Array.isArray(fields) ? fields : [];
        console.log('Setting fields:', fieldsArray.length, 'fields');
        // Find transaction_amount field for debugging
        const transactionField = fieldsArray.find((f: CatalogField) => f.name === 'transaction_amount');
        if (transactionField) {
          console.log('transaction_amount field after fetch:', transactionField);
        }
        setFields(fieldsArray);
        updateCategoryCounts(fieldsArray);
      } else {
        console.error('Failed to fetch fields:', response.statusText);
        setFields([]);
      }
    } catch (error) {
      console.error('Failed to fetch catalog fields:', error);
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/catalog/categories');
      if (response.ok) {
        const data = await response.json();
        const categories = data.categories || [];
        
        // If no categories found, try to initialize the catalog
        if (categories.length === 0) {
          console.log('No categories found, initializing standard catalog...');
          try {
            const initResponse = await fetch('/api/catalog/initialize', {
              method: 'POST'
            });
            if (initResponse.ok) {
              console.log('Standard catalog initialized successfully');
              // Fetch categories again after initialization
              const retryResponse = await fetch('/api/catalog/categories');
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                setCategories((retryData.categories || []).map((cat: Category) => ({
                  ...cat,
                  count: 0 // Will be updated by updateCategoryCounts
                })));
                return;
              }
            }
          } catch (initError) {
            console.error('Failed to initialize standard catalog:', initError);
          }
        }
        
        setCategories(categories.map((cat: Category) => ({
          ...cat,
          count: 0 // Will be updated by updateCategoryCounts
        })));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const updateCategoryCounts = (fieldList: CatalogField[]) => {
    const counts: Record<string, number> = {};
    fieldList.forEach(field => {
      counts[field.category] = (counts[field.category] || 0) + 1;
    });
    
    setCategories(prevCategories => prevCategories.map(cat => ({
      ...cat,
      count: counts[cat.name] || 0
    })));
  };

  const filterFields = () => {
    // Ensure fields is always an array
    const fieldsArray = Array.isArray(fields) ? fields : [];
    let filtered = fieldsArray;
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(f => f.category === selectedCategory);
    }
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(term) ||
        f.displayName.toLowerCase().includes(term) ||
        f.description.toLowerCase().includes(term) ||
        f.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    setFilteredFields(filtered);
  };

  const handleCreateField = async () => {
    try {
      const response = await fetch('/api/catalog/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        await fetchFields();
        setShowCreateModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create field:', error);
    }
  };

  const handleUpdateField = async () => {
    if (!editingField) return;
    
    try {
      console.log('Updating field with data:', formData);
      const response = await fetch(`/api/catalog/fields/${editingField.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const updatedField = await response.json();
        console.log('Field updated successfully:', updatedField);
        await fetchFields();
        setShowEditModal(false);
        setEditingField(null);
        resetForm();
      } else {
        const errorData = await response.json();
        console.error('Failed to update field:', errorData);
        dialog.showAlert({
          title: 'Update Failed',
          message: `Failed to update field: ${errorData.error || 'Unknown error'}`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Failed to update field:', error);
      dialog.showAlert({
        title: 'Update Error',
        message: `Error updating field: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  const handleDeleteField = async () => {
    if (!deletingField) return;
    
    try {
      const response = await fetch(`/api/catalog/fields/${deletingField.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchFields();
        setShowDeleteConfirm(false);
        setDeletingField(null);
      } else {
        const errorData = await response.json();
        dialog.showAlert({
          title: 'Delete Failed',
          message: errorData.details || errorData.error || 'Failed to delete field',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Failed to delete field:', error);
      dialog.showAlert({
        title: 'Delete Error',
        message: 'Failed to delete field',
        type: 'error'
      });
    }
  };

  const startEdit = (field: CatalogField) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      displayName: field.displayName,
      description: field.description,
      dataType: field.dataType,
      category: field.category,
      isRequired: field.isRequired,
      tags: field.tags,
      validationRules: {
        pattern: field.validationRules?.pattern || '',
        minLength: field.validationRules?.minLength,
        maxLength: field.validationRules?.maxLength,
        minValue: field.validationRules?.minValue,
        maxValue: field.validationRules?.maxValue,
        enumValues: field.validationRules?.enumValues || [],
        decimalPlaces: field.validationRules?.decimalPlaces
      }
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      dataType: 'string',
      category: 'custom',
      isRequired: false,
      tags: [],
      validationRules: {
        pattern: '',
        minLength: undefined,
        maxLength: undefined,
        minValue: undefined,
        maxValue: undefined,
        enumValues: [],
        decimalPlaces: undefined
      }
    });
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      displayName: '',
      description: '',
      color: '#6b7280',
      icon: 'TagIcon',
      sortOrder: 999
    });
  };

  const handleCreateCategory = async () => {
    try {
      const response = await fetch('/api/catalog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryFormData)
      });
      
      if (response.ok) {
        await fetchCategories();
        setShowCreateCategoryModal(false);
        resetCategoryForm();
      }
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    
    try {
      const response = await fetch(`/api/catalog/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryFormData)
      });
      
      if (response.ok) {
        await fetchCategories();
        setShowEditCategoryModal(false);
        setEditingCategory(null);
        resetCategoryForm();
      }
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    
    try {
      const response = await fetch(`/api/catalog/categories/${deletingCategory.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchCategories();
        setShowDeleteCategoryConfirm(false);
        setDeletingCategory(null);
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const exportCatalog = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      fields: fields
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalog-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadImportTemplate = () => {
    const templateData = {
      version: '1.0',
      description: 'Global Catalog Import Template - Add your custom fields to the fields array',
      fields: [
        {
          name: 'custom_field_example',
          displayName: 'Custom Field Example',
          description: 'This is an example custom field - replace with your own',
          dataType: 'string',
          category: 'custom',
          isRequired: false,
          isStandard: false,
          tags: ['example', 'template'],
          validationRules: {
            pattern: '',
            minLength: 1,
            maxLength: 255,
            minValue: undefined,
            maxValue: undefined,
            enumValues: []
          }
        },
        {
          name: 'department_code',
          displayName: 'Department Code',
          description: 'Organizational department identifier',
          dataType: 'string',
          category: 'business',
          isRequired: false,
          isStandard: false,
          tags: ['organization', 'department'],
          validationRules: {
            pattern: '^[A-Z]{2,4}$',
            minLength: 2,
            maxLength: 4,
            minValue: undefined,
            maxValue: undefined,
            enumValues: ['HR', 'IT', 'FIN', 'MKT', 'OPS']
          }
        },
        {
          name: 'priority_level',
          displayName: 'Priority Level',
          description: 'Task or item priority ranking',
          dataType: 'number',
          category: 'business',
          isRequired: false,
          isStandard: false,
          tags: ['priority', 'ranking'],
          validationRules: {
            pattern: '',
            minLength: undefined,
            maxLength: undefined,
            minValue: 1,
            maxValue: 5,
            enumValues: []
          }
        }
      ],
      instructions: {
        dataTypes: ['string', 'number', 'currency', 'boolean', 'date', 'datetime', 'email', 'url', 'enum', 'array', 'object'],
        categories: ['identity', 'contact', 'location', 'financial', 'temporal', 'business', 'technical', 'custom'],
        notes: [
          'Only custom fields (isStandard: false) will be imported',
          'Field names must be unique and use snake_case format',
          'Categories should match existing catalog categories',
          'Validation rules are optional but recommended for data quality',
          'Tags help with searchability and organization'
        ]
      }
    };
    
    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catalog-import-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCatalog = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate import format
      if (!data.fields || !Array.isArray(data.fields)) {
        dialog.showAlert({
          title: 'Import Error',
          message: 'Invalid catalog format',
          type: 'error'
        });
        return;
      }
      
      // Import each field
      for (const field of data.fields) {
        if (!field.isStandard) { // Only import custom fields
          await fetch('/api/catalog/fields', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(field)
          });
        }
      }
      
      await fetchFields();
      dialog.showAlert({
        title: 'Import Successful',
        message: 'Catalog imported successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to import catalog:', error);
      dialog.showAlert({
        title: 'Import Failed',
        message: 'Failed to import catalog',
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">Loading catalog fields...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search fields by name, description, or tags..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Field</span>
            </button>
            
            <button
              onClick={downloadImportTemplate}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 text-gray-700"
              title="Download import template with examples"
            >
              <DocumentTextIcon className="h-5 w-5" />
              <span>Template</span>
            </button>
            
            <button
              onClick={exportCatalog}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 text-gray-700"
            >
              <ArrowUpTrayIcon className="h-5 w-5" />
              <span>Export</span>
            </button>
            
            <label className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 cursor-pointer text-gray-700">
              <ArrowDownTrayIcon className="h-5 w-5" />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={importCatalog}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Categories Sidebar */}
        <div className="w-64 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Categories</h3>
            <button
              onClick={() => setShowCreateCategoryModal(true)}
              className="p-1 text-gray-500 hover:text-gray-700"
              title="Add Category"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedCategory === 'all' 
                    ? 'bg-gray-100 text-gray-900 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>All Fields</span>
                  <span className="text-sm text-gray-500">{fields.length}</span>
                </div>
              </button>
            </li>
            {categories.map(category => (
              <li key={category.id}>
                <div className={`flex items-center rounded-lg transition-colors ${
                  selectedCategory === category.name 
                    ? 'bg-gray-100' 
                    : 'hover:bg-gray-50'
                }`}>
                  <button
                    onClick={() => setSelectedCategory(category.name)}
                    className={`flex-1 text-left px-3 py-2 ${
                      selectedCategory === category.name 
                        ? 'text-gray-900 font-medium' 
                        : 'text-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{category.displayName}</span>
                      <span className="text-sm text-gray-500">{category.count}</span>
                    </div>
                  </button>
                  {!category.isStandard && (
                    <div className="flex items-center space-x-1 px-2">
                      <button
                        onClick={() => {
                          setEditingCategory(category);
                          setCategoryFormData({
                            name: category.name,
                            displayName: category.displayName,
                            description: category.description || '',
                            color: category.color,
                            icon: category.icon || 'TagIcon',
                            sortOrder: category.sortOrder
                          });
                          setShowEditCategoryModal(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Edit Category"
                      >
                        <PencilIcon className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingCategory(category);
                          setShowDeleteCategoryConfirm(true);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete Category"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Fields Table */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200">
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
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(filteredFields) && filteredFields.map((field) => {
                  const category = categories.find(c => c.name === field.category);
                  return (
                    <tr key={field.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{field.name}</div>
                          <div className="text-xs text-gray-500">{field.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {field.displayName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {DATA_TYPES.find(t => t.value === field.dataType)?.label || field.dataType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          category ? getColorClasses(category.color, category.isStandard) : 'bg-gray-100 text-gray-800'
                        }`}>
                          {category?.displayName || field.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {field.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {field.isStandard ? (
                            <span className="text-xs text-blue-600 font-medium">Standard</span>
                          ) : (
                            <span className="text-xs text-green-600 font-medium">Custom</span>
                          )}
                          {field.isRequired && (
                            <span className="text-xs text-red-600 font-medium">Required</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => startEdit(field)}
                            className="text-blue-600 hover:text-blue-900"
                            title={field.isStandard ? "Edit standard field (limited changes)" : "Edit field"}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingField(field);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title={field.isStandard ? "Delete standard field (requires confirmation)" : "Delete field"}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            {(!Array.isArray(filteredFields) || filteredFields.length === 0) && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500">No fields found matching your criteria</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-gray-600">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {showCreateModal ? 'Create New Field' : 'Edit Field'}
              </h2>
              
              <div className="space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Field Name (snake_case)
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={showEditModal && editingField?.isStandard}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
                      placeholder="field_name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Field Name"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Describe the purpose of this field..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Type
                    </label>
                    <select
                      value={formData.dataType}
                      onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      {DATA_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      disabled={showEditModal && editingField?.isStandard}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.displayName}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags.join(', ')}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="pii, sensitive, gdpr"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isRequired"
                    checked={formData.isRequired}
                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isRequired" className="ml-2 text-sm text-gray-700">
                    Required field
                  </label>
                </div>
                
                {/* Validation Rules (optional) */}
                {formData.dataType === 'string' && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Validation Rules (Optional)</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          Pattern (Regular Expression)
                        </label>
                        <input
                          type="text"
                          value={formData.validationRules.pattern || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            validationRules: { ...formData.validationRules, pattern: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="^[A-Z0-9]+$"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Min Length
                          </label>
                          <input
                            type="number"
                            value={formData.validationRules.minLength || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              validationRules: { 
                                ...formData.validationRules, 
                                minLength: e.target.value ? parseInt(e.target.value) : undefined 
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Max Length
                          </label>
                          <input
                            type="number"
                            value={formData.validationRules.maxLength || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              validationRules: { 
                                ...formData.validationRules, 
                                maxLength: e.target.value ? parseInt(e.target.value) : undefined 
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Number/Currency Validation Rules */}
                {(formData.dataType === 'number' || formData.dataType === 'currency') && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Numeric Validation Rules (Optional)</h3>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Min Value
                          </label>
                          <input
                            type="number"
                            value={formData.validationRules.minValue || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              validationRules: { 
                                ...formData.validationRules, 
                                minValue: e.target.value ? parseFloat(e.target.value) : undefined 
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            step="any"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Max Value
                          </label>
                          <input
                            type="number"
                            value={formData.validationRules.maxValue || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              validationRules: { 
                                ...formData.validationRules, 
                                maxValue: e.target.value ? parseFloat(e.target.value) : undefined 
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            step="any"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">
                            Decimal Places
                          </label>
                          <input
                            type="number"
                            value={formData.validationRules.decimalPlaces || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              validationRules: { 
                                ...formData.validationRules, 
                                decimalPlaces: e.target.value ? parseInt(e.target.value) : undefined 
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            min="0"
                            max="10"
                            placeholder="2"
                          />
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        {formData.dataType === 'currency' ? 
                          'For currency fields, decimal places typically defaults to 2 if not specified.' :
                          'Specify how many decimal places are allowed for this numeric field.'
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    if (showCreateModal) {
                      setShowCreateModal(false);
                    } else {
                      setShowEditModal(false);
                    }
                    setEditingField(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={showCreateModal ? handleCreateField : handleUpdateField}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {showCreateModal ? 'Create Field' : 'Update Field'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingField && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full border-2 border-gray-600">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Delete {deletingField.isStandard ? 'Standard' : 'Custom'} Field
              </h3>
              
              {deletingField.isStandard && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-amber-500 mt-0.5">⚠️</div>
                    <div>
                      <h4 className="text-sm font-medium text-amber-800 mb-1">Warning: Deleting Standard Field</h4>
                      <p className="text-sm text-amber-700">
                        You are about to delete a built-in standard field. This field is part of the core catalog schema 
                        and may be expected by other parts of the system.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the field &quot;{deletingField.displayName}&quot;? 
                {deletingField.isStandard ? (
                  <>
                    <br /><br />
                    <span className="font-medium text-red-700">
                      This will permanently remove this standard field from your catalog. 
                      Any existing data mappings using this field will also be deleted.
                    </span>
                  </>
                ) : (
                  ' Any existing data mappings using this field will also be deleted.'
                )}
                <br /><br />
                This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingField(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteField}
                  className={`px-4 py-2 rounded-lg text-white ${
                    deletingField.isStandard 
                      ? 'bg-red-700 hover:bg-red-800' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {deletingField.isStandard ? 'Delete Standard Field' : 'Delete Field'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Category Modal */}
      {(showCreateCategoryModal || showEditCategoryModal) && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full border-2 border-gray-600">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {showCreateCategoryModal ? 'Create New Category' : 'Edit Category'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name (snake_case)
                  </label>
                  <input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    disabled={showEditCategoryModal && editingCategory?.isStandard}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
                    placeholder="category_name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={categoryFormData.displayName}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, displayName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Category Name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={categoryFormData.description}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Describe this category..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={categoryFormData.color}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                      className="w-full h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={categoryFormData.sortOrder}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, sortOrder: parseInt(e.target.value) || 999 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    if (showCreateCategoryModal) {
                      setShowCreateCategoryModal(false);
                    } else {
                      setShowEditCategoryModal(false);
                    }
                    setEditingCategory(null);
                    resetCategoryForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={showCreateCategoryModal ? handleCreateCategory : handleUpdateCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {showCreateCategoryModal ? 'Create Category' : 'Update Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {showDeleteCategoryConfirm && deletingCategory && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full border-2 border-gray-600">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Category</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the category &quot;{deletingCategory.displayName}&quot;? 
                {deletingCategory.count > 0 && (
                  <>
                    <br /><br />
                    <span className="font-medium text-amber-700">
                      This category contains {deletingCategory.count} field{deletingCategory.count !== 1 ? 's' : ''}. 
                      These fields will be moved to the &quot;Uncategorized&quot; category.
                    </span>
                  </>
                )}
                <br /><br />
                This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteCategoryConfirm(false);
                    setDeletingCategory(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCategory}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}