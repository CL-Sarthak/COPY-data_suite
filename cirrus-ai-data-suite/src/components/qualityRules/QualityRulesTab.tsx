import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Settings, Play, Edit, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { QualityRule, RuleExecution, TestRuleResponse } from '@/types/qualityRules';
import { RuleBuilder } from './RuleBuilder';

interface QualityRulesTabProps {
  dataSourceId: string;
  dataSourceName: string;
  availableFields: string[];
}

export const QualityRulesTab: React.FC<QualityRulesTabProps> = ({
  dataSourceId,
  dataSourceName,
  availableFields
}) => {
  const [rules, setRules] = useState<QualityRule[]>([]);
  const [executions, setExecutions] = useState<RuleExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<QualityRule | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const response = await fetch('/api/quality-rules');
      if (response.ok) {
        const data = await response.json();
        setRules(data);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExecutions = useCallback(async () => {
    try {
      const response = await fetch(`/api/quality-rules/executions?dataSourceId=${dataSourceId}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setExecutions(data);
      }
    } catch (error) {
      console.error('Error fetching executions:', error);
    }
  }, [dataSourceId]);

  useEffect(() => {
    fetchRules();
    fetchExecutions();
  }, [fetchRules, fetchExecutions]);

  const handleCreateRule = () => {
    setEditingRule(null);
    setShowRuleBuilder(true);
  };

  const handleEditRule = (rule: QualityRule) => {
    setEditingRule(rule);
    setShowRuleBuilder(true);
  };

  const handleSaveRule = async (rule: Partial<QualityRule>) => {
    try {
      const url = editingRule ? `/api/quality-rules/${editingRule.id}` : '/api/quality-rules';
      const method = editingRule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule })
      });

      if (response.ok) {
        setShowRuleBuilder(false);
        setEditingRule(null);
        fetchRules();
      }
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const handleTestRule = async (rule: Partial<QualityRule>): Promise<TestRuleResponse> => {
    const response = await fetch('/api/quality-rules/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rule,
        dataSourceId,
        sampleSize: 100
      })
    });

    if (!response.ok) {
      throw new Error('Failed to test rule');
    }

    return response.json();
  };

  const handleExecuteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/quality-rules/${ruleId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataSourceId })
      });

      if (response.ok) {
        fetchExecutions();
      }
    } catch (error) {
      console.error('Error executing rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await fetch(`/api/quality-rules/${ruleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const getRuleStatusIcon = (rule: QualityRule) => {
    if (rule.status === 'active') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (rule.status === 'inactive') {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    } else {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (showRuleBuilder) {
    return (
      <RuleBuilder
        rule={editingRule || undefined}
        availableFields={availableFields}
        dataSourceId={dataSourceId}
        onSave={handleSaveRule}
        onCancel={() => {
          setShowRuleBuilder(false);
          setEditingRule(null);
        }}
        onTest={handleTestRule}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Quality Rules</h3>
          <p className="text-sm text-gray-600 mt-1">
            Define and manage quality validation rules for {dataSourceName}
          </p>
        </div>
        <button
          onClick={handleCreateRule}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Rule</span>
        </button>
      </div>

      {/* Rules Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Rules</p>
              <p className="text-2xl font-bold text-gray-900">{rules.length}</p>
            </div>
            <Settings className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Active Rules</p>
              <p className="text-2xl font-bold text-green-600">
                {rules.filter(r => r.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Recent Executions</p>
              <p className="text-2xl font-bold text-blue-600">{executions.length}</p>
            </div>
            <Play className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Violations Found</p>
              <p className="text-2xl font-bold text-red-600">
                {executions.reduce((sum, e) => sum + e.summary.violationsFound, 0)}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Rules</h4>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading rules...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No rules defined</h3>
            <p className="text-gray-600 mb-4">
              Create your first quality rule to start validating your data.
            </p>
            <button
              onClick={handleCreateRule}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Rule</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {rules.map(rule => (
              <div key={rule.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      {getRuleStatusIcon(rule)}
                      <h4 className="text-lg font-medium text-gray-900">{rule.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(rule.priority)}`}>
                        {rule.priority}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full">
                        {rule.type}
                      </span>
                    </div>
                    
                    {rule.description && (
                      <p className="text-gray-600 mt-1">{rule.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>Category: {rule.category || 'Uncategorized'}</span>
                      <span>•</span>
                      <span>Actions: {rule.actions.length}</span>
                      {rule.metadata && (
                        <>
                          <span>•</span>
                          <span>Version: {rule.metadata.version}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleExecuteRule(rule.id)}
                      className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
                      title="Execute rule"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleEditRule(rule)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit rule"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Executions */}
      {executions.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Recent Executions</h4>
          </div>
          
          <div className="divide-y divide-gray-200">
            {executions.slice(0, 5).map(execution => (
              <div key={execution.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{execution.ruleName}</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        execution.status === 'success' ? 'text-green-600 bg-green-50' :
                        execution.status === 'failed' ? 'text-red-600 bg-red-50' :
                        'text-yellow-600 bg-yellow-50'
                      }`}>
                        {execution.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {new Date(execution.executionTime).toLocaleString()} • 
                      Duration: {execution.duration}ms
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {execution.summary.recordsProcessed} records processed
                    </div>
                    {execution.summary.violationsFound > 0 && (
                      <div className="text-sm text-red-600">
                        {execution.summary.violationsFound} violations found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};