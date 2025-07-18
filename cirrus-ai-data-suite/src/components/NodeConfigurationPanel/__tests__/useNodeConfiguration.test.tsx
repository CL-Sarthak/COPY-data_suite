import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { useNodeConfiguration } from '../hooks/useNodeConfiguration';
import { NodeData } from '../types';

describe('useNodeConfiguration hook', () => {
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();
  
  const mockNode: NodeData = {
    id: 'node-1',
    type: 'custom',
    position: { x: 0, y: 0 },
    data: {
      label: 'Test Node',
      nodeType: 'source',
      category: 'database',
      config: {
        type: 'database',
        connectionString: 'postgresql://localhost:5432/db',
        table: 'users'
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with node config', () => {
    const { result } = renderHook(() => 
      useNodeConfiguration(mockNode, mockOnSave, mockOnClose)
    );

    expect(result.current.config).toEqual(mockNode.data.config);
    expect(result.current.validation).toEqual({
      isValid: true,
      errors: {}
    });
  });

  it('should update config', () => {
    const { result } = renderHook(() => 
      useNodeConfiguration(mockNode, mockOnSave, mockOnClose)
    );

    act(() => {
      result.current.updateConfig({ table: 'products' });
    });

    expect(result.current.config.table).toBe('products');
  });

  it('should validate config on update', () => {
    const { result } = renderHook(() => 
      useNodeConfiguration(mockNode, mockOnSave, mockOnClose)
    );

    act(() => {
      result.current.updateConfig({ connectionString: '' });
    });

    expect(result.current.validation.errors.connectionString).toBe('Database connection string is required');
    expect(result.current.validation.isValid).toBe(false);
  });

  it('should save valid config', async () => {
    const { result } = renderHook(() => 
      useNodeConfiguration(mockNode, mockOnSave, mockOnClose)
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockOnSave).toHaveBeenCalledWith(mockNode.data.config);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not save invalid config', async () => {
    const { result } = renderHook(() => 
      useNodeConfiguration(mockNode, mockOnSave, mockOnClose)
    );

    act(() => {
      result.current.updateConfig({ connectionString: '' });
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should reset config', () => {
    const { result } = renderHook(() => 
      useNodeConfiguration(mockNode, mockOnSave, mockOnClose)
    );

    act(() => {
      result.current.updateConfig({ table: 'products' });
    });

    expect(result.current.config.table).toBe('products');

    act(() => {
      result.current.handleReset();
    });

    expect(result.current.config.table).toBe('users');
    expect(result.current.validation).toEqual({
      isValid: true,
      errors: {}
    });
  });

  it('should handle node without config', () => {
    const nodeWithoutConfig: NodeData = {
      ...mockNode,
      data: {
        label: 'Test Node',
        nodeType: 'source',
        category: 'database'
      }
    };

    const { result } = renderHook(() => 
      useNodeConfiguration(nodeWithoutConfig, mockOnSave, mockOnClose)
    );

    expect(result.current.config).toEqual({});
  });

  it('should handle node without nodeType', () => {
    const nodeWithoutType: NodeData = {
      ...mockNode,
      data: {
        label: 'Test Node',
        config: {}
      }
    };

    const { result } = renderHook(() => 
      useNodeConfiguration(nodeWithoutType, mockOnSave, mockOnClose)
    );

    expect(result.current.config).toEqual({});
  });
});