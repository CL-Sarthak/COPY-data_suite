import React from 'react';
import { X, Plus } from 'lucide-react';
import { RuleAction, ActionType } from '@/types/qualityRules';

interface RuleActionBuilderProps {
  actions: RuleAction[];
  onUpdate: (actions: RuleAction[]) => void;
}

const ACTION_TYPES: { value: ActionType; label: string; description: string }[] = [
  { 
    value: 'flag_violation', 
    label: 'Flag Violation', 
    description: 'Mark the record as having a quality issue' 
  },
  { 
    value: 'log_issue', 
    label: 'Log Issue', 
    description: 'Write the violation to the system logs' 
  },
  { 
    value: 'send_alert', 
    label: 'Send Alert', 
    description: 'Send notification when violations are found' 
  },
  { 
    value: 'reject_record', 
    label: 'Reject Record', 
    description: 'Exclude the record from processing' 
  },
  { 
    value: 'auto_correct', 
    label: 'Auto Correct', 
    description: 'Attempt to automatically fix the issue' 
  },
  { 
    value: 'apply_transformation', 
    label: 'Apply Transformation', 
    description: 'Transform the field value using a rule' 
  }
];

const SEVERITY_OPTIONS = [
  { value: 'error', label: 'Error', color: 'text-red-600' },
  { value: 'warning', label: 'Warning', color: 'text-yellow-600' },
  { value: 'info', label: 'Info', color: 'text-blue-600' }
];

export const RuleActionBuilder: React.FC<RuleActionBuilderProps> = ({
  actions,
  onUpdate
}) => {
  const handleAddAction = () => {
    const newAction: RuleAction = {
      id: `action-${Date.now()}`,
      type: 'flag_violation',
      params: {
        severity: 'error',
        message: 'Quality rule violation detected'
      }
    };

    onUpdate([...actions, newAction]);
  };

  const handleUpdateAction = (index: number, updatedAction: RuleAction) => {
    const newActions = [...actions];
    newActions[index] = updatedAction;
    onUpdate(newActions);
  };

  const handleRemoveAction = (index: number) => {
    const newActions = actions.filter((_, i) => i !== index);
    onUpdate(newActions);
  };

  const renderActionParams = (action: RuleAction, index: number) => {
    const updateParams = (newParams: Record<string, unknown>) => {
      handleUpdateAction(index, {
        ...action,
        params: { ...action.params, ...newParams }
      });
    };

    switch (action.type) {
      case 'flag_violation':
      case 'log_issue':
      case 'reject_record':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                value={action.params?.severity || 'error'}
                onChange={(e) => updateParams({ severity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SEVERITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Custom Message
              </label>
              <input
                type="text"
                value={action.params?.message || ''}
                onChange={(e) => updateParams({ message: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Custom violation message"
              />
            </div>
          </div>
        );

      case 'send_alert':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                value={action.params?.severity || 'error'}
                onChange={(e) => updateParams({ severity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SEVERITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Alert Recipients
              </label>
              <input
                type="text"
                value={(action.params?.alertRecipients || []).join(', ')}
                onChange={(e) => updateParams({ 
                  alertRecipients: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Alert Message
              </label>
              <textarea
                value={action.params?.message || ''}
                onChange={(e) => updateParams({ message: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Custom alert message"
                rows={2}
              />
            </div>
          </div>
        );

      case 'auto_correct':
      case 'apply_transformation':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Target Field
              </label>
              <input
                type="text"
                value={action.params?.targetField || ''}
                onChange={(e) => updateParams({ targetField: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Field to update"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Transformation Rule
              </label>
              <input
                type="text"
                value={action.params?.transformation || ''}
                onChange={(e) => updateParams({ transformation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., UPPER(), TRIM(), REPLACE()"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Actions</h3>
        <button
          onClick={handleAddAction}
          className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Action</span>
        </button>
      </div>

      {actions.length === 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <p className="text-sm text-gray-600">
            No actions defined. Click &quot;Add Action&quot; to specify what happens when this rule is violated.
          </p>
        </div>
      )}

      {actions.map((action, index) => (
        <div key={action.id} className="border border-gray-200 rounded-lg p-4 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Action Type
                  </label>
                  <select
                    value={action.type}
                    onChange={(e) => handleUpdateAction(index, {
                      ...action,
                      type: e.target.value as ActionType,
                      params: {} // Reset params when changing type
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ACTION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="text-xs text-gray-600">
                    {ACTION_TYPES.find(t => t.value === action.type)?.description}
                  </div>
                </div>
              </div>

              {renderActionParams(action, index)}
            </div>

            <button
              onClick={() => handleRemoveAction(index)}
              className="ml-4 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
              title="Remove action"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {actions.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Actions are executed in order when a rule violation is detected. 
            Multiple actions can be configured for a single rule.
          </p>
        </div>
      )}
    </div>
  );
};