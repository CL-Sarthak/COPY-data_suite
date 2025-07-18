# Codebase Modularization Plan

## Executive Summary

This plan addresses the current monolithic structure of the application, where large page components (up to 1926 lines) mix multiple concerns including UI state, business logic, API calls, and rendering. The goal is to create a maintainable, scalable architecture using modern React patterns and clear separation of concerns.

## Current State Analysis

### Problem Areas

1. **Monolithic Page Components**
   - `src/app/synthetic/page.tsx` - 1926 lines
   - `src/app/redaction/page.tsx` - 1392 lines  
   - `src/app/discovery/page.tsx` - 1117 lines
   - `src/components/CatalogManager.tsx` - 1347 lines
   - `src/components/FieldMappingInterface.tsx` - 1196 lines
   - `src/components/DataAnnotation.tsx` - 1183 lines

2. **Mixed Responsibilities**
   - UI state management mixed with business logic
   - Direct API calls from components
   - Complex event handling inline
   - Multiple modals and sub-features in single files
   - No clear feature boundaries

3. **Code Duplication**
   - Similar modal patterns repeated
   - Common loading/error states reimplemented
   - Repeated API call patterns
   - Similar table/list components

## Proposed Architecture

### 1. Feature-Based Module Structure

```
src/
├── features/                    # Feature modules
│   ├── synthetic/              # Synthetic data feature
│   │   ├── components/         # Feature-specific components
│   │   │   ├── ConfigForm.tsx
│   │   │   ├── JobList.tsx
│   │   │   ├── PreviewModal.tsx
│   │   │   └── index.ts
│   │   ├── hooks/              # Feature-specific hooks
│   │   │   ├── useSyntheticConfigs.ts
│   │   │   ├── useSyntheticJobs.ts
│   │   │   └── useTemplates.ts
│   │   ├── services/           # Feature services (if not shared)
│   │   ├── types/              # Feature types
│   │   ├── utils/              # Feature utilities
│   │   └── index.ts            # Public API
│   │
│   ├── redaction/              # Redaction feature
│   │   ├── components/
│   │   │   ├── AnnotationView.tsx
│   │   │   ├── PatternList.tsx
│   │   │   └── DetectionSettings.tsx
│   │   ├── hooks/
│   │   │   ├── usePatterns.ts
│   │   │   └── useAnnotations.ts
│   │   └── ...
│   │
│   ├── discovery/              # Data discovery feature
│   │   ├── components/
│   │   │   ├── DataSourceList.tsx
│   │   │   ├── AddSourceModal.tsx
│   │   │   └── FileUploader.tsx
│   │   ├── hooks/
│   │   └── ...
│   │
│   └── shared/                 # Shared across features
│       ├── components/
│       ├── hooks/
│       └── utils/
│
├── core/                       # Core application logic
│   ├── api/                    # API client layer
│   │   ├── client.ts
│   │   └── endpoints/
│   ├── stores/                 # Global state (if needed)
│   └── types/                  # Core types
│
└── app/                        # Next.js app directory (thin pages)
    ├── synthetic/
    │   └── page.tsx            # ~50 lines - just layout + feature
    ├── redaction/
    │   └── page.tsx
    └── discovery/
        └── page.tsx
```

### 2. Component Patterns

#### Container/Presenter Pattern
```typescript
// features/synthetic/components/ConfigList/ConfigListContainer.tsx
export function ConfigListContainer() {
  const { configs, loading, error } = useSyntheticConfigs();
  const { deleteConfig, updateConfig } = useConfigActions();
  
  if (loading) return <ConfigListSkeleton />;
  if (error) return <ErrorState error={error} />;
  
  return (
    <ConfigListView 
      configs={configs}
      onDelete={deleteConfig}
      onUpdate={updateConfig}
    />
  );
}

// features/synthetic/components/ConfigList/ConfigListView.tsx
export function ConfigListView({ configs, onDelete, onUpdate }) {
  // Pure presentation logic
}
```

#### Custom Hooks for Business Logic
```typescript
// features/synthetic/hooks/useSyntheticConfigs.ts
export function useSyntheticConfigs() {
  const [configs, setConfigs] = useState<SyntheticDataConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await syntheticAPI.getConfigs();
      setConfigs(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { configs, loading, error, refetch: loadConfigs };
}
```

