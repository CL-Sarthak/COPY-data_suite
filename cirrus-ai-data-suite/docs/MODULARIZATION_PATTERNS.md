# Modularization Patterns Reference

This document provides code patterns and examples for common modularization scenarios in the Data Redaction Tool codebase.

## Common Patterns

### 1. Feature Module Structure

```typescript
// features/[feature-name]/[FeatureName]Feature.tsx
import React from 'react';
import { FeatureProvider } from './context/FeatureContext';
import { MainPanel } from './components/MainPanel';
import { SidePanel } from './components/SidePanel';

export function FeatureNameFeature() {
  return (
    <FeatureProvider>
      <div className="flex gap-6">
        <MainPanel />
        <SidePanel />
      </div>
    </FeatureProvider>
  );
}
```

### 2. Custom Hook with CRUD Operations

```typescript
// features/[feature-name]/hooks/useResource.ts
import { useState, useCallback } from 'react';
import { featureAPI } from '@/core/api';
import { useToastActions } from '@/contexts/ToastContext';

export function useResource() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const toast = useToastActions();

  // Load resources
  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await featureAPI.getResources();
      setResources(data);
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast.error('Failed to load resources', error.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Create resource
  const createResource = useCallback(async (data: CreateResourceDTO) => {
    try {
      setLoading(true);
      const newResource = await featureAPI.createResource(data);
      setResources(prev => [...prev, newResource]);
      toast.success('Resource created successfully');
      return newResource;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to create resource', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Update resource
  const updateResource = useCallback(async (id: string, data: UpdateResourceDTO) => {
    try {
      setLoading(true);
      const updated = await featureAPI.updateResource(id, data);
      setResources(prev => prev.map(r => r.id === id ? updated : r));
      toast.success('Resource updated successfully');
      return updated;
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to update resource', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Delete resource
  const deleteResource = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await featureAPI.deleteResource(id);
      setResources(prev => prev.filter(r => r.id !== id));
      toast.success('Resource deleted successfully');
    } catch (err) {
      const error = err as Error;
      toast.error('Failed to delete resource', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    resources,
    loading,
    error,
    actions: {
      load: loadResources,
      create: createResource,
      update: updateResource,
      delete: deleteResource,
    }
  };
}
```

### 3. Form Component with Validation

```typescript
// features/[feature-name]/components/ResourceForm.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/features/shared/components';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.enum(['type1', 'type2', 'type3']),
});

type FormData = z.infer<typeof schema>;

interface ResourceFormProps {
  initialData?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ResourceForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  loading 
}: ResourceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Name
        </label>
        <input
          {...register('name')}
          className="w-full px-3 py-2 border rounded-md"
          disabled={loading}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Type
        </label>
        <select
          {...register('type')}
          className="w-full px-3 py-2 border rounded-md"
          disabled={loading}
        >
          <option value="type1">Type 1</option>
          <option value="type2">Type 2</option>
          <option value="type3">Type 3</option>
        </select>
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={loading || isSubmitting}
        >
          {initialData ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
```

### 4. List Component with Actions

```typescript
// features/[feature-name]/components/ResourceList.tsx
import React from 'react';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { EmptyState } from '@/features/shared/components';

interface ResourceListProps {
  resources: Resource[];
  onEdit: (resource: Resource) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export function ResourceList({ 
  resources, 
  onEdit, 
  onDelete,
  loading 
}: ResourceListProps) {
  if (resources.length === 0) {
    return (
      <EmptyState
        title="No resources found"
        description="Create your first resource to get started"
      />
    );
  }

  return (
    <div className="space-y-2">
      {resources.map(resource => (
        <div
          key={resource.id}
          className="flex items-center justify-between p-4 bg-white rounded-lg border"
        >
          <div>
            <h3 className="font-medium">{resource.name}</h3>
            {resource.description && (
              <p className="text-sm text-gray-600">{resource.description}</p>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(resource)}
              className="p-2 hover:bg-gray-100 rounded"
              disabled={loading}
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(resource.id)}
              className="p-2 hover:bg-red-50 rounded text-red-600"
              disabled={loading}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 5. Modal Management Hook

```typescript
// features/shared/hooks/useModal.ts
import { useState, useCallback } from 'react';

interface ModalState<T = any> {
  isOpen: boolean;
  data?: T;
}

