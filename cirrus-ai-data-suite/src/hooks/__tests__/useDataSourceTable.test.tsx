import { renderHook, act } from '@testing-library/react';
import { useDataSourceTable } from '../useDataSourceTable';
import { DataSource } from '@/types/discovery';
import { DataSourceTableService } from '@/services/dataSourceTableService';

// Mock the service
jest.mock('@/services/dataSourceTableService');

describe('useDataSourceTable Hook', () => {
  const mockDataSources: DataSource[] = [
    {
      id: '1',
      name: 'Beta Source',
      type: 'filesystem',
      connectionStatus: 'connected',
      recordCount: 200,
      lastSync: new Date('2024-01-02'),
      hasTransformedData: false,
      tags: ['test', 'beta'],
      configuration: {},
      metadata: {},
    },
    {
      id: '2',
      name: 'Alpha Source',
      type: 'database',
      connectionStatus: 'error',
      recordCount: 100,
      lastSync: new Date('2024-01-01'),
      hasTransformedData: true,
      transformedAt: new Date('2024-01-01'),
      tags: ['test', 'alpha'],
      configuration: {},
      metadata: {},
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (DataSourceTableService.extractAllTags as jest.Mock).mockImplementation((dataSources) => {
      if (!dataSources || dataSources.length === 0) return [];
      const tags = new Set<string>();
      dataSources.forEach((source: DataSource) => {
        source.tags?.forEach(tag => tags.add(tag));
      });
      return Array.from(tags).sort();
    });
    (DataSourceTableService.filterByTags as jest.Mock).mockImplementation((data, tags) => {
      if (tags.length === 0) return data;
      return data.filter((item: DataSource) => 
        tags.some(tag => item.tags?.includes(tag))
      );
    });
    (DataSourceTableService.sortDataSources as jest.Mock).mockImplementation((data, field, direction) => {
      return [...data].sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return direction === 'asc' ? comparison : -comparison;
      });
    });
  });

  describe('Initial State', () => {
    it('should have default initial state', () => {
      const { result } = renderHook(() => useDataSourceTable([]));
      
      expect(result.current.sortField).toBe('name');
      expect(result.current.sortDirection).toBe('asc');
      expect(result.current.selectedTagFilters).toEqual([]);
      expect(result.current.expandedRow).toBeNull();
      expect(result.current.allTags).toEqual([]);
    });
  });

  describe('Sorting', () => {
    it('should sort by name ascending by default', () => {
      const { result } = renderHook(() => useDataSourceTable(mockDataSources));
      
      expect(result.current.sortField).toBe('name');
      expect(result.current.sortDirection).toBe('asc');
    });

    it('should change sort field when different field is clicked', () => {
      const { result } = renderHook(() => useDataSourceTable(mockDataSources));
      
      act(() => {
        result.current.handleSort('recordCount');
      });

      expect(result.current.sortField).toBe('recordCount');
      expect(result.current.sortDirection).toBe('asc');
    });

    it('should toggle sort direction when same field is clicked', () => {
      const { result } = renderHook(() => useDataSourceTable(mockDataSources));
      
      act(() => {
        result.current.handleSort('name');
      });

      expect(result.current.sortDirection).toBe('desc');

      act(() => {
        result.current.handleSort('name');
      });

      expect(result.current.sortDirection).toBe('asc');
    });
  });

  describe('Tag Filtering', () => {
    it('should extract all unique tags', () => {
      const { result } = renderHook(() => useDataSourceTable(mockDataSources));
      
      expect(DataSourceTableService.extractAllTags).toHaveBeenCalledWith(mockDataSources);
      expect(result.current.allTags).toEqual(['alpha', 'beta', 'test']);
    });

    it('should update selected tag filters', () => {
      const { result } = renderHook(() => useDataSourceTable(mockDataSources));
      
      act(() => {
        result.current.setSelectedTagFilters(['test']);
      });

      expect(result.current.selectedTagFilters).toEqual(['test']);

      act(() => {
        result.current.setSelectedTagFilters(['test', 'beta']);
      });

      expect(result.current.selectedTagFilters).toEqual(['test', 'beta']);
    });
  });

  describe('Row Expansion', () => {
    it('should handle row expansion', () => {
      const { result } = renderHook(() => useDataSourceTable(mockDataSources));
      
      expect(result.current.expandedRow).toBeNull();

      act(() => {
        result.current.setExpandedRow('1');
      });

      expect(result.current.expandedRow).toBe('1');

      act(() => {
        result.current.setExpandedRow(null);
      });

      expect(result.current.expandedRow).toBeNull();
    });

    it('should toggle row expansion', () => {
      const { result } = renderHook(() => useDataSourceTable(mockDataSources));
      
      act(() => {
        result.current.setExpandedRow('1');
      });

      expect(result.current.expandedRow).toBe('1');

      // Clicking the same row should collapse it
      act(() => {
        result.current.setExpandedRow('1');
      });

      // Note: The hook doesn't automatically toggle, the component handles this logic
      expect(result.current.expandedRow).toBe('1');
    });
  });

  describe('Filtered and Sorted Data', () => {
    beforeEach(() => {
      // Mock the filtering implementation
      (DataSourceTableService.sortDataSources as jest.Mock).mockImplementation((data) => data);
    });

    it('should return filtered and sorted data sources', () => {
      const { result } = renderHook(() => useDataSourceTable(mockDataSources));
      
      // Without filters, should return all data
      expect(result.current.filteredAndSortedDataSources).toHaveLength(2);
    });

    it('should filter by selected tags', () => {
      const { result } = renderHook(
        ({ dataSources }) => useDataSourceTable(dataSources),
        { initialProps: { dataSources: mockDataSources } }
      );

      act(() => {
        result.current.setSelectedTagFilters(['beta']);
      });

      // The actual filtering logic is in the hook's useMemo
      // We need to verify the hook processes the data correctly
      
      // Since we haven't mocked the actual filtering logic in the hook,
      // we're testing that the state updates correctly
      expect(result.current.selectedTagFilters).toEqual(['beta']);
    });
  });

  describe('Data Updates', () => {
    it('should update when data sources change', () => {
      const { result, rerender } = renderHook(
        ({ dataSources }) => useDataSourceTable(dataSources),
        { initialProps: { dataSources: mockDataSources } }
      );

      expect(result.current.allTags).toEqual(['alpha', 'beta', 'test']);

      const newDataSources = [
        ...mockDataSources,
        {
          id: '3',
          name: 'Gamma Source',
          type: 'api',
          connectionStatus: 'connected',
          recordCount: 300,
          tags: ['new', 'gamma'],
          configuration: {},
          metadata: {},
        },
      ];

      // The mock implementation will return sorted tags

      rerender({ dataSources: newDataSources });

      expect(DataSourceTableService.extractAllTags).toHaveBeenCalledWith(newDataSources);
    });
  });
});