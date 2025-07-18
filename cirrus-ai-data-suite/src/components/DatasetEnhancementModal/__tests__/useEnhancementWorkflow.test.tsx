import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { useEnhancementWorkflow } from '../hooks/useEnhancementWorkflow';
import { DataSource } from '@/types/discovery';

describe('useEnhancementWorkflow hook', () => {
  const mockOnEnhancementComplete = jest.fn();
  const mockOnClose = jest.fn();
  
  const mockDataSource: DataSource = {
    id: 'ds-1',
    name: 'Test Data Source',
    type: 'json_transformed',
    storageKey: 'test-key',
    connectionStatus: 'connected',
    recordCount: 100,
    configuration: {
      files: [{ 
        name: 'test.json',
        size: 1000,
        type: 'application/json',
        path: 'test.json'
      }]
    },
    metadata: {},
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with analyze step', () => {
    const { result } = renderHook(() => 
      useEnhancementWorkflow(mockDataSource, mockOnEnhancementComplete, mockOnClose)
    );

    expect(result.current.step).toBe('analyze');
    expect(result.current.analyzing).toBe(false);
    expect(result.current.analysis).toBeNull();
  });

  it('should toggle field selection', () => {
    const { result } = renderHook(() => 
      useEnhancementWorkflow(mockDataSource, mockOnEnhancementComplete, mockOnClose)
    );

    act(() => {
      result.current.toggleFieldSelection('name');
    });

    expect(result.current.selectedFields.has('name')).toBe(true);

    act(() => {
      result.current.toggleFieldSelection('name');
    });

    expect(result.current.selectedFields.has('name')).toBe(false);
  });

  it('should handle field selection', () => {
    const { result } = renderHook(() => 
      useEnhancementWorkflow(mockDataSource, mockOnEnhancementComplete, mockOnClose)
    );

    // Toggle field selection
    act(() => {
      result.current.toggleFieldSelection('name');
      result.current.toggleFieldSelection('age');
    });

    expect(result.current.selectedFields.size).toBe(2);
    expect(result.current.selectedFields.has('name')).toBe(true);
    expect(result.current.selectedFields.has('age')).toBe(true);
  });

  it('should reset workflow', () => {
    const { result } = renderHook(() => 
      useEnhancementWorkflow(mockDataSource, mockOnEnhancementComplete, mockOnClose)
    );

    // Change some state
    act(() => {
      result.current.toggleFieldSelection('name');
      result.current.goToStep('select');
    });

    expect(result.current.selectedFields.size).toBe(1);
    expect(result.current.step).toBe('select');

    act(() => {
      result.current.resetWorkflow();
    });

    expect(result.current.selectedFields.size).toBe(0);
    expect(result.current.step).toBe('analyze');
  });

  it('should handle step navigation', () => {
    const { result } = renderHook(() => 
      useEnhancementWorkflow(mockDataSource, mockOnEnhancementComplete, mockOnClose)
    );

    // Navigate through steps
    act(() => {
      result.current.goToStep('select');
    });

    expect(result.current.step).toBe('select');

    act(() => {
      result.current.goToStep('enhance');
    });

    expect(result.current.step).toBe('enhance');

    act(() => {
      result.current.goToStep('analyze');
    });

    expect(result.current.step).toBe('analyze');
  });

  it('should not enhance without selected fields', async () => {
    const { result } = renderHook(() => 
      useEnhancementWorkflow(mockDataSource, mockOnEnhancementComplete, mockOnClose)
    );

    await act(async () => {
      await result.current.handleEnhance();
    });

    expect(result.current.enhancementResult).toBeNull();
    expect(mockOnEnhancementComplete).not.toHaveBeenCalled();
  });

  it('should handle complete with no enhancement result', () => {
    const { result } = renderHook(() => 
      useEnhancementWorkflow(mockDataSource, mockOnEnhancementComplete, mockOnClose)
    );

    act(() => {
      result.current.handleComplete();
    });

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnEnhancementComplete).not.toHaveBeenCalled();
  });
});