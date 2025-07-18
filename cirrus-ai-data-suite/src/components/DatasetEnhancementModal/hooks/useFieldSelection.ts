import { useState, useCallback } from 'react';

export function useFieldSelection() {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  const toggleFieldSelection = useCallback((fieldName: string) => {
    setSelectedFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldName)) {
        newSet.delete(fieldName);
      } else {
        newSet.add(fieldName);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFields(new Set());
  }, []);

  const selectAll = useCallback((fieldNames: string[]) => {
    setSelectedFields(new Set(fieldNames));
  }, []);

  return {
    selectedFields,
    toggleFieldSelection,
    clearSelection,
    selectAll
  };
}