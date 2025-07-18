# Code Coverage Guide

## How to View Coverage Reports

### 1. Terminal Coverage Reports

```bash
# Text summary (quick overview)
npm test -- --coverage --coverageReporters=text-summary

# Detailed text report (shows uncovered lines)
npm test -- --coverage --coverageReporters=text

# Run specific test suites with coverage
npm test -- --coverage --testPathPattern="component"
npm test -- --coverage --testPathPattern="service"
```

### 2. HTML Coverage Report (Interactive)

```bash
# Generate HTML report
npm test -- --coverage --coverageReporters=html

# Open the report
# On macOS:
open coverage/index.html

# On Linux:
xdg-open coverage/index.html

# On Windows:
start coverage/index.html
```

The HTML report allows you to:
- Click through files to see line-by-line coverage
- See which branches and functions are not covered
- Identify files with low coverage
- View source code with coverage highlighting

### 3. Coverage Thresholds

Add coverage thresholds to `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

### 4. Running Tests with Coverage (Memory-Safe)

Due to memory constraints, run tests in batches:

```bash
# Component tests only
npm test -- --coverage --testPathPattern="component" --runInBand

# Service tests only  
npm test -- --coverage --testPathPattern="service" --runInBand

# Utility tests only
npm test -- --coverage --testPathPattern="util" --runInBand
```

### 5. CI/CD Coverage Reports

For GitHub Actions, add to your workflow:

```yaml
- name: Run tests with coverage
  run: npm test -- --coverage --coverageReporters=lcov

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

### 6. Exclude Files from Coverage

Files already excluded (see `jest.config.js`):
- `*.d.ts` - TypeScript declarations
- `layout.tsx` - Next.js layouts
- `loading.tsx` - Loading components
- `not-found.tsx` - Error pages
- `error.tsx` - Error boundaries
- `page.tsx` - Page components (tested separately)

To exclude additional files, update `collectCoverageFrom` in `jest.config.js`.

### 7. Current Coverage Status

As of the latest test run:
- **Component Tests**: ~5% coverage (91 tests passing)
- **Service Tests**: Higher coverage in tested services
- **Overall Target**: 80% coverage

### 8. Improving Coverage

Priority areas for new tests:
1. **Services** - Core business logic
   - `dataTransformationService.ts`
   - `syntheticDataService.ts`
   - `pipelineService.ts`

2. **API Routes** - Critical endpoints
   - Data source operations
   - Pipeline execution
   - Synthetic data generation

3. **Utilities** - Shared functions
   - Validation utilities
   - Data processing helpers

### 9. Coverage Reports Location

Coverage reports are generated in:
```
coverage/
├── index.html          # Main HTML report
├── lcov.info          # LCOV format (for CI)
├── coverage-final.json # Detailed JSON data
└── coverage-summary.json # Summary statistics
```

### 10. Tips for Better Coverage

1. **Focus on critical paths first**
   - User authentication flows
   - Data processing pipelines
   - Error handling

2. **Write tests for edge cases**
   - Invalid inputs
   - Network failures
   - Empty states

3. **Test both success and failure paths**
   - Happy path scenarios
   - Error conditions
   - Validation failures

4. **Use coverage to find dead code**
   - Unused functions
   - Unreachable branches
   - Legacy code