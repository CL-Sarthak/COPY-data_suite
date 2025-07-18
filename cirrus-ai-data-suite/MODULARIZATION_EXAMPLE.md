# Modularization Example: Synthetic Data Feature

This document provides a detailed example of how to modularize the synthetic data feature, currently in `src/app/synthetic/page.tsx` (1926 lines).

## Current Structure Analysis

The synthetic data page currently handles:
1. Configuration management (create, edit, delete)
2. Job management and monitoring
3. Template selection and management
4. Real-time SSE updates
5. File downloads
6. Data source integration
7. Preview functionality
8. Multiple modal states
9. Error handling and loading states

## Proposed Modular Structure

```
src/features/synthetic/
├── index.ts                          # Public API
├── SyntheticDataFeature.tsx          # Main feature component
├── types/
│   ├── index.ts
│   ├── config.types.ts
│   └── job.types.ts
├── components/
│   ├── index.ts
│   ├── configurations/
│   │   ├── ConfigList.tsx
│   │   ├── ConfigCard.tsx
│   │   ├── ConfigForm.tsx
│   │   └── EditConfigModal.tsx
│   ├── jobs/
│   │   ├── JobList.tsx
│   │   ├── JobCard.tsx
│   │   ├── JobProgress.tsx
│   │   └── JobActions.tsx
│   ├── templates/
│   │   ├── TemplateSelector.tsx
│   │   └── TemplatePreview.tsx
│   ├── modals/
│   │   ├── PreviewDataModal.tsx
│   │   ├── AddToDataSourceModal.tsx
│   │   └── CreateConfigModal.tsx
│   └── common/
│       ├── EmptyState.tsx
│       └── LoadingState.tsx
├── hooks/
│   ├── index.ts
│   ├── useConfigurations.ts
│   ├── useJobs.ts
│   ├── useTemplates.ts
│   ├── useJobSSE.ts
│   └── useConfigActions.ts
├── services/
│   ├── api.ts                        # API client for synthetic feature
│   └── transforms.ts                 # Data transformation utilities
└── utils/
    ├── validation.ts
    └── formatters.ts
```

## Implementation Details

### 1. Main Feature Component

```typescript
// features/synthetic/SyntheticDataFeature.tsx
import { ConfigurationPanel } from './components/configurations';
import { JobsPanel } from './components/jobs';
import { useServerlessCheck } from './hooks/useServerlessCheck';

export function SyntheticDataFeature() {
  const { showWarning } = useServerlessCheck();

  return (
    <div className="space-y-8">
      {showWarning && <ServerlessWarning />}
      
      <FeatureHeader />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ConfigurationPanel />
        <JobsPanel />
      </div>
    </div>
  );
}
```

### 2. Configuration Management

```typescript
// features/synthetic/components/configurations/ConfigurationPanel.tsx
export function ConfigurationPanel() {
  const { configs, loading, error } = useConfigurations();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <Panel title="Configurations" action={
      <Button onClick={() => setShowCreateModal(true)}>
        <PlusIcon /> New Configuration
      </Button>
    }>
      <ConfigList configs={configs} loading={loading} error={error} />
      
      {showCreateModal && (
        <CreateConfigModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            // Hook will auto-refresh
          }}
        />
      )}
    </Panel>
  );
}
```

### 3. Custom Hooks

```typescript
// features/synthetic/hooks/useConfigurations.ts
export function useConfigurations() {
  const [configs, setConfigs] = useState<SyntheticDataConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await syntheticAPI.getConfigurations();
      setConfigs(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  return {
    configs,
    loading,
    error,
    refetch: loadConfigs
  };
}

// features/synthetic/hooks/useConfigActions.ts
export function useConfigActions() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const createConfig = useMutation({
    mutationFn: syntheticAPI.createConfiguration,
    onSuccess: () => {
      queryClient.invalidateQueries(['synthetic-configs']);
      toast.success('Configuration created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create configuration: ${error.message}`);
    }
  });

  const deleteConfig = useMutation({
    mutationFn: syntheticAPI.deleteConfiguration,
    onSuccess: () => {
      queryClient.invalidateQueries(['synthetic-configs']);
      toast.success('Configuration deleted');
    }
  });

  return {
    createConfig,
    deleteConfig,
    // ... other actions
  };
}
```

### 4. Modals as Separate Components

```typescript
// features/synthetic/components/modals/CreateConfigModal.tsx
interface CreateConfigModalProps {
  onClose: () => void;
  onSuccess: (config: SyntheticDataConfig) => void;
}