### 3. Modularization Strategy

#### Phase 1: Extract Reusable Components (Week 1)
1. **Common UI Components**
   - LoadingState, ErrorState, EmptyState
   - ConfirmationModal, FormModal
   - DataTable, DataList
   - ActionButton, ActionMenu

2. **Layout Components**
   - PageHeader, PageContent
   - SectionHeader, SectionContent
   - ModalWrapper, DrawerWrapper

#### Phase 2: Create Feature Modules (Week 2-3)
1. **Synthetic Data Module**
   - Extract configuration management
   - Extract job management
   - Extract template handling
   - Create unified API service

2. **Redaction Module**
   - Extract pattern management
   - Extract annotation logic
   - Extract detection settings

3. **Discovery Module**
   - Extract data source CRUD
   - Extract file upload logic
   - Extract transformation handling

#### Phase 3: Implement Smart/Dumb Components (Week 3-4)
1. Convert each feature to use:
   - Container components (data fetching)
   - Presenter components (pure UI)
   - Custom hooks (business logic)
   - Service layer (API calls)

#### Phase 4: Optimize State Management (Week 4)
1. Implement proper caching
2. Add optimistic updates
3. Reduce unnecessary re-renders
4. Consider global state for shared data

### 4. Implementation Examples

#### Before (Monolithic):
```typescript
// app/synthetic/page.tsx (1926 lines)
export default function SyntheticData() {
  // 70+ state variables
  const [configs, setConfigs] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  // ... many more
  
  // Inline API calls
  const loadConfigs = async () => {
    const response = await fetch('/api/synthetic');
    // ...
  };
  
  // Complex JSX with nested modals
  return (
    <div>
      {/* 1800+ lines of JSX */}
    </div>
  );
}
```

#### After (Modular):
```typescript
// app/synthetic/page.tsx (50 lines)
import { SyntheticDataFeature } from '@/features/synthetic';

export default function SyntheticDataPage() {
  return (
    <AppLayout>
      <SyntheticDataFeature />
    </AppLayout>
  );
}

// features/synthetic/SyntheticDataFeature.tsx
export function SyntheticDataFeature() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Synthetic Data Generation"
        actions={<CreateConfigButton />}
      />
      
      <ConfigurationSection />
      <JobsSection />
      <TemplatesSection />
    </div>
  );
}

// features/synthetic/components/ConfigurationSection.tsx
export function ConfigurationSection() {
  const { configs, loading, error } = useSyntheticConfigs();
  
  return (
    <Section title="Configurations">
      <ConfigList 
        configs={configs}
        loading={loading}
        error={error}
      />
    </Section>
  );
}
```

### 5. Benefits

1. **Maintainability**
   - Smaller, focused files
   - Clear responsibility boundaries
   - Easier to test individual pieces

2. **Reusability**
   - Shared components across features
   - Common hooks and utilities
   - Consistent patterns

3. **Performance**
   - Better code splitting
   - Reduced bundle sizes
   - Optimized re-renders

4. **Developer Experience**
   - Easier to find code
   - Clear feature boundaries
   - Predictable structure

### 6. Migration Path

1. **Start with new features** - Implement new features using the modular pattern
2. **Gradual refactoring** - Extract components from monolithic files one at a time
3. **Test coverage** - Add tests as you extract components
4. **Documentation** - Document patterns and conventions

### 7. Considerations

1. **Avoid over-engineering** - Not every component needs to be split
2. **Performance monitoring** - Ensure modularization doesn't hurt performance
3. **Team alignment** - Get buy-in on patterns and conventions
4. **Incremental approach** - Don't try to refactor everything at once

## Next Steps

1. Review and approve this plan
2. Create a proof of concept with one feature
3. Establish coding standards and patterns
4. Begin incremental migration
5. Monitor and adjust based on feedback

## Success Metrics

- Reduced average file size (target: <300 lines)
- Increased component reuse (target: 30% shared components)
- Improved test coverage (target: 80%)
- Faster feature development time
- Reduced bug reports related to side effects