import React, { useState, useEffect, useCallback } from 'react';
import { Save, TestTube, AlertCircle, CheckCircle, X, AlertTriangle, Info } from 'lucide-react';
import { QualityRule, RuleType, RulePriority, ConditionGroup, RuleAction, TestRuleResponse } from '@/types/qualityRules';
import { RuleConditionGroupComponent } from './RuleConditionGroup';
import { RuleActionBuilder } from './RuleActionBuilder';
import { ValidationResult } from '@/services/ruleValidationService';
// Use crypto.randomUUID() instead of uuid package

interface RuleBuilderProps {
  rule?: Partial<QualityRule>;
  availableFields: string[];
  dataSourceId?: string;
  onSave: (rule: Partial<QualityRule>) => Promise<void>;
  onCancel: () => void;
  onTest?: (rule: Partial<QualityRule>) => Promise<TestRuleResponse>;
}

const RULE_TYPES: { value: RuleType; label: string; description: string }[] = [
  { value: 'validation', label: 'Validation', description: 'Check data quality and flag violations' },
  { value: 'transformation', label: 'Transformation', description: 'Modify data when conditions are met' },
  { value: 'alert', label: 'Alert', description: 'Send notifications when conditions are met' }
];

const RULE_PRIORITIES: { value: RulePriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'low', label: 'Low', color: 'text-green-600' }
];

const CATEGORIES = [
  'Format Validation',
  'Business Logic',
  'Data Completeness',
  'Compliance',
  'Data Consistency',
  'Custom'
];

