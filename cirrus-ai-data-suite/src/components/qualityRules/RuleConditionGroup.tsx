import React from 'react';
import { Plus, X } from 'lucide-react';
import { ConditionGroup, LogicalOperator, RuleCondition } from '@/types/qualityRules';
import { RuleConditionBuilder } from './RuleConditionBuilder';
// Use crypto.randomUUID() instead of uuid package

interface RuleConditionGroupProps {
  group: ConditionGroup;
  availableFields: string[];
  onUpdate: (group: ConditionGroup) => void;
  onRemove?: () => void;
  depth?: number;
  maxDepth?: number;
}

export const RuleConditionGroupComponent: React.FC<RuleConditionGroupProps> = ({
  group,
  availableFields,
  onUpdate,
  onRemove,
  depth = 0,
  maxDepth = 2
}) => {
  const handleOperatorChange = (operator: LogicalOperator) => {
    onUpdate({ ...group, operator });
  };

  const handleAddCondition = () => {
    const newCondition: RuleCondition = {
      id: crypto.randomUUID(),
      field: '',
      operator: 'equals',
      value: ''
    };

    onUpdate({
      ...group,
      conditions: [...group.conditions, newCondition]
    });
  };

  const handleAddGroup = () => {
    if (depth >= maxDepth) return;

    const newGroup: ConditionGroup = {
      id: crypto.randomUUID(),
      operator: 'AND',
      conditions: [{
        id: crypto.randomUUID(),
        field: '',
        operator: 'equals',
        value: ''
      }]
    };

    onUpdate({
      ...group,
      conditions: [...group.conditions, newGroup]
    });
  };

  const handleUpdateCondition = (index: number, item: RuleCondition | ConditionGroup) => {
    const newConditions = [...group.conditions];
    newConditions[index] = item;
    onUpdate({ ...group, conditions: newConditions });
  };

  const handleRemoveCondition = (index: number) => {
    const newConditions = group.conditions.filter((_, i) => i !== index);
    onUpdate({ ...group, conditions: newConditions });
  };

  const isNestedGroup = (item: RuleCondition | ConditionGroup): item is ConditionGroup => {
    return 'conditions' in item && Array.isArray(item.conditions);
  };

  const borderColor = depth === 0 ? 'border-blue-200' : depth === 1 ? 'border-green-200' : 'border-orange-200';
  const bgColor = depth === 0 ? 'bg-blue-50' : depth === 1 ? 'bg-green-50' : 'bg-orange-50';

  return (
    <div className={`border-2 ${borderColor} ${bgColor} rounded-lg p-4`}>
      {/* Group Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">
            {depth === 0 ? 'Rule Conditions' : 'Condition Group'}
          </span>
          
          {group.conditions.length > 1 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Join with:</span>
              <select
                value={group.operator}
                onChange={(e) => handleOperatorChange(e.target.value as LogicalOperator)}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </div>
          )}
        </div>

        {onRemove && depth > 0 && (
          <button
            onClick={onRemove}
            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
            title="Remove group"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Conditions */}
      <div className="space-y-3">
        {group.conditions.map((item, index) => (
          <div key={item.id} className="relative">
            {/* AND/OR indicator for multiple conditions */}
            {index > 0 && (
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
                <span className="bg-white px-2 py-1 text-xs font-medium text-gray-600 border border-gray-300 rounded">
                  {group.operator}
                </span>
              </div>
            )}

            {isNestedGroup(item) ? (
              <RuleConditionGroupComponent
                group={item}
                availableFields={availableFields}
                onUpdate={(updatedGroup) => handleUpdateCondition(index, updatedGroup)}
                onRemove={() => handleRemoveCondition(index)}
                depth={depth + 1}
                maxDepth={maxDepth}
              />
            ) : (
              <RuleConditionBuilder
                condition={item}
                availableFields={availableFields}
                onUpdate={(updatedCondition) => handleUpdateCondition(index, updatedCondition)}
                onRemove={() => handleRemoveCondition(index)}
                showRemove={group.conditions.length > 1}
              />
            )}
          </div>
        ))}
      </div>

      {/* Add Buttons */}
      <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={handleAddCondition}
          className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Condition</span>
        </button>

        {depth < maxDepth && (
          <button
            onClick={handleAddGroup}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Group</span>
          </button>
        )}
      </div>

      {/* Help Text */}
      {depth === 0 && group.conditions.length === 1 && !isNestedGroup(group.conditions[0]) && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Add more conditions to create complex rules. Use &quot;AND&quot; when all conditions must be true, 
            or &quot;OR&quot; when any condition can be true. You can also add nested groups for advanced logic.
          </p>
        </div>
      )}
    </div>
  );
};