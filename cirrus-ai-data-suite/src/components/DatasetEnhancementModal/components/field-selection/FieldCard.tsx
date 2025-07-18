import React from 'react';
import { MissingField } from '../../types/enhancement.types';
import { FieldPriority, getPriorityColor } from './FieldPriority';

interface FieldCardProps {
  field: MissingField;
  isSelected: boolean;
  onToggle: () => void;
}

export function FieldCard({ field, isSelected, onToggle }: FieldCardProps) {
  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : `${getPriorityColor(field.priority)} hover:border-blue-300`
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}} // Handled by div click
          className="mt-1"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h5 className="font-medium text-gray-900">{field.fieldName}</h5>
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
              {field.fieldType}
            </span>
            <FieldPriority priority={field.priority} />
          </div>
          <p className="text-sm text-gray-700 mb-2">{field.description}</p>
          <p className="text-xs text-gray-600">{field.reasoning}</p>
          {field.dependencies && field.dependencies.length > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              Depends on: {field.dependencies.join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}