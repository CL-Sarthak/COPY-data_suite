# Component Patterns Guide

## Overview

This guide documents the patterns and conventions for building components in our modular architecture.

## Component Structure

### 1. File Organization

```
features/
├── [feature]/
│   ├── components/
│   │   ├── [ComponentName]/
│   │   │   ├── index.tsx           # Public exports
│   │   │   ├── [ComponentName].tsx # Main component
│   │   │   ├── [ComponentName].types.ts # TypeScript types
│   │   │   ├── [ComponentName].test.tsx # Tests
│   │   │   └── [ComponentName].stories.tsx # Storybook (optional)
│   │   └── index.ts               # Feature component exports
│   ├── hooks/
│   ├── services/
│   └── utils/
└── shared/
    ├── components/
    └── hooks/
```

### 2. Component Types

#### Container Components
- Handle data fetching and business logic
- Use hooks for state management
- Pass data down to presentational components

```typescript
// features/synthetic/components/ConfigList/ConfigListContainer.tsx
export function ConfigListContainer() {
  const { configs, loading, error } = useConfigurations();
  const { deleteConfig } = useConfigActions();

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <ConfigListView
      configs={configs}
      onDelete={deleteConfig}
    />
  );
}
```

#### Presentational Components
- Pure components focused on UI
- Receive data and callbacks via props
- No business logic or side effects

```typescript
// features/synthetic/components/ConfigList/ConfigListView.tsx
interface ConfigListViewProps {
  configs: SyntheticDataConfig[];
  onDelete: (id: string) => void;
}

export function ConfigListView({ configs, onDelete }: ConfigListViewProps) {
  return (
    <div className="space-y-4">
      {configs.map(config => (
        <ConfigCard
          key={config.id}
          config={config}
          onDelete={() => onDelete(config.id)}
        />
      ))}
    </div>
  );
}
```

## Shared Components Usage

### Modal

```typescript
import { Modal } from '@/features/shared/components';

function MyComponent() {
  const modal = useModal();

  return (
    <>
      <Button onClick={modal.open}>Open Modal</Button>
      
      <Modal
        isOpen={modal.isOpen}
        onClose={modal.close}
        title="Edit Configuration"
        size="lg"
      >
        <form>
          {/* Modal content */}
        </form>
      </Modal>
    </>
  );
}
```

### Button

```typescript
import { Button } from '@/features/shared/components';

// Primary button
<Button variant="primary" onClick={handleSave}>
  Save Changes
</Button>

// Loading state
<Button loading={isLoading} disabled={!isValid}>
  Submit
</Button>

// With icon
<Button icon={<PlusIcon className="h-4 w-4" />}>
  Add New
</Button>
```

### Panel

```typescript
import { Panel } from '@/features/shared/components';

<Panel 
  title="Configurations"
  description="Manage your synthetic data configurations"
  action={
    <Button size="sm" onClick={handleCreate}>
      Create New
    </Button>
  }
>
  {/* Panel content */}
</Panel>
```

### Loading States

```typescript
import { LoadingState, ErrorState, EmptyState } from '@/features/shared/components';

// Loading
if (loading) return <LoadingState message="Loading configurations..." />;

// Error
if (error) return <ErrorState error={error} onRetry={refetch} />;

// Empty
if (data.length === 0) {
  return (
    <EmptyState
      icon={<DocumentIcon />}
      title="No configurations yet"
      description="Create your first configuration to get started"
      action={{
        label: "Create Configuration",
        onClick: handleCreate
      }}
    />
  );
}
```

## Custom Hooks Patterns

### useAPI Hook

```typescript
import { useAPI } from '@/features/shared/hooks';

function MyComponent() {
  const createConfig = useAPI(
    syntheticAPI.createConfiguration,
    {
      onSuccess: (data) => {
        toast.success('Configuration created');
        router.push(`/synthetic/${data.id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      }
    }
  );

  const handleSubmit = async (formData) => {
    try {
      await createConfig.execute(formData);
    } catch (error) {
      // Error already handled by onError
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <Button loading={createConfig.loading}>
        Create
      </Button>
    </form>
  );
}
```

### useLoading Hook

```typescript
import { useLoading } from '@/features/shared/hooks';

function MyComponent() {
  const { isLoading, withLoading } = useLoading();

  const handleAction = async () => {
    await withLoading(async () => {
      await someAsyncOperation();
    });
  };

  return <Button loading={isLoading} onClick={handleAction}>Process</Button>;
}
```

### useModal Hook

```typescript
import { useModal } from '@/features/shared/hooks';

function MyComponent() {
  const editModal = useModal();
  const deleteModal = useModal();

  return (
    <>
      <Button onClick={editModal.open}>Edit</Button>
      <Button onClick={deleteModal.open}>Delete</Button>

      <EditModal isOpen={editModal.isOpen} onClose={editModal.close} />
      <DeleteModal isOpen={deleteModal.isOpen} onClose={deleteModal.close} />
    </>
  );
}
```

## TypeScript Patterns

### Component Props

```typescript
// Use interface for component props
interface ComponentProps {
  required: string;
  optional?: number;
  children?: ReactNode;
  onAction: (id: string) => void;
}

// Extend HTML element props when needed
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}
```

### Type Exports

```typescript
// features/synthetic/types/index.ts
export interface SyntheticDataConfig {
  id: string;
  name: string;
  // ...
}

export type PrivacyLevel = 'low' | 'medium' | 'high';
```

## Testing Patterns

### Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigListView } from './ConfigListView';

describe('ConfigListView', () => {
  const mockConfigs = [/* test data */];
  const mockOnDelete = jest.fn();

  it('renders all configurations', () => {
    render(
      <ConfigListView 
        configs={mockConfigs} 
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getAllByTestId('config-card')).toHaveLength(mockConfigs.length);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(
      <ConfigListView 
        configs={mockConfigs} 
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getAllByText('Delete')[0]);
    expect(mockOnDelete).toHaveBeenCalledWith(mockConfigs[0].id);
  });
});
```

### Hook Tests

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useModal } from './useModal';

describe('useModal', () => {
  it('toggles modal state', () => {
    const { result } = renderHook(() => useModal());

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
  });
});
```

## Best Practices

1. **Keep components focused** - Single responsibility principle
2. **Use TypeScript** - Type all props and return values
3. **Write tests** - Aim for 80% coverage
4. **Document complex logic** - Add JSDoc comments
5. **Optimize performance** - Use React.memo when appropriate
6. **Handle errors gracefully** - Always show user-friendly messages
7. **Make components accessible** - Use proper ARIA attributes

## Common Pitfalls to Avoid

1. **Over-engineering** - Not every component needs to be split
2. **Prop drilling** - Use context or composition when needed
3. **Business logic in UI components** - Keep it in hooks/services
4. **Inconsistent naming** - Follow the established patterns
5. **Missing loading/error states** - Always handle async operations

## Migration Checklist

When migrating existing code:

- [ ] Identify logical component boundaries
- [ ] Extract types to separate files
- [ ] Create container/presenter split
- [ ] Move API calls to services
- [ ] Create custom hooks for logic
- [ ] Add proper TypeScript types
- [ ] Write tests for new components
- [ ] Update imports in parent components
- [ ] Remove old code