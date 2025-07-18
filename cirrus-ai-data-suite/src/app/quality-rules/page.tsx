'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { 
  PlusIcon, 
  PlayIcon, 
  TrashIcon,
  PencilIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  BoltIcon,
  StopIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface QualityRule {
  id: string;
  name: string;
  description?: string;
  category: 'completeness' | 'uniqueness' | 'validity' | 'consistency' | 'accuracy' | 'timeliness';
  fieldName: string;
  ruleType: 'not_null' | 'unique' | 'range' | 'pattern' | 'reference' | 'custom';
  conditions: unknown[];
  isActive: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  lastExecuted?: string;
  executionCount: number;
  violationCount: number;
  successRate: number;
}

interface RuleExecution {
  id: string;
  ruleId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  dataSourceId: string;
  dataSourceName: string;
  violationsFound: number;
  recordsChecked: number;
  executedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface ViolationRecord {
  id: string;
  recordId: string;
  fieldName: string;
  originalValue: unknown;
  violationType: string;
  description: string;
  rowNumber: number;
  context?: Record<string, unknown>;
}

export default function QualityRulesPage() {
  const [rules, setRules] = useState<QualityRule[]>([]);
  const [executions, setExecutions] = useState<RuleExecution[]>([]);
  const [selectedRule, setSelectedRule] = useState<QualityRule | null>(null);
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [loading, setLoading] = useState(true);
  const [executingRules, setExecutingRules] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'rules' | 'executions' | 'analytics'>('rules');
  const [selectedExecution, setSelectedExecution] = useState<RuleExecution | null>(null);
  const [violationDetails, setViolationDetails] = useState<ViolationRecord[]>([]);
  const [showViolationsModal, setShowViolationsModal] = useState(false);

  // Fetch rules on component mount
  useEffect(() => {
    fetchRules();
    fetchExecutions();
  }, []);

  const fetchRules = async () => {
    try {
      console.log('Fetching quality rules...');
      const response = await fetch('/api/quality-rules');
      console.log('Rules response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Rules response:', data);
        
        // Handle both direct array and wrapped response
        const rules = Array.isArray(data) ? data : (data.rules || data.data || []);
        console.log('Parsed rules:', rules);
        setRules(rules);
      } else {
        console.error('Failed to fetch rules:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutions = async () => {
    try {
      console.log('Fetching rule executions...');
      const response = await fetch('/api/quality-rules/executions?limit=20');
      console.log('Executions response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Executions response:', data);
        
        // Handle both direct array and wrapped response
        const executions = Array.isArray(data) ? data : (data.executions || data.data || []);
        console.log('Parsed executions:', executions);
        setExecutions(executions);
      } else {
        console.error('Failed to fetch executions:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    }
  };

  const executeRule = async (ruleId: string) => {
    try {
      // Add to executing set to show loading state
      setExecutingRules(prev => new Set([...prev, ruleId]));
      
      console.log('Executing rule:', ruleId);
      const response = await fetch(`/api/quality-rules/${ruleId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataSourceId: 'ds-1' }) // Mock data source for testing
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Rule execution result:', result);
        
        // Show success message
        alert(`Rule executed successfully! Found ${result.data?.violationsFound || 0} violations.`);
        
        // Refresh data
        fetchExecutions();
        fetchRules();
      } else {
        const error = await response.json();
        console.error('Rule execution failed:', error);
        alert(`Failed to execute rule: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to execute rule:', error);
      alert('Failed to execute rule. Please try again.');
    } finally {
      // Remove from executing set
      setExecutingRules(prev => {
        const newSet = new Set(prev);
        newSet.delete(ruleId);
        return newSet;
      });
    }
  };

  const fetchViolationDetails = async (executionId: string) => {
    try {
      console.log('Fetching violation details for execution:', executionId);
      const response = await fetch(`/api/quality-rules/executions/${executionId}/violations`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Violation details response:', data);
        
        const violations = Array.isArray(data) ? data : (data.violations || data.data || []);
        setViolationDetails(violations);
        setShowViolationsModal(true);
      } else {
        console.error('Failed to fetch violation details:', response.status);
        alert('Failed to load violation details');
      }
    } catch (error) {
      console.error('Failed to fetch violation details:', error);
      alert('Failed to load violation details');
    }
  };

  const toggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/quality-rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      const response = await fetch(`/api/quality-rules/${ruleId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'completeness': return '📋';
      case 'uniqueness': return '🔄';
      case 'validity': return '✅';
      case 'consistency': return '⚖️';
      case 'accuracy': return '🎯';
      case 'timeliness': return '⏰';
      default: return '📊';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircleIcon className="h-4 w-4 text-red-600" />;
      case 'running': return <ClockIcon className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <ClockIcon className="h-4 w-4 text-gray-400" />;
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Data Quality Rules Engine</h1>
          <p className="mt-2 text-gray-600">
            Define, manage, and execute data quality rules to ensure data integrity across your sources.
          </p>
        </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['rules', 'executions', 'analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'rules' | 'executions' | 'analytics')}
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

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">Quality Rules</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {rules.filter(r => r.isActive).length} Active
              </span>
            </div>
            <button
              onClick={() => setShowCreateRule(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Rule
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-12">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No rules defined</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first data quality rule.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateRule(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Rule
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {rules.map((rule) => (
                  <li key={rule.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getCategoryIcon(rule.category)}</span>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{rule.name}</h3>
                            <p className="text-sm text-gray-500">{rule.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(rule.severity)}`}>
                            {rule.severity}
                          </span>
                          <button
                            onClick={() => executeRule(rule.id)}
                            disabled={executingRules.has(rule.id)}
                            className={`p-1 ${executingRules.has(rule.id) ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-blue-600'}`}
                            title="Execute Rule Now"
                          >
                            {executingRules.has(rule.id) ? (
                              <ClockIcon className="h-4 w-4 animate-spin" />
                            ) : (
                              <BoltIcon className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => toggleRule(rule.id, !rule.isActive)}
                            className={`p-1 ${rule.isActive ? 'text-green-600 hover:text-yellow-600' : 'text-gray-400 hover:text-green-600'}`}
                            title={rule.isActive ? 'Deactivate Rule' : 'Activate Rule'}
                          >
                            {rule.isActive ? <StopIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => setSelectedRule(rule)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Edit Rule"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete Rule"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                        <span>Field: {rule.fieldName}</span>
                        <span>Type: {rule.ruleType}</span>
                        <span>Executions: {rule.executionCount}</span>
                        <span>Success Rate: {Math.round(rule.successRate * 100)}%</span>
                        {rule.lastExecuted && (
                          <span>Last run: {new Date(rule.lastExecuted).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Executions Tab */}
      {activeTab === 'executions' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Executions</h2>
          
          {executions.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No executions yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Rule executions will appear here once you run your first rule.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {executions.map((execution) => (
                  <li key={execution.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(execution.status)}
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {execution.dataSourceName}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Rule: {rules.find(r => r.id === execution.ruleId)?.name || 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {execution.violationsFound} violations
                            </p>
                            <p className="text-sm text-gray-500">
                              {execution.recordsChecked} records checked
                            </p>
                          </div>
                          {execution.violationsFound > 0 && execution.status === 'completed' && (
                            <button
                              onClick={() => fetchViolationDetails(execution.id)}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              title="View Violation Details"
                            >
                              <EyeIcon className="h-3 w-3 mr-1" />
                              View Details
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                        <span>Started: {new Date(execution.executedAt).toLocaleString()}</span>
                        {execution.completedAt && (
                          <span>Completed: {new Date(execution.completedAt).toLocaleString()}</span>
                        )}
                        {execution.errorMessage && (
                          <span className="text-red-600">Error: {execution.errorMessage}</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Rule Analytics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Rules</dt>
                      <dd className="text-lg font-medium text-gray-900">{rules.length}</dd>
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
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Rules</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {rules.filter(r => r.isActive).length}
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
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Violations</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {rules.reduce((sum, rule) => sum + rule.violationCount, 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rule Performance</h3>
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{rule.name}</h4>
                    <p className="text-sm text-gray-500">{rule.category}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {rule.executionCount} executions
                      </p>
                      <p className="text-sm text-gray-500">
                        {rule.violationCount} violations
                      </p>
                    </div>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${rule.successRate * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12">
                      {Math.round(rule.successRate * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {showCreateRule && (
        <CreateRuleModal
          onClose={() => setShowCreateRule(false)}
          onCreated={() => {
            setShowCreateRule(false);
            fetchRules();
          }}
        />
      )}

      {/* Edit Rule Modal */}
      {selectedRule && (
        <EditRuleModal
          rule={selectedRule}
          onClose={() => setSelectedRule(null)}
          onUpdated={() => {
            setSelectedRule(null);
            fetchRules();
          }}
        />
      )}

      {/* Violations Details Modal */}
      {showViolationsModal && (
        <ViolationsModal
          violations={violationDetails}
          execution={selectedExecution}
          onClose={() => {
            setShowViolationsModal(false);
            setViolationDetails([]);
            setSelectedExecution(null);
          }}
        />
      )}
      </div>
    </AppLayout>
  );
}

// Create Rule Modal Component
interface RuleFormData {
  name: string;
  description: string;
  category: QualityRule['category'];
  fieldName: string;
  ruleType: QualityRule['ruleType'];
  severity: QualityRule['severity'];
  isActive: boolean;
  conditions: unknown[];
  minValue?: string;
  maxValue?: string;
  pattern?: string;
  referenceField?: string;
  [key: string]: unknown;
}

function CreateRuleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [formData, setFormData] = useState<RuleFormData>({
    name: '',
    description: '',
    category: 'completeness',
    fieldName: '',
    ruleType: 'not_null',
    severity: 'medium',
    isActive: true,
    conditions: []
  });
  const [dataSources, setDataSources] = useState<{ id: string; name: string; type: string }[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState('');
  const [fields, setFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDataSources();
  }, []);

  useEffect(() => {
    if (selectedDataSource) {
      fetchFields(selectedDataSource);
    }
  }, [selectedDataSource]);

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

  const fetchFields = async (dataSourceId: string) => {
    try {
      const response = await fetch(`/api/data-sources/${dataSourceId}/transform`);
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          setFields(Object.keys(data.data[0]));
        }
      }
    } catch (error) {
      console.error('Failed to fetch fields:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Build conditions based on rule type
    const conditions = buildConditions(formData.ruleType, formData);

    try {
      const response = await fetch('/api/quality-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          conditions,
          dataSourceId: selectedDataSource
        })
      });

      if (response.ok) {
        onCreated();
      } else {
        const error = await response.json();
        alert(`Failed to create rule: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create rule:', error);
      alert('Failed to create rule');
    } finally {
      setLoading(false);
    }
  };

  const buildConditions = (ruleType: string, data: Record<string, unknown>) => {
    switch (ruleType) {
      case 'not_null':
        return [{ operator: 'is_not_null', value: null }];
      case 'unique':
        return [{ operator: 'is_unique', value: null }];
      case 'range':
        return [
          { operator: 'gte', value: data.minValue || 0 },
          { operator: 'lte', value: data.maxValue || 100 }
        ];
      case 'pattern':
        return [{ operator: 'matches', value: data.pattern || '' }];
      case 'reference':
        return [{ operator: 'in_reference', value: data.referenceField || '' }];
      default:
        return [];
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create Quality Rule</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Data Source Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Source
              </label>
              <select
                value={selectedDataSource}
                onChange={(e) => setSelectedDataSource(e.target.value)}
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

            {/* Rule Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g., Email must not be null"
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
                placeholder="Describe the purpose of this rule"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as QualityRule['category'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="completeness">Completeness</option>
                  <option value="uniqueness">Uniqueness</option>
                  <option value="validity">Validity</option>
                  <option value="consistency">Consistency</option>
                  <option value="accuracy">Accuracy</option>
                  <option value="timeliness">Timeliness</option>
                </select>
              </div>

              {/* Field Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field Name
                </label>
                {fields.length > 0 ? (
                  <select
                    value={formData.fieldName}
                    onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a field</option>
                    {fields.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.fieldName}
                    onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter field name"
                    required
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Rule Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Type
                </label>
                <select
                  value={formData.ruleType}
                  onChange={(e) => setFormData({ ...formData, ruleType: e.target.value as QualityRule['ruleType'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="not_null">Not Null</option>
                  <option value="unique">Unique</option>
                  <option value="range">Range</option>
                  <option value="pattern">Pattern Match</option>
                  <option value="reference">Reference Check</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as QualityRule['severity'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Rule Type Specific Fields */}
            {formData.ruleType === 'range' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Value
                  </label>
                  <input
                    type="number"
                    value={formData.minValue || ''}
                    onChange={(e) => setFormData({ ...formData, minValue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Value
                  </label>
                  <input
                    type="number"
                    value={formData.maxValue || ''}
                    onChange={(e) => setFormData({ ...formData, maxValue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="100"
                  />
                </div>
              </div>
            )}

            {formData.ruleType === 'pattern' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pattern (Regular Expression)
                </label>
                <input
                  type="text"
                  value={formData.pattern || ''}
                  onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., ^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$"
                />
              </div>
            )}

            {formData.ruleType === 'reference' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Field
                </label>
                <select
                  value={formData.referenceField || ''}
                  onChange={(e) => setFormData({ ...formData, referenceField: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select reference field</option>
                  {fields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                Active (rule will be executed automatically)
              </label>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Rule Type Information</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    {formData.ruleType === 'not_null' && 'Checks that the field value is not null or empty.'}
                    {formData.ruleType === 'unique' && 'Ensures all values in the field are unique across the dataset.'}
                    {formData.ruleType === 'range' && 'Validates that numeric values fall within the specified range.'}
                    {formData.ruleType === 'pattern' && 'Matches field values against a regular expression pattern.'}
                    {formData.ruleType === 'reference' && 'Checks that values exist in a reference field or lookup table.'}
                    {formData.ruleType === 'custom' && 'Define custom validation logic using expressions.'}
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
                disabled={loading || !selectedDataSource || !formData.name || !formData.fieldName}
              >
                {loading ? 'Creating...' : 'Create Rule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Edit Rule Modal Component
function EditRuleModal({ rule, onClose, onUpdated }: { rule: QualityRule; onClose: () => void; onUpdated: () => void }) {
  const [formData, setFormData] = useState({
    name: rule.name,
    description: rule.description || '',
    severity: rule.severity,
    isActive: rule.isActive
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/quality-rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onUpdated();
      } else {
        const error = await response.json();
        alert(`Failed to update rule: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to update rule:', error);
      alert('Failed to update rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Quality Rule</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as QualityRule['severity'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActiveEdit"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActiveEdit" className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Field:</strong> {rule.fieldName}<br />
                <strong>Type:</strong> {rule.ruleType}<br />
                <strong>Category:</strong> {rule.category}
              </p>
            </div>

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
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Rule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Violations Modal Component
function ViolationsModal({ 
  violations, 
  execution, 
  onClose 
}: { 
  violations: ViolationRecord[]; 
  execution: RuleExecution | null; 
  onClose: () => void; 
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Violation Details</h3>
              {execution && (
                <p className="text-sm text-gray-500 mt-1">
                  Execution from {new Date(execution.executedAt).toLocaleString()} • 
                  {violations.length} violations found
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {violations.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No violation details available</h3>
              <p className="mt-1 text-sm text-gray-500">
                This execution completed without detailed violation records.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    Violation Records ({violations.length} total)
                  </h4>
                  <div className="text-xs text-gray-500">
                    Showing record details that failed the quality rule
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <ul className="divide-y divide-gray-200">
                  {violations.map((violation, index) => (
                    <li key={violation.id || index} className="px-4 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-red-600">
                                  {violation.rowNumber || index + 1}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">
                                {violation.fieldName} - {violation.violationType}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                {violation.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Original Value
                              </p>
                              <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm font-mono">
                                {violation.originalValue === null || violation.originalValue === undefined 
                                  ? <span className="text-gray-400 italic">null</span>
                                  : JSON.stringify(violation.originalValue)
                                }
                              </div>
                            </div>
                            
                            {violation.context && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Context
                                </p>
                                <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                                  {typeof violation.context === 'object' 
                                    ? JSON.stringify(violation.context, null, 2)
                                    : violation.context
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="ml-4 flex-shrink-0">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Row {violation.rowNumber || index + 1}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Total violations: <span className="font-medium">{violations.length}</span>
                  </p>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}