import React from 'react';
import { X } from 'lucide-react';
import { RuleCondition, ConditionOperator } from '@/types/qualityRules';

interface RuleConditionBuilderProps {
  condition: RuleCondition;
  availableFields: string[];
  onUpdate: (condition: RuleCondition) => void;
  onRemove: () => void;
  showRemove?: boolean;
}

const OPERATORS: { value: ConditionOperator; label: string; inputType: string }[] = [
  { value: 'equals', label: 'equals', inputType: 'single' },
  { value: 'not_equals', label: 'does not equal', inputType: 'single' },
  { value: 'contains', label: 'contains', inputType: 'single' },
  { value: 'not_contains', label: 'does not contain', inputType: 'single' },
  { value: 'starts_with', label: 'starts with', inputType: 'single' },
  { value: 'ends_with', label: 'ends with', inputType: 'single' },
  { value: 'regex_match', label: 'matches regex', inputType: 'single' },
  { value: 'greater_than', label: 'is greater than', inputType: 'single' },
  { value: 'less_than', label: 'is less than', inputType: 'single' },
  { value: 'greater_or_equal', label: 'is greater than or equal to', inputType: 'single' },
  { value: 'less_or_equal', label: 'is less than or equal to', inputType: 'single' },
  { value: 'between', label: 'is between', inputType: 'range' },
  { value: 'in_list', label: 'is in list', inputType: 'list' },
  { value: 'not_in_list', label: 'is not in list', inputType: 'list' },
  { value: 'is_null', label: 'is null', inputType: 'none' },
  { value: 'is_not_null', label: 'is not null', inputType: 'none' },
  { value: 'is_empty', label: 'is empty', inputType: 'none' },
  { value: 'is_not_empty', label: 'is not empty', inputType: 'none' },
  { value: 'date_before', label: 'is before date', inputType: 'date' },
  { value: 'date_after', label: 'is after date', inputType: 'date' },
  { value: 'date_between', label: 'is between dates', inputType: 'dateRange' }
];

export const RuleConditionBuilder: React.FC<RuleConditionBuilderProps> = ({
  condition,
  availableFields,
  onUpdate,
  onRemove,
  showRemove = true
}) => {
  const selectedOperator = OPERATORS.find(op => op.value === condition.operator);

  const handleFieldChange = (field: string) => {
    onUpdate({ ...condition, field });
  };

  const handleOperatorChange = (operator: ConditionOperator) => {
    const newCondition = { 
      ...condition, 
      operator,
      value: undefined,
      values: undefined
    };
    onUpdate(newCondition);
  };

  const handleValueChange = (value: unknown) => {
    onUpdate({ ...condition, value });
  };

  const handleValuesChange = (values: unknown[]) => {
    onUpdate({ ...condition, values });
  };

  const handleListChange = (text: string) => {
    const values = text.split('\n').map(v => v.trim()).filter(v => v);
    handleValuesChange(values);
  };

  const renderValueInput = () => {
    if (!selectedOperator) return null;

    switch (selectedOperator.inputType) {
      case 'none':
        return null;

      case 'single':
        return (
          <input
            type={selectedOperator.value.includes('date') ? 'date' : 'text'}
            value={typeof condition.value === 'string' || typeof condition.value === 'number' ? condition.value : ''}
            onChange={(e) => handleValueChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter value"
          />
        );

      case 'range':
        const [min, max] = condition.values || ['', ''];
        const minValue = typeof min === 'string' || typeof min === 'number' ? min : '';
        const maxValue = typeof max === 'string' || typeof max === 'number' ? max : '';
        return (
          <div className="flex space-x-2">
            <input
              type="number"
              value={minValue}
              onChange={(e) => handleValuesChange([e.target.value, maxValue])}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Min"
            />
            <span className="self-center">and</span>
            <input
              type="number"
              value={maxValue}
              onChange={(e) => handleValuesChange([minValue, e.target.value])}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Max"
            />
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            value={typeof condition.value === 'string' || typeof condition.value === 'number' ? condition.value : ''}
            onChange={(e) => handleValueChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'dateRange':
        const [startDate, endDate] = condition.values || ['', ''];
        const startDateValue = typeof startDate === 'string' || typeof startDate === 'number' ? startDate : '';
        const endDateValue = typeof endDate === 'string' || typeof endDate === 'number' ? endDate : '';
        return (
          <div className="flex space-x-2">
            <input
              type="date"
              value={startDateValue}
              onChange={(e) => handleValuesChange([e.target.value, endDateValue])}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="self-center">and</span>
            <input
              type="date"
              value={endDateValue}
              onChange={(e) => handleValuesChange([startDateValue, e.target.value])}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );

      case 'list':
        return (
          <div className="flex flex-col space-y-2">
            <textarea
              value={(condition.values || []).join('\n')}
              onChange={(e) => handleListChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter values (one per line)"
              rows={3}
            />
            <div className="text-xs text-gray-500">
              Enter one value per line
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border">
      {/* Field Selection */}
      <div className="flex-shrink-0">
        <label className="block text-xs font-medium text-gray-700 mb-1">Field</label>
        <select
          value={condition.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-32"
        >
          <option value="">Select field</option>
          {availableFields.map(field => (
            <option key={field} value={field}>{field}</option>
          ))}
        </select>
      </div>

      {/* Operator Selection */}
      <div className="flex-shrink-0">
        <label className="block text-xs font-medium text-gray-700 mb-1">Condition</label>
        <select
          value={condition.operator}
          onChange={(e) => handleOperatorChange(e.target.value as ConditionOperator)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-40"
        >
          <option value="">Select condition</option>
          {OPERATORS.map(op => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
      </div>

      {/* Value Input */}
      {selectedOperator && selectedOperator.inputType !== 'none' && (
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
          {renderValueInput()}
        </div>
      )}

      {/* Remove Button */}
      {showRemove && (
        <div className="flex-shrink-0">
          <label className="block text-xs font-medium text-gray-700 mb-1">&nbsp;</label>
          <button
            onClick={onRemove}
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
            title="Remove condition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};