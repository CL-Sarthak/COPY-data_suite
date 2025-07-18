import { renderHook, waitFor } from '@testing-library/react';
import { useConfigurations } from '../useConfigurations';
import { syntheticAPI } from '@/core/api';

// Mock the API
jest.mock('@/core/api', () => ({
  syntheticAPI: {
    getDatasets: jest.fn(),
    convertApiDatasetToConfig: jest.fn(),
    createDataset: jest.fn(),
    updateDataset: jest.fn(),
    deleteDataset: jest.fn()
  }
}));

// Mock the toast context
jest.mock('@/contexts/ToastContext', () => ({
  useToastActions: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn()
  })
}));

describe('useConfigurations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load configurations on mount', async () => {
    const mockDatasets = [
      { id: '1', name: 'Test Dataset 1' },
      { id: '2', name: 'Test Dataset 2' }
    ];
    
    const mockConfigs = [
      { id: '1', name: 'Test Config 1' },
      { id: '2', name: 'Test Config 2' }
    ];

    (syntheticAPI.getDatasets as jest.Mock).mockResolvedValue(mockDatasets);
    (syntheticAPI.convertApiDatasetToConfig as jest.Mock)
      .mockImplementation((dataset) => {
        const index = mockDatasets.indexOf(dataset);
        return mockConfigs[index];
      });

    const { result } = renderHook(() => useConfigurations());

    // Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.configs).toEqual([]);
    expect(result.current.error).toBe(null);

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check final state
    expect(syntheticAPI.getDatasets).toHaveBeenCalledTimes(1);
    expect(syntheticAPI.convertApiDatasetToConfig).toHaveBeenCalledTimes(2);
    expect(result.current.configs).toEqual(mockConfigs);
    expect(result.current.error).toBe(null);
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('API Error');
    (syntheticAPI.getDatasets as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useConfigurations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.configs).toEqual([]);
    expect(result.current.error).toEqual(mockError);
  });

  it('should handle non-array responses', async () => {
    (syntheticAPI.getDatasets as jest.Mock).mockResolvedValue({ error: 'Some error' });

    const { result } = renderHook(() => useConfigurations());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.configs).toEqual([]);
    expect(result.current.error).toBe(null);
  });
});