export function CreateConfigModal({ onClose, onSuccess }: CreateConfigModalProps) {
  const [formData, setFormData] = useState<ConfigFormData>(initialFormData);
  const { templates } = useTemplates();
  const { createConfig } = useConfigActions();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      const config = await createConfig.mutateAsync(formData);
      onSuccess(config);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Modal onClose={onClose} title="Create Configuration">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Configuration Name"
          value={formData.name}
          onChange={(value) => setFormData({ ...formData, name: value })}
          required
        />
        
        <DataSourceSelector
          value={formData.sourceId}
          onChange={(sourceId) => setFormData({ ...formData, sourceId })}
        />
        
        <TemplateSelector
          templates={templates}
          value={formData.templateId}
          onChange={(templateId) => setFormData({ ...formData, templateId })}
        />
        
        <PrivacyLevelSelector
          value={formData.privacyLevel}
          onChange={(level) => setFormData({ ...formData, privacyLevel: level })}
        />
        
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createConfig.isLoading}>
            Create Configuration
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

### 5. SSE Integration

```typescript
// features/synthetic/hooks/useJobSSE.ts
export function useJobSSE(onJobUpdate: (job: SyntheticDataJob) => void) {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const eventSource = new EventSource('/api/synthetic/jobs/updates');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const job = JSON.parse(event.data);
        onJobUpdate(job);
      } catch (error) {
        console.error('Failed to parse job update:', error);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE connection error');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [onJobUpdate]);

  return eventSourceRef;
}
```

### 6. Shared Components

```typescript
// features/shared/components/Panel.tsx
interface PanelProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, action, children, className }: PanelProps) {
  return (
    <div className={cn("bg-white rounded-lg shadow", className)}>
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {action && <div>{action}</div>}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
```

### 7. Service Layer

```typescript
// features/synthetic/services/api.ts
class SyntheticAPI {
  private baseUrl = '/api/synthetic';

  async getConfigurations(): Promise<SyntheticDataConfig[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch configurations');
    }
    return response.json();
  }

  async createConfiguration(data: ConfigFormData): Promise<SyntheticDataConfig> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create configuration');
    }
    
    return response.json();
  }

  async generateData(configId: string): Promise<SyntheticDataJob> {
    const response = await fetch(`${this.baseUrl}/${configId}/generate`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Failed to start generation');
    }
    
    return response.json();
  }

  // ... other methods
}

export const syntheticAPI = new SyntheticAPI();
```

## Migration Steps

1. **Create feature directory structure**
2. **Extract types and interfaces**
3. **Create service layer with API calls**
4. **Build custom hooks for data fetching**
5. **Extract modal components**
6. **Create list/card components**
7. **Build container components**
8. **Update main page to use feature component**
9. **Add tests for each module**
10. **Remove old monolithic code**

## Testing Strategy

```typescript
// features/synthetic/hooks/__tests__/useConfigurations.test.ts
describe('useConfigurations', () => {
  it('loads configurations on mount', async () => {
    const mockConfigs = [/* test data */];
    mockAPI.getConfigurations.mockResolvedValue(mockConfigs);

    const { result } = renderHook(() => useConfigurations());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.configs).toEqual(mockConfigs);
    });
  });

  it('handles errors gracefully', async () => {
    const error = new Error('Network error');
    mockAPI.getConfigurations.mockRejectedValue(error);

    const { result } = renderHook(() => useConfigurations());

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
      expect(result.current.loading).toBe(false);
    });
  });
});
```

## Benefits Achieved

1. **File Size Reduction**: From 1926 lines to ~15 files of 50-200 lines each
2. **Testability**: Each component and hook can be tested in isolation
3. **Reusability**: Components like Panel, Modal, and FormField are reused
4. **Maintainability**: Clear separation of concerns and single responsibility
5. **Performance**: Better code splitting and lazy loading opportunities