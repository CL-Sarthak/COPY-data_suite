import React from 'react';
import { MissingField } from '../../types/enhancement.types';
import { FieldCard } from './FieldCard';

interface FieldListProps {
  fields: MissingField[];
  selectedFields: Set<string>;
  onToggleField: (fieldName: string) => void;
}

export function FieldList({ fields, selectedFields, onToggleField }: FieldListProps) {
  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <FieldCard
          key={field.fieldName}
          field={field}
          isSelected={selectedFields.has(field.fieldName)}
          onToggle={() => onToggleField(field.fieldName)}
        />
      ))}
    </div>
  );
}