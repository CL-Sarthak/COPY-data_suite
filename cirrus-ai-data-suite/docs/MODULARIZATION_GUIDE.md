# Modularization Guide

This guide documents the modularization approach implemented in the Data Redaction Tool codebase, providing patterns and best practices for maintaining and extending the application.

## Table of Contents
1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Directory Structure](#directory-structure)
4. [Component Patterns](#component-patterns)
5. [API Service Layer](#api-service-layer)
6. [State Management](#state-management)
7. [Migration Strategy](#migration-strategy)
8. [Best Practices](#best-practices)

## Overview

The modularization effort transforms large monolithic pages (1000+ lines) into small, focused modules that are easier to maintain, test, and extend. The approach follows a feature-based architecture with clear separation of concerns.

### Before vs After
- **Before**: Single 1926-line page with mixed concerns
- **After**: 18+ focused files, each under 200 lines
- **Result**: 75% reduction in file complexity

## Architecture Principles

### 1. Feature-Based Organization
Each feature is self-contained with its own:
- Components (UI elements)
- Hooks (business logic)
- Types (TypeScript interfaces)
- Utils (helper functions)
- Tests (unit and integration)

### 2. Separation of Concerns
- **Presentation**: React components handle UI only
- **Business Logic**: Custom hooks manage state and operations
- **Data Access**: API service layer handles all HTTP requests
- **Type Safety**: TypeScript interfaces define contracts

### 3. Reusability
- Shared components for common UI patterns
- Shared hooks for common behaviors
- Centralized API client for consistency

## Directory Structure

```
src/
├── core/                      # Core infrastructure
│   ├── api/                   # API service layer
│   │   ├── client.ts         # Base API client
│   │   ├── endpoints/        # Feature-specific APIs
│   │   └── index.ts          # API exports
│   └── types/                # Shared types
│
├── features/                  # Feature modules
│   ├── synthetic/            # Synthetic data feature
│   │   ├── components/       # Feature components
│   │   ├── hooks/           # Feature hooks
│   │   ├── types/           # Feature types
│   │   ├── utils/           # Feature utilities
│   │   └── SyntheticDataFeature.tsx
│   │
│   ├── discovery/            # Discovery feature
│   ├── redaction/           # Redaction feature
│   └── shared/              # Shared across features
│       ├── components/      # Shared UI components
│       └── hooks/          # Shared hooks
│
└── app/                      # Next.js app directory
    ├── synthetic/page.tsx    # Route pages (thin)
    └── api/                  # API routes
```

## Component Patterns

### Container/Presenter Pattern
Separate components into containers (smart) and presenters (dumb):

```typescript
// Container Component (Smart)
export function ConfigurationPanel() {
  const { configs, loading, error, actions } = useConfigurations();
  
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  
  return <ConfigurationList configs={configs} {...actions} />;
}

// Presenter Component (Dumb)
interface ConfigurationListProps {
  configs: Configuration[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConfigurationList({ configs, onEdit, onDelete }: ConfigurationListProps) {
  // Pure UI logic only
}
```

### Shared Component Interface
All shared components follow consistent prop patterns:

```typescript
interface SharedComponentProps {
  className?: string;       // Optional styling
  children?: ReactNode;     // Optional content
  variant?: 'primary' | 'secondary';  // Variants
  size?: 'sm' | 'md' | 'lg';         // Sizes
  loading?: boolean;        // Loading states
  disabled?: boolean;       // Disabled states
}
```

## API Service Layer

### Centralized API Client
Single source of truth for API configuration:

```typescript
// core/api/client.ts
export class APIClient {
  private baseURL = '/api';
  private timeout = 30000;

  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    // Centralized error handling
    // Automatic retries
    // Response transformation
  }
}
```

### Feature-Specific APIs
Each feature has its own API service:

```typescript
// core/api/endpoints/synthetic.api.ts
export class SyntheticAPI {
  constructor(private client: APIClient) {}

  async getDatasets(): Promise<SyntheticDataset[]> {
    return this.client.get('/synthetic');
  }

  async createDataset(data: CreateDatasetDTO): Promise<SyntheticDataset> {
    return this.client.post('/synthetic', data);
  }
}
```

### Type-Safe API Calls
All API methods are fully typed:

```typescript
// Define DTOs
interface CreateDatasetDTO {
  name: string;
  configuration: DatasetConfiguration;
}

// Use in components
const result = await syntheticAPI.createDataset({
  name: 'Test Dataset',  // TypeScript enforces structure
  configuration: { ... }
});
```

## State Management

### Custom Hooks Pattern
Encapsulate all stateful logic in custom hooks:

```typescript
export function useConfigurations() {
  const [configs, setConfigs] = useState<Configuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // All CRUD operations
  const createConfig = async (data: CreateConfigDTO) => { ... };
  const updateConfig = async (id: string, data: UpdateConfigDTO) => { ... };
  const deleteConfig = async (id: string) => { ... };

  return {
    // State
    configs,
    loading,
    error,
    
    // Actions
    actions: {
      create: createConfig,
      update: updateConfig,
      delete: deleteConfig,
    }
  };
}
```

### Real-Time Updates
Use EventSource for server-sent events:

```typescript
export function useJobUpdates() {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const eventSource = new EventSource('/api/jobs/updates');
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      // Handle update
    };

    return () => eventSource.close();
  }, []);
}
```

## Migration Strategy

### Incremental Migration
Migrate features one at a time:

1. **Create parallel route** (e.g., `/synthetic-modular`)
2. **Extract types and interfaces**
3. **Create API service layer**
4. **Build custom hooks**
5. **Create modular components**
6. **Test thoroughly**
7. **Replace original route**

### Testing During Migration
- Keep original page functional
- Run both versions in parallel
- Compare functionality
- Ensure feature parity

## Best Practices

### 1. File Size Limits
- Components: Max 200 lines
- Hooks: Max 150 lines
- Single responsibility per file

### 2. Import Organization
```typescript
// External imports first
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Internal imports by layer
import { syntheticAPI } from '@/core/api';
import { Button, Modal } from '@/features/shared/components';
import { useConfigurations } from '../hooks/useConfigurations';

// Types last
import type { Configuration } from '../types';
```

### 3. Error Handling
- Handle errors at the hook level
- Provide user-friendly error messages
- Log errors for debugging
- Use error boundaries for critical failures

### 4. Performance Optimization
- Lazy load heavy components
- Memoize expensive computations
- Use pagination for large datasets
- Implement virtual scrolling when needed

### 5. Testing Strategy
```typescript
// Test hooks in isolation
describe('useConfigurations', () => {
  it('should load configurations on mount', async () => {
    const { result } = renderHook(() => useConfigurations());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.configs).toHaveLength(2);
  });
});

// Test components with mocked hooks
jest.mock('../hooks/useConfigurations');
```

### 6. Documentation
- Document complex business logic
- Add JSDoc comments for public APIs
- Include examples in component files
- Keep README files in feature directories

## Conclusion

This modularization approach provides:
- **Maintainability**: Small, focused files are easier to understand
- **Testability**: Isolated units are easier to test
- **Reusability**: Shared components reduce duplication
- **Scalability**: New features follow established patterns
- **Type Safety**: TypeScript catches errors early

Follow these patterns when adding new features or refactoring existing code to maintain consistency across the codebase.