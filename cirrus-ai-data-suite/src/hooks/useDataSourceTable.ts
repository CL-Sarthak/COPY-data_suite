import { useState, useMemo, useEffect } from 'react';
import { DataSource } from '@/types/discovery';
import { SortField, SortDirection } from '@/types/dataSourceTable';
import { DataSourceTableService } from '@/services/dataSourceTableService';

interface UseDataSourceTableResult {
  // Sorting
  sortField: SortField;
  sortDirection: SortDirection;
  handleSort: (field: SortField) => void;
  
  // Filtering
  selectedTagFilters: string[];
  setSelectedTagFilters: (tags: string[]) => void;
  allTags: string[];
  
  // Row expansion
  expandedRow: string | null;
  setExpandedRow: (id: string | null) => void;
  
  // Processed data
  filteredAndSortedDataSources: DataSource[];
}

export function useDataSourceTable(dataSources: DataSource[], initialExpandedRow?: string | null): UseDataSourceTableResult {
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Filtering state
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  
  // Row expansion state
  const [expandedRow, setExpandedRow] = useState<string | null>(initialExpandedRow || null);

  // Update expanded row when initialExpandedRow changes
  useEffect(() => {
    if (initialExpandedRow) {
      setExpandedRow(initialExpandedRow);
    }
  }, [initialExpandedRow]);

  // Handle sort changes
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Extract all available tags
  const allTags = useMemo(() => {
    return DataSourceTableService.extractAllTags(dataSources);
  }, [dataSources]);

  // Filter and sort data sources
  const filteredAndSortedDataSources = useMemo(() => {
    // First filter by tags
    const filtered = DataSourceTableService.filterByTags(dataSources, selectedTagFilters);
    
    // Then sort
    return DataSourceTableService.sortDataSources(filtered, sortField, sortDirection);
  }, [dataSources, sortField, sortDirection, selectedTagFilters]);

  return {
    // Sorting
    sortField,
    sortDirection,
    handleSort,
    
    // Filtering
    selectedTagFilters,
    setSelectedTagFilters,
    allTags,
    
    // Row expansion
    expandedRow,
    setExpandedRow,
    
    // Processed data
    filteredAndSortedDataSources,
  };
}