export function useModal<T = any>(initialState?: Partial<ModalState<T>>) {
  const [state, setState] = useState<ModalState<T>>({
    isOpen: false,
    ...initialState
  });

  const open = useCallback((data?: T) => {
    setState({ isOpen: true, data });
  }, []);

  const close = useCallback(() => {
    setState({ isOpen: false, data: undefined });
  }, []);

  const toggle = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  return {
    isOpen: state.isOpen,
    data: state.data,
    open,
    close,
    toggle
  };
}
```

### 6. API Error Handling

```typescript
// core/api/client.ts
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class APIClient {
  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    try {
      const response = await fetch(url, fetchConfig);
      
      if (!response.ok) {
        const error = await this.parseError(response);
        throw new APIError(
          error.message || `Request failed with status ${response.status}`,
          response.status,
          error.code,
          error.details
        );
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new APIError('Network error - please check your connection', 0, 'NETWORK_ERROR');
      }
      
      throw new APIError('An unexpected error occurred', 500, 'UNKNOWN_ERROR');
    }
  }
}
```

### 7. Loading State Management

```typescript
// features/shared/hooks/useAsyncOperation.ts
import { useState, useCallback } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useAsyncOperation<T = any>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const execute = useCallback(async (
    operation: () => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
    }
  ) => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const result = await operation();
      setState({ data: result, loading: false, error: null });
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setState({ data: null, loading: false, error });
      options?.onError?.(error);
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset
  };
}
```

### 8. Context Pattern for Complex State

```typescript
// features/[feature-name]/context/FeatureContext.tsx
import React, { createContext, useContext, useReducer } from 'react';

interface FeatureState {
  selectedItem: Item | null;
  filters: FilterOptions;
  viewMode: 'grid' | 'list';
}

type FeatureAction =
  | { type: 'SELECT_ITEM'; payload: Item | null }
  | { type: 'SET_FILTERS'; payload: FilterOptions }
  | { type: 'SET_VIEW_MODE'; payload: 'grid' | 'list' };

const FeatureContext = createContext<{
  state: FeatureState;
  dispatch: React.Dispatch<FeatureAction>;
} | null>(null);

function featureReducer(state: FeatureState, action: FeatureAction): FeatureState {
  switch (action.type) {
    case 'SELECT_ITEM':
      return { ...state, selectedItem: action.payload };
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    default:
      return state;
  }
}

export function FeatureProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(featureReducer, {
    selectedItem: null,
    filters: {},
    viewMode: 'list'
  });

  return (
    <FeatureContext.Provider value={{ state, dispatch }}>
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeatureContext() {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error('useFeatureContext must be used within FeatureProvider');
  }
  return context;
}
```

### 9. Pagination Hook

```typescript
// features/shared/hooks/usePagination.ts
import { useState, useMemo, useCallback } from 'react';

interface PaginationOptions {
  totalItems: number;
  itemsPerPage?: number;
  initialPage?: number;
}

export function usePagination({
  totalItems,
  itemsPerPage = 10,
  initialPage = 1
}: PaginationOptions) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  const totalPages = useMemo(
    () => Math.ceil(totalItems / itemsPerPage),
    [totalItems, itemsPerPage]
  );

  const startIndex = useMemo(
    () => (currentPage - 1) * itemsPerPage,
    [currentPage, itemsPerPage]
  );

  const endIndex = useMemo(
    () => Math.min(startIndex + itemsPerPage, totalItems),
    [startIndex, itemsPerPage, totalItems]
  );

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const previousPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    goToPage,
    nextPage,
    previousPage
  };
}
```

### 10. Debounced Search Hook

```typescript
// features/shared/hooks/useDebouncedSearch.ts
import { useState, useEffect, useCallback } from 'react';

export function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  delay: number = 300
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await searchFn(query);
        setResults(data);
      } catch (err) {
        setError(err as Error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [query, searchFn, delay]);

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    results,
    loading,
    error,
    search,
    clear
  };
}
```

## Testing Patterns

### Hook Testing

```typescript
// features/[feature-name]/hooks/__tests__/useResource.test.ts
import { renderHook, act } from '@testing-library/react';
import { useResource } from '../useResource';
import { featureAPI } from '@/core/api';

jest.mock('@/core/api');
jest.mock('@/contexts/ToastContext');

describe('useResource', () => {
  it('should create resource successfully', async () => {
    const mockResource = { id: '1', name: 'Test' };
    (featureAPI.createResource as jest.Mock).mockResolvedValue(mockResource);

    const { result } = renderHook(() => useResource());

    await act(async () => {
      await result.current.actions.create({ name: 'Test' });
    });

    expect(result.current.resources).toContainEqual(mockResource);
  });
});
```

### Component Testing

```typescript
// features/[feature-name]/components/__tests__/ResourceList.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ResourceList } from '../ResourceList';

describe('ResourceList', () => {
  const mockResources = [
    { id: '1', name: 'Resource 1' },
    { id: '2', name: 'Resource 2' }
  ];

  it('should render resources', () => {
    render(
      <ResourceList
        resources={mockResources}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('Resource 1')).toBeInTheDocument();
    expect(screen.getByText('Resource 2')).toBeInTheDocument();
  });

  it('should call onEdit when edit button clicked', () => {
    const onEdit = jest.fn();
    render(
      <ResourceList
        resources={mockResources}
        onEdit={onEdit}
        onDelete={jest.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onEdit).toHaveBeenCalledWith(mockResources[0]);
  });
});
```

## Conclusion

These patterns provide a consistent foundation for building modular features. Use them as templates and adapt as needed for specific requirements.