# DataProfilingViewer Component

A modular component for displaying comprehensive data quality profiles and field analysis.

## Structure

The component has been refactored from a single 611-line file into a modular architecture:

### Components

1. **index.tsx** - Main component that orchestrates all sub-components
2. **LoadingState.tsx** - Loading state display
3. **ErrorState.tsx** - Error state display with retry capability
4. **ProfileHeader.tsx** - Header with data source info and actions
5. **QualitySummary.tsx** - Overall quality metrics summary
6. **QualityIssues.tsx** - Quality issues list with expandable details
7. **FieldAnalysis.tsx** - Field list with search, filter, and selection
8. **Recommendations.tsx** - Action recommendations display
9. **FieldDetailSidebar.tsx** - Detailed field information sidebar
10. **IssueIcon.tsx** - Icon component for issue types

### Hooks

- **useDataProfiling.ts** - Custom hook for managing profiling state and API calls

### Utilities

- **utils.ts** - Helper functions for quality scoring and labels
- **types.ts** - TypeScript type definitions

## Features

- Comprehensive data quality analysis
- Field-level profiling with metrics
- Quality issue detection and recommendations
- Interactive field exploration
- Search and filter capabilities
- Expandable/collapsible sections
- Real-time profile regeneration

## Usage

```tsx
import DataProfilingViewer from '@/components/DataProfilingViewer';

<DataProfilingViewer
  sourceId={dataSource.id}
  onClose={() => setShowProfile(false)}
/>
```

## State Management

The component uses a custom hook (`useDataProfiling`) to manage:
- Profile data loading
- Error handling
- Section expansion states
- Field selection
- Search and filter states

## API Integration

- `GET /api/data-sources/{id}/profile` - Load profile data
- `POST /api/data-sources/{id}/profile` - Regenerate profile