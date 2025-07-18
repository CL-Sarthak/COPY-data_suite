# DataSourceTable Logic and Presentation Separation

## Overview

This document details the refactoring of the DataSourceTable component from a 978-line monolithic component into a clean, modular architecture with separated concerns.

## What We Separated

### 1. **Business Logic** → `DataSourceTableService`
- Sorting algorithms
- Tag filtering logic
- Data transformations
- API calls for preview/content
- Type checking and formatting
- Icon/label mappings

### 2. **State Management** → Custom Hooks
- `useDataSourceTable` - Main table state (sorting, filtering, expansion)
- `useTransformedPreview` - Preview data fetching
- `useFileContent` - File content loading

### 3. **Presentation** → Modular Components
- `SortHeader` - Sortable column headers
- `StatusDisplay` - Connection status icons
- `SourceTypeIcon` - Data source type icons
- `TransformButton` - Transform action button
- `ActionButtons` - Row action buttons
- `TransformedDataPreview` - JSON preview display
- `FileContentViewer` - File content display
- `DataSourceDetails` - Expanded row details
- `EmptyState` - No data message
- `LoadingState` - Loading spinner

## Benefits Achieved

1. **Reduced Complexity**
   - Main component: 978 → ~250 lines
   - Clear single responsibilities
   - Easier to understand flow

2. **Improved Testability**
   - Service methods can be unit tested
   - Hooks can be tested in isolation
   - Components can be tested with mocks

3. **Better Reusability**
   - Icons can be used elsewhere
   - Hooks can power other tables
   - Components are self-contained

4. **Enhanced Maintainability**
   - Changes isolated to specific files
   - Clear separation of concerns
   - Type-safe interfaces

## File Structure

```
src/
├── types/
│   └── dataSourceTable.ts         # All type definitions
├── services/
│   └── dataSourceTableService.ts  # Business logic
├── hooks/
│   ├── useDataSourceTable.ts      # Main table state
│   ├── useTransformedPreview.ts   # Preview data hook
│   └── useFileContent.ts          # File content hook
└── components/
    ├── DataSourceTable.tsx         # Original (preserved)
    ├── DataSourceTable-refactored.tsx  # Refactored version
    └── dataSourceTable/           # Sub-components
        ├── SortHeader.tsx
        ├── StatusDisplay.tsx
        ├── SourceTypeIcon.tsx
        ├── TransformButton.tsx
        ├── ActionButtons.tsx
        ├── TransformedDataPreview.tsx
        ├── FileContentViewer.tsx
        ├── DataSourceDetails.tsx
        ├── EmptyState.tsx
        └── LoadingState.tsx
```

## Key Refactoring Patterns

### 1. Extract Service Methods
```typescript
// Before: Inline in component
const getSourceIcon = (type) => {
  switch (type) {
    case 'database': return <CircleStackIcon />;
    // ...
  }
};

// After: Service method + component
class DataSourceTableService {
  static getSourceIconName(type: DataSource['type']): string {
    // Return icon name
  }
}

// Separate icon component
export function SourceTypeIcon({ type }) {
  // Render appropriate icon
}
```

### 2. Custom Hooks for State
```typescript
// Before: All state in component
const [sortField, setSortField] = useState('name');
const [sortDirection, setSortDirection] = useState('asc');
// ... more state

// After: Encapsulated in hook
export function useDataSourceTable(dataSources) {
  // All table state management
  return {
    sortField,
    sortDirection,
    handleSort,
    // ... other state and handlers
  };
}
```

### 3. Focused Components
```typescript
// Before: 200+ lines of JSX for buttons
<button onClick={...} className={...}>
  {/* Complex conditional rendering */}
</button>

// After: Dedicated component
<TransformButton 
  source={source}
  transformingSource={transformingSource}
  onTransform={onTransform}
/>
```

## Migration Guide

To use the refactored version:

1. Replace imports:
```typescript
// Old
import DataSourceTable from '@/components/DataSourceTable';

// New
import DataSourceTable from '@/components/DataSourceTable-refactored';
```

2. All props remain the same - no changes needed in parent components

3. Functionality is 100% preserved

## Next Steps

1. Add unit tests for:
   - DataSourceTableService methods
   - Custom hooks
   - Individual components

2. Consider extracting more shared patterns:
   - Table pagination hook
   - Generic sort/filter hooks
   - Shared loading/error states

3. Apply similar patterns to other large components:
   - CatalogManager (1347 lines)
   - DatasetEnhancementModal (600+ lines)