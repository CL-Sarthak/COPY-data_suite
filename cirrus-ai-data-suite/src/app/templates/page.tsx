'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import TemplateCard from '@/components/dataQuality/TemplateCard';
import TemplateFilter, { TemplateFilterOptions } from '@/components/dataQuality/TemplateFilter';
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  CheckCircleIcon,
  XMarkIcon,
  BeakerIcon,
  SparklesIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';

interface DataQualityTemplate {
  id: string;
  name: string;
  description?: string;
  templateType: 'remediation' | 'normalization' | 'global';
  category: string;
  methodName: string;
  parameters?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  applicableDataTypes?: string[];
  applicableFieldPatterns?: string[];
  confidenceThreshold: number;
  riskLevel: 'low' | 'medium' | 'high';
  usageRecommendations?: string;
  exampleBefore?: Record<string, unknown>;
  exampleAfter?: Record<string, unknown>;
  usageCount: number;
  successRate?: number;
  avgProcessingTimeMs?: number;
  isSystemTemplate: boolean;
  isCustom: boolean;
  tags?: string[];
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<DataQualityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DataQualityTemplate | null>(null);
  const [activeView, setActiveView] = useState<'grid' | 'table'>('grid');
  const [filterOptions, setFilterOptions] = useState<TemplateFilterOptions>({
    showCustom: true,
    showSystem: true,
    showGlobal: true,
    templateTypes: ['remediation', 'normalization', 'global'],
    categories: [],
    searchTerm: ''
  });
  const [stats, setStats] = useState({
    totalTemplates: 0,
    systemTemplates: 0,
    customTemplates: 0,
    avgSuccessRate: 0,
    totalUsage: 0
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/data-quality-templates?limit=100');
      
      if (response.ok) {
        const data = await response.json();
        const templates: DataQualityTemplate[] = data.templates || data.data || [];
        setTemplates(templates);
        
        // Calculate stats
        const customCount = templates.filter((t: DataQualityTemplate) => t.isCustom).length;
        const systemCount = templates.filter((t: DataQualityTemplate) => t.isSystemTemplate).length;
        const totalUsage = templates.reduce((sum: number, t: DataQualityTemplate) => sum + t.usageCount, 0);
        const avgSuccess = templates.length > 0 ? templates.reduce((sum: number, t: DataQualityTemplate) => sum + (t.successRate || 0), 0) / templates.length : 0;
        
        setStats({
          totalTemplates: templates.length,
          systemTemplates: systemCount,
          customTemplates: customCount,
          avgSuccessRate: avgSuccess,
          totalUsage: totalUsage
        });
      } else {
        console.error('Failed to fetch templates:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter templates based on filter options
  const filteredTemplates = templates.filter(template => {
    // Type filter
    if (!filterOptions.templateTypes.includes(template.templateType)) {
      return false;
    }

    // Custom/System filter
    if (template.isCustom && !filterOptions.showCustom) return false;
    if (template.isSystemTemplate && !filterOptions.showSystem) return false;
    if (template.templateType === 'global' && !filterOptions.showGlobal) return false;

    // Category filter
    if (filterOptions.categories.length > 0 && !filterOptions.categories.includes(template.category)) {
      return false;
    }

    // Search filter
    if (filterOptions.searchTerm) {
      const searchLower = filterOptions.searchTerm.toLowerCase();
      return (
        template.name.toLowerCase().includes(searchLower) ||
        template.description?.toLowerCase().includes(searchLower) ||
        template.methodName.toLowerCase().includes(searchLower) ||
        template.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return true;
  });

  // Get unique categories for filter
  const availableCategories = [...new Set(templates.map(t => t.category))];

  // Template action handlers
  const handleTemplateEdit = (template: DataQualityTemplate) => {
    setSelectedTemplate(template);
    setShowEditModal(true);
  };

  const handleTemplateDelete = async (template: DataQualityTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;
    
    try {
      const response = await fetch(`/api/data-quality-templates/${template.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from local state
        setTemplates(templates.filter(t => t.id !== template.id));
        // Update stats
        fetchTemplates();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template');
    }
  };

  const handleTemplateDuplicate = async (template: DataQualityTemplate) => {
    const duplicateData = {
      ...template,
      name: `${template.name} (Copy)`,
      isSystemTemplate: false,
      isCustom: true,
      createdBy: 'user'
    };
    
    try {
      const response = await fetch('/api/data-quality-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(duplicateData)
      });
      
      if (response.ok) {
        fetchTemplates(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to duplicate template');
      }
    } catch (error) {
      console.error('Failed to duplicate template:', error);
      alert('Failed to duplicate template');
    }
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setShowCreateModal(true);
  };

  const handleSubmitTemplate = async (templateData: Partial<DataQualityTemplate>) => {
    try {
      const isEdit = selectedTemplate && selectedTemplate.id;
      const url = isEdit 
        ? `/api/data-quality-templates/${selectedTemplate.id}`
        : '/api/data-quality-templates';
      
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...templateData,
          createdBy: 'user',
          updatedBy: 'user'
        })
      });
      
      if (response.ok) {
        setShowCreateModal(false);
        setShowEditModal(false);
        setSelectedTemplate(null);
        fetchTemplates(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.message || `Failed to ${isEdit ? 'update' : 'create'} template`);
      }
    } catch (error) {
      console.error('Failed to submit template:', error);
      alert(`Failed to ${selectedTemplate ? 'update' : 'create'} template`);
    }
  };

  const handleTemplatePreview = (template: DataQualityTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };

  const handleExportTemplates = () => {
    const exportData = filteredTemplates.map(t => ({
      ...t,
      id: undefined // Remove ID for export
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-quality-templates-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTemplates = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedTemplates = JSON.parse(text);
      
      // TODO: Validate and import templates via API
      console.log('Import templates:', importedTemplates);
      alert(`Successfully imported ${importedTemplates.length} templates`);
    } catch (error) {
      console.error('Failed to import templates:', error);
      alert('Failed to import templates. Please check the file format.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Template Management</h1>
              <p className="mt-2 text-gray-600">
                Manage data quality templates for remediation, normalization, and global transformations
              </p>
            </div>
            <div className="flex space-x-3">
              <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportTemplates}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleExportTemplates}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export
              </button>
              <button
                onClick={handleCreateTemplate}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Template
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BeakerIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Templates</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalTemplates}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <SparklesIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">System</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.systemTemplates}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <PencilIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Custom</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.customTemplates}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Avg Success</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {Math.round(stats.avgSuccessRate * 100)}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChevronRightIcon className="h-6 w-6 text-orange-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Usage</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalUsage}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter and View Toggle */}
        <div className="mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <TemplateFilter
              options={filterOptions}
              onChange={setFilterOptions}
              availableCategories={availableCategories}
              showTemplateTypes={true}
            />
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveView('grid')}
                className={`p-2 rounded-md ${activeView === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Grid view"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setActiveView('table')}
                className={`p-2 rounded-md ${activeView === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Table view"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Templates Display */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <BeakerIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filterOptions.searchTerm 
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first template'}
            </p>
            {!filterOptions.searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Template
                </button>
              </div>
            )}
          </div>
        ) : activeView === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={{
                  id: template.id,
                  name: template.name,
                  description: template.description,
                  templateType: template.templateType,
                  category: template.category,
                  methodName: template.methodName,
                  usageCount: template.usageCount,
                  successRate: template.successRate,
                  avgProcessingTimeMs: template.avgProcessingTimeMs,
                  isSystemTemplate: template.isSystemTemplate,
                  isCustom: template.isCustom,
                  riskLevel: template.riskLevel,
                  tags: template.tags,
                  usageRecommendations: template.usageRecommendations,
                  exampleBefore: template.exampleBefore,
                  exampleAfter: template.exampleAfter,
                  configuration: template.configuration
                }}
                onEdit={() => handleTemplateEdit(template)}
                onDelete={() => handleTemplateDelete(template)}
                onDuplicate={() => handleTemplateDuplicate(template)}
                onPreview={() => handleTemplatePreview(template)}
                showActions={true}
              />
            ))}
          </div>
        ) : (
          <TemplateTable
            templates={filteredTemplates}
            onEdit={handleTemplateEdit}
            onDelete={handleTemplateDelete}
            onDuplicate={handleTemplateDuplicate}
            onPreview={handleTemplatePreview}
          />
        )}

        {/* Create/Edit Modal */}
        {(showCreateModal || showEditModal) && (
          <TemplateFormModal
            template={showEditModal ? selectedTemplate : null}
            onClose={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              setSelectedTemplate(null);
            }}
            onSave={handleSubmitTemplate}
          />
        )}

        {/* Preview Modal */}
        {showPreviewModal && selectedTemplate && (
          <TemplatePreviewModal
            template={selectedTemplate}
            onClose={() => {
              setShowPreviewModal(false);
              setSelectedTemplate(null);
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}

// Table View Component
function TemplateTable({ 
  templates, 
  onEdit, 
  onDelete, 
  onDuplicate, 
  onPreview 
}: {
  templates: DataQualityTemplate[];
  onEdit: (template: DataQualityTemplate) => void;
  onDelete: (template: DataQualityTemplate) => void;
  onDuplicate: (template: DataQualityTemplate) => void;
  onPreview: (template: DataQualityTemplate) => void;
}) {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Usage
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Success Rate
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Risk Level
            </th>
            <th className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {templates.map((template) => (
            <tr key={template.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">{template.name}</div>
                  <div className="text-sm text-gray-500">{template.methodName}</div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  template.templateType === 'normalization' ? 'bg-blue-100 text-blue-800' :
                  template.templateType === 'remediation' ? 'bg-orange-100 text-orange-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {template.templateType}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {template.category.replace(/_/g, ' ')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {template.usageCount}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`text-sm font-medium ${
                  template.successRate && template.successRate >= 0.9 ? 'text-green-600' :
                  template.successRate && template.successRate >= 0.75 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {template.successRate ? `${Math.round(template.successRate * 100)}%` : 'N/A'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  template.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                  template.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {template.riskLevel}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={() => onPreview(template)}
                    className="text-gray-400 hover:text-blue-600"
                    title="Preview"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  {!template.isSystemTemplate && (
                    <>
                      <button
                        onClick={() => onDuplicate(template)}
                        className="text-gray-400 hover:text-green-600"
                        title="Duplicate"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEdit(template)}
                        className="text-gray-400 hover:text-yellow-600"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {template.isCustom && (
                        <button
                          onClick={() => onDelete(template)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Template Form Modal
function TemplateFormModal({ 
  template, 
  onClose, 
  onSave 
}: {
  template: DataQualityTemplate | null;
  onClose: () => void;
  onSave: (template: Partial<DataQualityTemplate>) => void;
}) {
  const [formData, setFormData] = useState<Partial<DataQualityTemplate>>(
    template || {
      name: '',
      description: '',
      templateType: 'remediation',
      category: 'data_cleaning',
      methodName: '',
      parameters: {},
      configuration: {},
      applicableDataTypes: [],
      applicableFieldPatterns: [],
      confidenceThreshold: 0.8,
      riskLevel: 'medium',
      usageRecommendations: '',
      exampleBefore: undefined,
      exampleAfter: undefined,
      tags: [],
      isCustom: true,
      isSystemTemplate: false
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const templateData = {
      name: formData.name!,
      description: formData.description,
      templateType: formData.templateType,
      category: formData.category!,
      methodName: formData.methodName!,
      parameters: formData.parameters,
      configuration: formData.configuration,
      applicableDataTypes: formData.applicableDataTypes,
      applicableFieldPatterns: formData.applicableFieldPatterns,
      confidenceThreshold: formData.confidenceThreshold!,
      riskLevel: formData.riskLevel,
      usageRecommendations: formData.usageRecommendations,
      exampleBefore: formData.exampleBefore,
      exampleAfter: formData.exampleAfter,
      tags: formData.tags
    };

    onSave(templateData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {template ? 'Edit Template' : 'Create Template'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="col-span-2">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h4>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., Email Format Standardization"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Method Name *
                </label>
                <input
                  type="text"
                  value={formData.methodName}
                  onChange={(e) => setFormData({ ...formData, methodName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., standardize_email"
                  pattern="[a-z_]+"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Use lowercase with underscores</p>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={2}
                  placeholder="Describe what this template does"
                />
              </div>

              {/* Template Configuration */}
              <div className="col-span-2 border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Template Configuration</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Type *
                </label>
                <select
                  value={formData.templateType}
                  onChange={(e) => setFormData({ ...formData, templateType: e.target.value as 'remediation' | 'normalization' | 'global' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="remediation">Remediation</option>
                  <option value="normalization">Normalization</option>
                  <option value="global">Global</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="data_cleaning">Data Cleaning</option>
                  <option value="format_standardization">Format Standardization</option>
                  <option value="statistical_normalization">Statistical Normalization</option>
                  <option value="validation">Validation</option>
                  <option value="enrichment">Enrichment</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Risk Level *
                </label>
                <select
                  value={formData.riskLevel}
                  onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value as 'low' | 'medium' | 'high' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confidence Threshold
                </label>
                <input
                  type="number"
                  value={formData.confidenceThreshold}
                  onChange={(e) => setFormData({ ...formData, confidenceThreshold: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="0"
                  max="1"
                  step="0.05"
                />
              </div>

              {/* Examples */}
              <div className="col-span-2 border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Examples</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Example Before
                </label>
                <textarea
                  value={typeof formData.exampleBefore === 'string' ? formData.exampleBefore : JSON.stringify(formData.exampleBefore)}
                  onChange={(e) => {
                    try {
                      setFormData({ ...formData, exampleBefore: JSON.parse(e.target.value) });
                    } catch {
                      // If JSON parsing fails, wrap the string in an object or set undefined for empty values
                      setFormData({ 
                        ...formData, 
                        exampleBefore: e.target.value.trim() ? { value: e.target.value } : undefined 
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
                  rows={3}
                  placeholder="Original value example"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Example After
                </label>
                <textarea
                  value={typeof formData.exampleAfter === 'string' ? formData.exampleAfter : JSON.stringify(formData.exampleAfter)}
                  onChange={(e) => {
                    try {
                      setFormData({ ...formData, exampleAfter: JSON.parse(e.target.value) });
                    } catch {
                      // If JSON parsing fails, wrap the string in an object or set undefined for empty values
                      setFormData({ 
                        ...formData, 
                        exampleAfter: e.target.value.trim() ? { value: e.target.value } : undefined 
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
                  rows={3}
                  placeholder="Transformed value example"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usage Recommendations
                </label>
                <textarea
                  value={formData.usageRecommendations}
                  onChange={(e) => setFormData({ ...formData, usageRecommendations: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                  placeholder="When and how to use this template"
                />
              </div>

              {/* Advanced Settings */}
              <div className="col-span-2 border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Advanced Settings</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Applicable Data Types
                </label>
                <input
                  type="text"
                  value={formData.applicableDataTypes?.join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    applicableDataTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="numeric, string, date"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated list</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags?.join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="email, validation, format"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated list</p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                {template ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Template Preview Modal
function TemplatePreviewModal({ 
  template, 
  onClose 
}: {
  template: DataQualityTemplate;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium text-gray-900">Template Preview</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h4>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{template.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Method Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{template.methodName}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">{template.description || 'No description'}</dd>
                </div>
              </dl>
            </div>

            {/* Configuration */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Configuration</h4>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      template.templateType === 'normalization' ? 'bg-blue-100 text-blue-800' :
                      template.templateType === 'remediation' ? 'bg-orange-100 text-orange-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {template.templateType}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900">{template.category.replace(/_/g, ' ')}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Risk Level</dt>
                  <dd className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      template.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                      template.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {template.riskLevel}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Confidence Threshold</dt>
                  <dd className="mt-1 text-sm text-gray-900">{Math.round(template.confidenceThreshold * 100)}%</dd>
                </div>
              </dl>
            </div>

            {/* Usage Stats */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Usage Statistics</h4>
              <dl className="grid grid-cols-3 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Usage Count</dt>
                  <dd className="mt-1 text-sm text-gray-900">{template.usageCount}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Success Rate</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {template.successRate ? `${Math.round(template.successRate * 100)}%` : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Avg Processing Time</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {template.avgProcessingTimeMs ? `${template.avgProcessingTimeMs}ms` : 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Examples */}
            {(template.exampleBefore || template.exampleAfter) && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Examples</h4>
                <div className="grid grid-cols-2 gap-4">
                  {template.exampleBefore && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Before</p>
                      <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                        {typeof template.exampleBefore === 'string' 
                          ? template.exampleBefore 
                          : JSON.stringify(template.exampleBefore, null, 2)}
                      </pre>
                    </div>
                  )}
                  {template.exampleAfter && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">After</p>
                      <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                        {typeof template.exampleAfter === 'string' 
                          ? template.exampleAfter 
                          : JSON.stringify(template.exampleAfter, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Usage Recommendations */}
            {template.usageRecommendations && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Usage Recommendations</h4>
                <p className="text-sm text-gray-600">{template.usageRecommendations}</p>
              </div>
            )}

            {/* Metadata */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Metadata</h4>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created By</dt>
                  <dd className="mt-1 text-sm text-gray-900">{template.createdBy}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(template.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Version</dt>
                  <dd className="mt-1 text-sm text-gray-900">v{template.version}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Tags */}
            {template.tags && template.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}