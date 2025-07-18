'use client';

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import TemplateCard from '@/components/dataQuality/TemplateCard';
import TemplateFilter, { TemplateFilterOptions } from '@/components/dataQuality/TemplateFilter';
import { 
  PlusIcon, 
  PlayIcon, 
  PauseIcon,
  StopIcon,
  EyeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

interface RemediationJob {
  id: string;
  name: string;
  dataSourceId: string;
  dataSourceName: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  totalViolations: number;
  fixedViolations: number;
  rejectedCount: number;
  skippedCount: number;
  confidence: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCompletion?: string;
  errorMessage?: string;
}

interface RemediationAction {
  id: string;
  jobId: string;
  originalValue: unknown;
  suggestedValue: unknown;
  fieldName: string;
  fixMethod: string;
  confidence: number;
  status: 'pending' | 'applied' | 'rejected' | 'skipped';
  reviewedBy?: string;
  appliedAt?: string;
  rollbackData?: unknown;
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

export default function RemediationPage() {
  const [jobs, setJobs] = useState<RemediationJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<RemediationJob | null>(null);
  const [actions, setActions] = useState<RemediationAction[]>([]);
  const [templates, setTemplates] = useState<DataQualityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jobs' | 'actions' | 'templates' | 'analytics'>('jobs');
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [filterOptions, setFilterOptions] = useState<TemplateFilterOptions>({
    showCustom: true,
    showSystem: false,
    showGlobal: true,
    templateTypes: ['remediation', 'global'],
    categories: [],
    searchTerm: ''
  });

  useEffect(() => {
    fetchJobs();
    fetchTemplates();
  }, []);

  const fetchJobs = async () => {
    try {
      console.log('Fetching remediation jobs...');
      const response = await fetch('/api/remediation/jobs');
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

  const fetchTemplates = async () => {
    try {
      console.log('Fetching remediation templates...');
      // First try to initialize templates
      await fetch('/api/remediation/templates/initialize', { method: 'POST' });
      
      // Then fetch templates
      const response = await fetch('/api/remediation/templates?limit=50');
      console.log('Templates response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Templates response:', data);
        
        // Handle both direct array and wrapped response
        const templates = Array.isArray(data) ? data : (data.templates || data.data || []);
        console.log('Parsed templates:', templates);
        setTemplates(templates);
      } else {
        console.error('Failed to fetch templates:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchActions = async (jobId: string) => {
    try {
      const response = await fetch(`/api/remediation/jobs/${jobId}/actions`);
      if (response.ok) {
        const data = await response.json();
        const actions = Array.isArray(data) ? data : (data.actions || data.data || []);
        setActions(actions);
      }
    } catch (error) {
      console.error('Failed to fetch actions:', error);
    }
  };

  const startJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/remediation/jobs/${jobId}/start`, {
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
      const response = await fetch(`/api/remediation/jobs/${jobId}/pause`, {
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
      const response = await fetch(`/api/remediation/jobs/${jobId}/cancel`, {
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
      case 'applied': return 'text-green-800 bg-green-100';
      case 'failed': return 'text-red-800 bg-red-100';
      case 'rejected': return 'text-red-800 bg-red-100';
      case 'running': return 'text-blue-800 bg-blue-100';
      case 'paused': return 'text-yellow-800 bg-yellow-100';
      case 'cancelled': return 'text-gray-800 bg-gray-100';
      case 'skipped': return 'text-gray-800 bg-gray-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  const getProgressPercentage = (job: RemediationJob) => {
    if (job.totalViolations === 0) return 0;
    const processed = job.fixedViolations + job.rejectedCount + job.skippedCount;
    return Math.round((processed / job.totalViolations) * 100);
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
          <h1 className="text-3xl font-bold text-gray-900">Data Quality Remediation</h1>
          <p className="mt-2 text-gray-600">
            Automatically fix data quality issues identified by quality rules with confidence scoring and rollback capabilities.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['jobs', 'actions', 'templates', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'jobs' | 'actions' | 'templates' | 'analytics')}
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
                <h2 className="text-xl font-semibold text-gray-900">Remediation Jobs</h2>
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
                <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No remediation jobs</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first remediation job to fix data quality issues.
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
                              onClick={() => {
                                setSelectedJob(job);
                                fetchActions(job.id);
                                setActiveTab('actions');
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="View Actions"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
                            <span>Progress: {getProgressPercentage(job)}%</span>
                            <span>{job.fixedViolations} / {job.totalViolations} fixed</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${getProgressPercentage(job)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                          <span>Fixed: {job.fixedViolations}</span>
                          <span>Rejected: {job.rejectedCount}</span>
                          <span>Skipped: {job.skippedCount}</span>
                          <span>Confidence: {Math.round(job.confidence * 100)}%</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && selectedJob && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Actions for: {selectedJob.name}
              </h2>
              <p className="text-sm text-gray-500">
                Review and manage individual remediation actions
              </p>
            </div>

            {actions.length === 0 ? (
              <div className="text-center py-12">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No actions found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  This job has not generated any remediation actions yet.
                </p>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {actions.map((action) => (
                    <li key={action.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-sm font-medium text-gray-900">
                                Field: {action.fieldName}
                              </h3>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(action.status)}`}>
                                {action.status}
                              </span>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-500">Original Value:</p>
                                <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                                  {JSON.stringify(action.originalValue)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Suggested Value:</p>
                                <p className="text-sm font-mono bg-green-100 p-2 rounded">
                                  {JSON.stringify(action.suggestedValue)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {Math.round(action.confidence * 100)}% confidence
                            </p>
                            <p className="text-sm text-gray-500">
                              Method: {action.fixMethod}
                            </p>
                          </div>
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
              <h2 className="text-xl font-semibold text-gray-900">Remediation Templates</h2>
              <p className="text-sm text-gray-500 mt-1">
                Pre-built and custom templates for fixing common data quality issues
              </p>
            </div>

            {/* Template Filter */}
            <div className="mb-6">
              <TemplateFilter
                options={filterOptions}
                onChange={setFilterOptions}
                availableCategories={availableCategories}
                showTemplateTypes={false} // Hide template type filter since this is remediation page
              />
            </div>
            
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
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
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Remediation Analytics</h2>
            
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
                        <dt className="text-sm font-medium text-gray-500 truncate">Violations Fixed</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {jobs.reduce((sum, job) => sum + job.fixedViolations, 0)}
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
                      <ArrowPathIcon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Avg Confidence</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {jobs.length > 0
                            ? Math.round((jobs.reduce((sum, job) => sum + job.confidence, 0) / jobs.length) * 100)
                            : 0}%
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Usage Stats */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Template Performance</h3>
              <div className="space-y-4">
                {templates
                  .filter(t => t.usageCount > 0)
                  .sort((a, b) => b.usageCount - a.usageCount)
                  .slice(0, 5)
                  .map(template => (
                    <div key={template.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{template.name}</p>
                        <p className="text-sm text-gray-500">
                          Used {template.usageCount} times • {Math.round((template.successRate || 0) * 100)}% success
                        </p>
                      </div>
                      <div className="ml-4">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${(template.successRate || 0) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Create Job Modal */}
        {showCreateJob && (
          <CreateRemediationJobModal
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

// Create Remediation Job Modal Component
function CreateRemediationJobModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dataSourceId: '',
    autoApply: false,
    confidenceThreshold: 0.8,
    ruleIds: [] as string[],
    useRuleViolations: true
  });
  const [dataSources, setDataSources] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [rules, setRules] = useState<Array<{ id: string; name: string; category: string }>>([]);
  const [violations, setViolations] = useState<Array<{ ruleId: string; count: number; ruleName: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDataSources();
    fetchRules();
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
        setDataSources(sources);
      } else {
        console.error('Failed to fetch data sources:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch data sources:', error);
    }
  };

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/quality-rules');
      if (response.ok) {
        const data = await response.json();
        const rules = Array.isArray(data) ? data : (data.rules || data.data || []);
        setRules(rules);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    }
  };

  const fetchViolations = useCallback(async () => {
    if (!formData.dataSourceId || formData.ruleIds.length === 0) return;
    
    try {
      // Mock violations for now
      const mockViolations = formData.ruleIds.map(ruleId => ({
        ruleId,
        count: Math.floor(Math.random() * 50) + 10,
        ruleName: rules.find(r => r.id === ruleId)?.name || 'Unknown Rule'
      }));
      setViolations(mockViolations);
    } catch (error) {
      console.error('Failed to fetch violations:', error);
    }
  }, [formData.dataSourceId, formData.ruleIds, rules]);

  useEffect(() => {
    if (formData.useRuleViolations) {
      fetchViolations();
    }
  }, [formData.useRuleViolations, fetchViolations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/remediation/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          violations: violations.map(v => ({
            ruleId: v.ruleId,
            ruleName: v.ruleName,
            violationCount: v.count
          })),
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
      alert('Failed to create remediation job');
    } finally {
      setLoading(false);
    }
  };

  const totalViolations = violations.reduce((sum, v) => sum + v.count, 0);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create Remediation Job</h3>
          
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
                placeholder="e.g., Fix email validation issues"
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
                placeholder="Describe what this job will fix"
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

            {/* Rule Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <input
                  type="checkbox"
                  checked={formData.useRuleViolations}
                  onChange={(e) => setFormData({ ...formData, useRuleViolations: e.target.checked })}
                  className="mr-2"
                />
                Fix violations from quality rules
              </label>
              {formData.useRuleViolations && (
                <div className="mt-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
                  {rules.map((rule) => (
                    <label key={rule.id} className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        checked={formData.ruleIds.includes(rule.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, ruleIds: [...formData.ruleIds, rule.id] });
                          } else {
                            setFormData({ ...formData, ruleIds: formData.ruleIds.filter(id => id !== rule.id) });
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-900">{rule.name}</span>
                      <span className="ml-2 text-xs text-gray-500">({rule.category})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Violation Summary */}
            {violations.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Violations to Fix</h4>
                <div className="space-y-1">
                  {violations.map((v) => (
                    <div key={v.ruleId} className="flex justify-between text-sm">
                      <span className="text-blue-700">{v.ruleName}</span>
                      <span className="font-medium text-blue-900">{v.count} violations</span>
                    </div>
                  ))}
                  <div className="border-t border-blue-200 pt-1 mt-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-blue-900">Total Violations</span>
                      <span className="text-blue-900">{totalViolations}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings */}
            <div className="space-y-3">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.autoApply}
                    onChange={(e) => setFormData({ ...formData, autoApply: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Auto-apply fixes above confidence threshold
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confidence Threshold: {Math.round(formData.confidenceThreshold * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.confidenceThreshold * 100}
                  onChange={(e) => setFormData({ ...formData, confidenceThreshold: parseInt(e.target.value) / 100 })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
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
                disabled={loading || !formData.name || !formData.dataSourceId || (formData.useRuleViolations && formData.ruleIds.length === 0)}
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