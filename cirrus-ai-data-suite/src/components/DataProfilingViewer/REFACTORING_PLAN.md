# DataProfilingViewer Refactoring Plan

## Current State
- **Single file**: DataProfilingViewer.tsx (610 lines)
- **Mixed concerns**: UI rendering, API calls, state management, quality calculations

## Component Analysis
1. **Main viewer** - Profile loading, state management, section toggling
2. **Quality metrics** - Quality score calculations and display
3. **Field analysis** - Field list with filtering and search
4. **Field detail sidebar** - Detailed field information display
5. **Recommendations** - Action recommendations display

## Proposed Architecture

```
src/components/DataProfilingViewer/
├── index.tsx                             // Main orchestrator (~80 lines)
├── types/
│   ├── profile.types.ts                  // TypeScript interfaces
│   └── viewer.types.ts                   // Component state types
├── services/
│   ├── profileService.ts                 // Profile loading/regeneration
│   └── qualityService.ts                 // Quality calculations
├── hooks/
│   ├── useProfileData.ts                 // Profile data management
│   ├── useProfileViewer.ts               // Viewer state management
│   └── useFieldFiltering.ts              // Field search/filter logic
├── components/
│   ├── ProfileViewer.tsx                 // Main viewer container
│   ├── ProfileHeader.tsx                 // Header with actions
│   ├── ProfileSkeleton.tsx               // Loading skeleton
│   ├── sections/
│   │   ├── SummarySection.tsx           // Profile summary
│   │   ├── QualitySection.tsx           // Quality metrics
│   │   ├── FieldAnalysisSection.tsx     // Field list section
│   │   └── RecommendationsSection.tsx   // Action recommendations
│   ├── field-analysis/
│   │   ├── FieldList.tsx                // Field list component
│   │   ├── FieldCard.tsx                // Individual field card
│   │   ├── FieldFilters.tsx             // Search and filter controls
│   │   └── FieldDetailSidebar.tsx       // Field detail view
│   ├── quality/
│   │   ├── QualityScore.tsx             // Quality score display
│   │   ├── QualityIssue.tsx             // Issue item display
│   │   └── QualityIndicators.tsx        // Quality indicators
│   └── shared/
│       ├── CollapsibleSection.tsx        // Expandable section wrapper
│       ├── MetricCard.tsx                // Metric display card
│       └── LoadingError.tsx              // Error state display
└── utils/
    ├── qualityCalculations.ts            // Quality score utilities
    └── fieldFormatters.ts                // Field data formatters
```

## Key Improvements

1. **Separation of Concerns**
   - API calls isolated in services
   - State management in dedicated hooks
   - UI components handle only presentation

2. **Reusability**
   - Quality indicators can be used elsewhere
   - Collapsible sections are reusable
   - Field cards can be repurposed

3. **Testability**
   - Quality calculations can be unit tested
   - Services can be mocked
   - Components tested in isolation

4. **Performance**
   - Heavy components can be memoized
   - Virtual scrolling for large field lists
   - Lazy loading of field details

## Refactoring Steps

1. Extract types and interfaces
2. Create utility functions for calculations
3. Build service layer for API calls
4. Create hooks for state management
5. Split UI into focused components
6. Add loading and error states
7. Implement tests