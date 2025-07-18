'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import TemplateCard from '@/components/dataQuality/TemplateCard';
import TemplateFilter, { TemplateFilterOptions } from '@/components/dataQuality/TemplateFilter';
import { 
  PlusIcon, 
  PlayIcon, 
  PauseIcon,
  StopIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

interface NormalizationJob {
  id: string;
  name: string;
  dataSourceId: string;
  dataSourceName: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  totalRecords: number;
  normalizedRecords: number;
  skippedRecords: number;
  confidence: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletion?: string;
  errorMessage?: string;
  operationType: 'normalization';
  templatesApplied: string[];
}

interface DataQualityTemplate {
  id: string;
  name: string;
  description?: string;
  templateType: 'remediation' | 'normalization' | 'global';
  category: string;
  methodName: string;
  usageCount: number;
  successRate?: number;
  avgProcessingTimeMs?: number;
  isSystemTemplate: boolean;
  isCustom: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  tags?: string[];
  usageRecommendations?: string;
  exampleBefore?: Record<string, unknown>;
  exampleAfter?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
}

export default function NormalizationPage() {
  const [jobs, setJobs] = useState<NormalizationJob[]>([]);
  // Note: selectedJob functionality can be added later for job details view
  const [templates, setTemplates] = useState<DataQualityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'templates' | 'analytics'>('jobs');
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [filterOptions, setFilterOptions] = useState<TemplateFilterOptions>({
    showCustom: true,
    showSystem: false, // Default to hide system templates as requested
    showGlobal: true,
    templateTypes: ['normalization', 'global'],
    categories: [],
    searchTerm: ''
  });

  useEffect(() => {
    fetchJobs();
    initializeTemplates();
  }, []);

  const fetchJobs = async () => {
    try {
      console.log('Fetching normalization jobs...');
      const response = await fetch('/api/normalization/jobs');
      console.log('Jobs response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Jobs response:', data);
        
        // Handle both direct array and wrapped response
        const jobs = Array.isArray(data) ? data : (data.jobs || data.data || []);
        console.log('Parsed jobs:', jobs);
        setJobs(jobs);
      } else {
        console.error('Failed to fetch jobs:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeTemplates = async () => {
    try {
      console.log('Fetching data quality templates for normalization and global...');
      
      // Fetch both normalization and global templates
      const response = await fetch('/api/data-quality-templates?limit=100');
      console.log('Templates response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Templates response:', data);
        
        // Handle both direct array and wrapped response
        const allTemplates = Array.isArray(data) ? data : (data.templates || data.data || []);
        
        // Filter for normalization and global templates
        const relevantTemplates = allTemplates.filter((t: DataQualityTemplate) => 
          t.templateType === 'normalization' || t.templateType === 'global'
        );
        
        console.log('Filtered templates for normalization:', relevantTemplates);
        setTemplates(relevantTemplates);
      } else {
        console.error('Failed to fetch templates:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const startJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/normalization/jobs/${jobId}/start`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to start job:', error);
    }
  };

  const pauseJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/normalization/jobs/${jobId}/pause`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to pause job:', error);
    }
  };

  const cancelJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to cancel this job?')) return;
    
    try {
      const response = await fetch(`/api/normalization/jobs/${jobId}/cancel`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchJobs();
      }
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'failed': return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case 'running': return <ClockIcon className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'paused': return <PauseIcon className="h-5 w-5 text-yellow-600" />;
      case 'cancelled': return <StopIcon className="h-5 w-5 text-gray-600" />;
      default: return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-800 bg-green-100';
      case 'failed': return 'text-red-800 bg-red-100';
      case 'running': return 'text-blue-800 bg-blue-100';
      case 'paused': return 'text-yellow-800 bg-yellow-100';
      case 'cancelled': return 'text-gray-800 bg-gray-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const getProgressPercentage = (job: NormalizationJob) => {
    if (job.totalRecords === 0) return 0;
    const processed = job.normalizedRecords + job.skippedRecords;
    return Math.round((processed / job.totalRecords) * 100);
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
        template.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return true;
  });

  // Get unique categories for filter
  const availableCategories = [...new Set(templates.map(t => t.category))];

  // Template action handlers
  const handleTemplateEdit = (template: DataQualityTemplate) => {
    console.log('Edit template:', template);
    // TODO: Implement edit functionality
  };

  const handleTemplateDelete = async (template: DataQualityTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;
    console.log('Delete template:', template);
    // TODO: Implement delete functionality
  };

  const handleTemplateDuplicate = (template: DataQualityTemplate) => {
    console.log('Duplicate template:', template);
    // TODO: Implement duplicate functionality
  };

  const handleTemplatePreview = (template: DataQualityTemplate) => {
    console.log('Preview template:', template);
    // TODO: Implement preview functionality
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Data Normalization</h1>
          <p className="mt-2 text-gray-600">
            Standardize data formats and ensure consistency across your datasets.
          </p>
        </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['jobs', 'templates', 'analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'jobs' | 'templates' | 'analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">Normalization Jobs</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {jobs.filter(j => j.status === 'running').length} Running
              </span>
            </div>
            <button
              onClick={() => setShowCreateJob(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Job
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <AdjustmentsHorizontalIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No normalization jobs</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first normalization job to standardize your data.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateJob(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Job
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {jobs.map((job) => (
                  <li key={job.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(job.status)}
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{job.name}</h3>
                            <p className="text-sm text-gray-500">Data Source: {job.dataSourceName}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                          {job.status === 'pending' && (
                            <button
                              onClick={() => startJob(job.id)}
                              className="p-1 text-gray-400 hover:text-green-600"
                              title="Start Job"
                            >
                              <PlayIcon className="h-4 w-4" />
                            </button>
                          )}
                          {job.status === 'running' && (
                            <button
                              onClick={() => pauseJob(job.id)}
                              className="p-1 text-gray-400 hover:text-yellow-600"
                              title="Pause Job"
                            >
                              <PauseIcon className="h-4 w-4" />
                            </button>
                          )}
                          {(job.status === 'running' || job.status === 'paused') && (
                            <button
                              onClick={() => cancelJob(job.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Cancel Job"
                            >
                              <StopIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => console.log('View job details:', job)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
                          <span>Progress: {getProgressPercentage(job)}%</span>
                          <span>{job.normalizedRecords} / {job.totalRecords} records normalized</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${getProgressPercentage(job)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                        <span>Normalized: {job.normalizedRecords}</span>
                        <span>Skipped: {job.skippedRecords}</span>
                        <span>Templates: {job.templatesApplied?.length || 0}</span>
                        <span>Created: {new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Normalization Templates</h2>
            <p className="text-sm text-gray-500 mt-1">
              Pre-built and custom templates for standardizing and normalizing data formats
            </p>
          </div>

          {/* Template Filter */}
          <div className="mb-6">
            <TemplateFilter
              options={filterOptions}
              onChange={setFilterOptions}
              availableCategories={availableCategories}
              showTemplateTypes={false} // Hide template type filter since this is normalization page
            />
          </div>
          
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <AdjustmentsHorizontalIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filterOptions.searchTerm 
                  ? 'Try adjusting your search or filters'
                  : 'No templates match the current filters'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={handleTemplateEdit}
                  onDelete={handleTemplateDelete}
                  onDuplicate={handleTemplateDuplicate}
                  onPreview={handleTemplatePreview}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Normalization Analytics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Jobs</dt>
                      <dd className="text-lg font-medium text-gray-900">{jobs.length}</dd>
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
                      <dt className="text-sm font-medium text-gray-500 truncate">Completed Jobs</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {jobs.filter(j => j.status === 'completed').length}
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
                    <AdjustmentsHorizontalIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Records Normalized</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {jobs.reduce((sum, job) => sum + job.normalizedRecords, 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Job Modal */}
      {showCreateJob && (
        <CreateNormalizationJobModal
          onClose={() => setShowCreateJob(false)}
          onCreated={() => {
            setShowCreateJob(false);
            fetchJobs();
          }}
        />
      )}
      </div>
    </AppLayout>
  );
}

// Create Normalization Job Modal Component
function CreateNormalizationJobModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dataSourceId: '',
    selectedTemplates: [] as string[],
    applyToAllFields: true,
    fieldMappings: {} as Record<string, string[]>
  });
  const [dataSources, setDataSources] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDataSources();
    fetchTemplates();
  }, []);

  const fetchDataSources = async () => {
    try {
      console.log('Fetching data sources...');
      const response = await fetch('/api/data-sources');
      console.log('Data sources response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Data sources response:', data);
        
        // Handle both direct array and wrapped response
        const sources = Array.isArray(data) ? data : (data.dataSources || data.data || []);
        console.log('Parsed data sources:', sources);
        setDataSources(sources as Array<{ id: string; name: string; type: string }>);
      } else {
        console.error('Failed to fetch data sources:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch data sources:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/data-quality-templates?limit=100');
      if (response.ok) {
        const data = await response.json();
        const allTemplates = Array.isArray(data) ? data : (data.templates || data.data || []);
        
        // Filter for normalization and global templates
        const relevantTemplates = allTemplates.filter((t: DataQualityTemplate) => 
          t.templateType === 'normalization' || t.templateType === 'global'
        );
        
        setTemplates(relevantTemplates as Array<{ id: string; name: string; description?: string }>);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/normalization/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          dataSourceId: formData.dataSourceId,
          selectedTemplates: formData.selectedTemplates,
          operationType: 'normalization',
          createdBy: 'user'
        })
      });

      if (response.ok) {
        onCreated();
      } else {
        const error = await response.json();
        alert(`Failed to create job: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create job:', error);
      alert('Failed to create normalization job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create Normalization Job</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Job Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., Standardize email and phone formats"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={2}
                placeholder="Describe what this normalization job will standardize"
              />
            </div>

            {/* Data Source Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Source
              </label>
              <select
                value={formData.dataSourceId}
                onChange={(e) => setFormData({ ...formData, dataSourceId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Select a data source</option>
                {dataSources.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Normalization Templates
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
                {templates.map((template) => (
                  <label key={template.id} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={formData.selectedTemplates.includes(template.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ 
                            ...formData, 
                            selectedTemplates: [...formData.selectedTemplates, template.id] 
                          });
                        } else {
                          setFormData({ 
                            ...formData, 
                            selectedTemplates: formData.selectedTemplates.filter(id => id !== template.id) 
                          });
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-900">{template.name}</span>
                    {template.description && (
                      <span className="ml-2 text-xs text-gray-500">- {template.description}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex">
                <AdjustmentsHorizontalIcon className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Normalization Process</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    This job will standardize data formats across your dataset. Selected templates will be applied to normalize emails, phone numbers, dates, and other data types to ensure consistency.
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading || !formData.name || !formData.dataSourceId || formData.selectedTemplates.length === 0}
              >
                {loading ? 'Creating...' : 'Create Job'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}