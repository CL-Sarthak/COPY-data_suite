# Coverage Improvement Plan - From 5% to 80%

## Current State
- **Overall Coverage**: 4.98% (440/8819 lines)
- **Tests Passing**: 176 tests across 19 files
- **Target**: 80% coverage

## High-Impact Coverage Opportunities

### 1. Components with Existing Tests (Quick Wins)
These already have test infrastructure - just need more test cases:

| Component | Current Coverage | Lines to Cover | Priority |
|-----------|-----------------|----------------|----------|
| TagManager | 90.54% | 7 lines | HIGH |
| HelpSystem | 77.27% | 5 lines | HIGH |
| DataSourceTable | 56.17% | 78 lines | HIGH |
| FieldMappingInterface | 59.81% | 86 lines | HIGH |
| DatasetEnhancementModal | 33.51% | 121 lines | MEDIUM |

**Action**: Add missing test cases for edge cases and error paths

### 2. Small Utility Files (Easy Coverage)
Small files that can quickly boost coverage:

| File | Lines | Impact |
|------|-------|--------|
| utils/logger.ts | 20 | Quick win |
| content/helpContent.ts | 3 | Quick win |
| entities/*.ts | ~20 total | Quick win |
| utils/validation.ts | ~50 | High value |
| utils/redactionUtils.ts | ~100 | High value |

### 3. Critical Services (High Business Value)
Core business logic that needs testing:

| Service | Lines | Priority | Reason |
|---------|-------|----------|---------|
| dataTransformationService | 230 | CRITICAL | Core data processing |
| catalogMappingService | 238 | CRITICAL | Field mapping logic |
| dataSourceService | 269 | CRITICAL | Data source management |
| patternService | 55 | HIGH | Pattern detection |
| globalCatalogService | 85 | HIGH | Catalog management |

### 4. API Routes (Integration Points)
Key API endpoints that need coverage:

| Route | Priority | Test Type |
|-------|----------|-----------|
| /api/data-sources | HIGH | Integration |
| /api/catalog/* | HIGH | Integration |
| /api/synthetic/* | MEDIUM | Integration |
| /api/patterns | MEDIUM | Integration |

## Implementation Strategy

### Phase 1: Quick Wins (Week 1)
**Goal**: Reach 20% coverage
1. Complete coverage for TagManager and HelpSystem (95%+ each)
2. Add tests for all entity files
3. Test utility files (logger, validation)
4. Increase DataSourceTable coverage to 80%

### Phase 2: Component Coverage (Week 2)
**Goal**: Reach 40% coverage
1. FieldMappingInterface to 80%
2. DatasetEnhancementModal to 70%
3. Add tests for smaller components:
   - Dialog
   - LLMIndicator/MLIndicator
   - ExportData

### Phase 3: Service Layer (Week 3)
**Goal**: Reach 60% coverage
1. dataTransformationService (80% coverage)
2. catalogMappingService (80% coverage)
3. patternService and related services
4. Storage services

### Phase 4: API & Integration (Week 4)
**Goal**: Reach 80% coverage
1. API route tests for critical endpoints
2. Integration tests for workflows
3. Fill remaining gaps

## Test Writing Guidelines

### 1. Focus on Business Logic
```typescript
// Good: Tests actual business logic
it('should calculate correct profiling statistics', () => {
  const result = dataProfilingService.profileData(testData);
  expect(result.uniqueValues).toBe(10);
  expect(result.nullCount).toBe(2);
});

// Avoid: Testing implementation details
it('should call internal method', () => {
  // Don't test private methods
});
```

### 2. Test Edge Cases
- Empty inputs
- Null/undefined values
- Large datasets
- Invalid data types
- Error conditions

### 3. Use Test Data Builders
```typescript
const createTestDataSource = (overrides = {}) => ({
  id: 'test-1',
  name: 'Test Source',
  type: 'filesystem',
  ...overrides
});
```

### 4. Mock External Dependencies
```typescript
jest.mock('@/services/llmService');
const mockLLMService = llmService as jest.Mocked<typeof llmService>;
```

## Specific Test Files to Create

### Immediate Priority (20 files)
1. `src/utils/__tests__/logger.test.ts`
2. `src/entities/__tests__/*.test.ts` (10 files)
3. `src/services/__tests__/globalCatalogService.test.ts`
4. `src/services/__tests__/patternService.test.ts`
5. `src/services/__tests__/dashboardService.test.ts`
6. `src/services/__tests__/sessionService.test.ts`
7. `src/components/__tests__/Dialog.test.tsx`
8. `src/components/__tests__/LLMIndicator.test.tsx`
9. `src/components/__tests__/MLIndicator.test.tsx`
10. `src/components/__tests__/ExportData.test.tsx`

## Memory Issue Resolution

The "memory constraints" are likely due to:
1. Large test data in some files
2. Memory leaks in test setup/teardown
3. Too many files being analyzed by coverage

### Solutions:
1. Run tests in smaller batches
2. Use `--runInBand` flag for sequential execution
3. Clear mocks and modules between tests
4. Limit coverage collection scope

### Recommended Test Commands:
```bash
# Run specific test suites
npm test -- --coverage src/components
npm test -- --coverage src/services
npm test -- --coverage src/utils

# Run with memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm test -- --coverage

# Run sequentially
npm test -- --coverage --runInBand
```

## Success Metrics

| Milestone | Coverage | Tests | Timeline |
|-----------|----------|-------|----------|
| Current | 5% | 176 | - |
| Phase 1 | 20% | 250+ | 1 week |
| Phase 2 | 40% | 400+ | 2 weeks |
| Phase 3 | 60% | 600+ | 3 weeks |
| Target | 80% | 800+ | 4 weeks |

## Next Actions

1. Start with `TagManager` - add 3 tests to reach 100%
2. Create `logger.test.ts` - 10 tests for full coverage
3. Add entity tests - 1 test per entity file
4. Complete `DataSourceTable` coverage - 15 more tests

Each developer should aim for:
- 5 test files per day
- 50+ tests per week
- Focus on one module at a time for complete coverage