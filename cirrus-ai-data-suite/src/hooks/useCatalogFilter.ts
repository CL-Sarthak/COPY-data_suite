import { useState, useMemo } from 'react';
import { CatalogField } from '@/types/catalog';
import { CatalogFieldService } from '@/services/catalogFieldService';

interface UseCatalogFilterResult {
  filteredFields: CatalogField[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  standardFieldsCount: number;
  customFieldsCount: number;
}

export function useCatalogFilter(fields: CatalogField[]): UseCatalogFilterResult {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Ensure fields is an array
  const safeFields = useMemo(() => Array.isArray(fields) ? fields : [], [fields]);

  // Calculate counts
  const standardFieldsCount = useMemo(
    () => safeFields.filter(field => field.isStandard).length,
    [safeFields]
  );

  const customFieldsCount = useMemo(
    () => safeFields.filter(field => !field.isStandard).length,
    [safeFields]
  );

  // Filter fields
  const filteredFields = useMemo(
    () => CatalogFieldService.filterFields(safeFields, selectedCategory, searchTerm),
    [safeFields, selectedCategory, searchTerm]
  );

  return {
    filteredFields,
    selectedCategory,
    setSelectedCategory,
    searchTerm,
    setSearchTerm,
    standardFieldsCount,
    customFieldsCount
  };
}