export const RuleBuilder: React.FC<RuleBuilderProps> = ({
  rule: initialRule,
  availableFields,
  dataSourceId,
  onSave,
  onCancel,
  onTest
}) => {
  const [rule, setRule] = useState<Partial<QualityRule>>(() => ({
    name: '',
    description: '',
    type: 'validation',
    status: 'draft',
    priority: 'medium',
    category: '',
    conditions: {
      id: crypto.randomUUID(),
      operator: 'AND',
      conditions: [{
        id: crypto.randomUUID(),
        field: '',
        operator: 'equals',
        value: ''
      }]
    },
    actions: [{
      id: crypto.randomUUID(),
      type: 'flag_violation',
      params: {
        severity: 'error',
        message: 'Quality rule violation detected'
      }
    }],
    config: {
      enabled: true,
      runOnUpload: false,
      runOnDemand: true,
      stopOnFailure: false
    },
    ...initialRule
  }));

  const [isValid, setIsValid] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestRuleResponse | null>(null);
  const [showTestResults, setShowTestResults] = useState(false);

  // Debounced validation
  const validateRule = useCallback(
    async (ruleToValidate: Partial<QualityRule>) => {
      setIsValidating(true);
      try {
        const response = await fetch('/api/quality-rules/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rule: ruleToValidate,
            availableFields
          })
        });

        if (response.ok) {
          const data = await response.json();
          setValidationResult(data.validation);
          setIsValid(data.validation.isValid);
        } else {
          console.error('Validation failed:', response.status);
          setValidationResult(null);
          setIsValid(false);
        }
      } catch (error) {
        console.error('Error validating rule:', error);
        setValidationResult(null);
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    },
    [availableFields]
  );

  // Validation with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateRule(rule);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [rule, validateRule]);

  const handleBasicInfoChange = (field: string, value: unknown) => {
    setRule(prev => ({ ...prev, [field]: value }));
  };

  const handleConditionsChange = (conditions: ConditionGroup) => {
    setRule(prev => ({ ...prev, conditions }));
  };

  const handleActionsChange = (actions: RuleAction[]) => {
    setRule(prev => ({ ...prev, actions }));
  };

  const handleConfigChange = (field: string, value: unknown) => {
    setRule(prev => ({
      ...prev,
      config: { 
        enabled: true,
        runOnUpload: false,
        runOnDemand: true,
        stopOnFailure: false,
        ...prev.config, 
        [field]: value 
      }
    }));
  };

  const handleTest = async () => {
    if (!onTest || !isValid) return;

    setIsTesting(true);
    try {
      const results = await onTest(rule);
      setTestResults(results);
      setShowTestResults(true);
    } catch (error) {
      console.error('Error testing rule:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!isValid) return;

    setIsSaving(true);
    try {
      await onSave(rule);
    } catch (error) {
      console.error('Error saving rule:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">
                {initialRule?.id ? 'Edit Quality Rule' : 'Create Quality Rule'}
              </h2>
              {/* Validation Status Indicator */}
              {isValidating ? (
                <div className="flex items-center space-x-1 text-blue-600">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span className="text-sm">Validating...</span>
                </div>
              ) : validationResult ? (
                validationResult.isValid ? (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Valid</span>
                    {validationResult.warnings.length > 0 && (
                      <span className="text-xs text-yellow-600">
                        ({validationResult.warnings.length} warnings)
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">
                      {validationResult.errors.length} error{validationResult.errors.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )
              ) : null}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Define conditions and actions for data quality validation
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Name *
              </label>
              <input
                type="text"
                value={rule.name || ''}
                onChange={(e) => handleBasicInfoChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Email Format Validation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={rule.description || ''}
                onChange={(e) => handleBasicInfoChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe what this rule validates or does"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={rule.category || ''}
                onChange={(e) => handleBasicInfoChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Type *
              </label>
              <select
                value={rule.type || 'validation'}
                onChange={(e) => handleBasicInfoChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RULE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={rule.priority || 'medium'}
                onChange={(e) => handleBasicInfoChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RULE_PRIORITIES.map(priority => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Configuration Options */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Configuration
              </label>
              
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rule.config?.enabled || false}
                    onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Rule enabled</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rule.config?.runOnUpload || false}
                    onChange={(e) => handleConfigChange('runOnUpload', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Run automatically on file upload</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rule.config?.stopOnFailure || false}
                    onChange={(e) => handleConfigChange('stopOnFailure', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Stop processing on first failure</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Rule Conditions</h3>
          {rule.conditions && (
            <RuleConditionGroupComponent
              group={rule.conditions}
              availableFields={availableFields}
              onUpdate={handleConditionsChange}
            />
          )}
        </div>

        {/* Actions */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
          <RuleActionBuilder
            actions={rule.actions || []}
            onUpdate={handleActionsChange}
          />
        </div>

        {/* Validation Results */}
        {isValidating && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center">
              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
              <span className="text-sm text-blue-700">Validating rule...</span>
            </div>
          </div>
        )}

        {validationResult && !isValidating && (
          <>
            {/* Validation Errors */}
            {validationResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-800">
                      Please fix the following errors ({validationResult.errors.length}):
                    </h4>
                    <div className="mt-2 space-y-1">
                      {validationResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-700 bg-white rounded p-2 border border-red-100">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{error.field}</span>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">{error.code}</span>
                          </div>
                          <p className="mt-1">{error.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Warnings */}
            {validationResult.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-yellow-800">
                      Recommendations ({validationResult.warnings.length}):
                    </h4>
                    <div className="mt-2 space-y-1">
                      {validationResult.warnings.map((warning, index) => (
                        <div key={index} className="text-sm text-yellow-700 bg-white rounded p-2 border border-yellow-100">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{warning.field}</span>
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">{warning.type}</span>
                          </div>
                          <p className="mt-1">{warning.message}</p>
                          {warning.suggestion && (
                            <p className="mt-1 text-yellow-600">
                              <Info className="w-3 h-3 inline mr-1" />
                              {warning.suggestion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Success */}
            {validationResult.isValid && validationResult.errors.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-green-800">Rule validation passed</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Your rule is syntactically correct and ready to be saved.
                      {validationResult.warnings.length > 0 && 
                        ` Consider reviewing the ${validationResult.warnings.length} recommendation(s) above.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Test Results */}
        {showTestResults && testResults && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start justify-between">
              <div className="flex">
                <CheckCircle className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">Test Results</h4>
                  <div className="text-sm text-blue-700 mt-1">
                    <p>Processed records: {testResults.results.passed + testResults.results.failed}</p>
                    <p>Passed: {testResults.results.passed}</p>
                    <p>Failed: {testResults.results.failed}</p>
                    <p>Execution time: {testResults.results.executionTime}ms</p>
                    {testResults.sampleViolations.length > 0 && (
                      <p className="mt-2">
                        <strong>Sample violations:</strong>
                        {testResults.sampleViolations.slice(0, 3).map((violation, index) => (
                          <span key={index} className="block ml-2">
                            • {violation.field}: {violation.message}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowTestResults(false)}
                className="text-blue-500 hover:text-blue-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onTest && dataSourceId && (
              <button
                onClick={handleTest}
                disabled={!isValid || isTesting}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <TestTube className="w-4 h-4" />
                <span>{isTesting ? 'Testing...' : 'Test Rule'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid || isSaving}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Rule'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};