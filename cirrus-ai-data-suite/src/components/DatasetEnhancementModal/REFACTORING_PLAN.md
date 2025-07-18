# DatasetEnhancementModal Refactoring Plan

## Current State
- **Single file**: DatasetEnhancementModal.tsx (657 lines)
- **Mixed concerns**: UI, business logic, API calls, data processing

## Proposed Architecture

```
src/components/DatasetEnhancementModal/
├── index.tsx                             // Main orchestrator (~100 lines)
├── types/
│   ├── enhancement.types.ts              // All TypeScript interfaces
│   └── steps.types.ts                    // Step-specific types
├── services/
│   ├── datasetAnalysisService.ts        // Dataset analysis logic
│   ├── datasetEnhancementService.ts     // Enhancement processing
│   └── fileContentService.ts            // File content retrieval
├── hooks/
│   ├── useEnhancementWorkflow.ts        // Main workflow state management
│   ├── useDatasetAnalysis.ts            // Analysis step logic
│   └── useFieldSelection.ts             // Field selection state
├── components/
│   ├── EnhancementModal.tsx             // Modal wrapper with header
│   ├── ErrorDisplay.tsx                 // Error message component
│   ├── steps/
│   │   ├── AnalyzeStep.tsx             // Step 1: Analysis UI
│   │   ├── SelectFieldsStep.tsx        // Step 2: Field selection UI
│   │   └── CompleteStep.tsx            // Step 3: Completion UI
│   ├── field-selection/
│   │   ├── FieldCard.tsx               // Individual field card
│   │   ├── FieldList.tsx               // List of selectable fields
│   │   └── FieldPriority.tsx           // Priority indicators
│   └── shared/
│       ├── StepIndicator.tsx            // Progress indicator
│       ├── ActionButton.tsx             // Reusable button component
│       └── SummaryStats.tsx             // Enhancement statistics
└── __tests__/
    ├── DatasetEnhancementModal.test.tsx  // Integration tests
    ├── hooks/                            // Hook tests
    └── services/                         // Service tests
```

## Key Improvements

1. **Separation of Concerns**
   - UI components handle only presentation
   - Services handle business logic and API calls
   - Hooks manage state and orchestrate workflow

2. **Reusability**
   - Field selection components can be reused
   - Service functions can be tested independently
   - Shared UI components reduce duplication

3. **Testability**
   - Each service function can be unit tested
   - Hooks can be tested with renderHook
   - Components can be tested in isolation

4. **Maintainability**
   - Clear file structure
   - Single responsibility per file
   - Easy to find and modify specific functionality

## Refactoring Steps

1. Extract types and interfaces
2. Create service layer for data operations
3. Extract hooks for state management
4. Split UI into focused components
5. Create shared components for reusable UI
6. Add comprehensive tests