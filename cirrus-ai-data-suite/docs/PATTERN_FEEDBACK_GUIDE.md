# Pattern Feedback System Testing Guide

## Overview
The pattern feedback system allows users to provide thumbs up/down feedback on pattern matches to improve accuracy over time. After 3 negative feedbacks, patterns automatically exclude false positives.

## How It Works

### Prerequisites
1. Patterns must exist in the database (not just client-side temporary patterns)
2. Patterns need valid database IDs (not temporary IDs like "pattern-1" or "custom-123")

### Testing Steps

#### Step 1: Create a Demo Pattern
Visit: `http://localhost:3000/api/test/pattern-feedback-demo`

This will:
- Create a demo SSN pattern in the database
- Return instructions for testing

#### Step 2: Go to Pattern Definition Page
1. Navigate to `/redaction` (Pattern Definition)
2. You should see "Demo SSN Pattern" in the patterns list
3. The pattern will have a proper database ID

#### Step 3: Create Test Data
Create a data source with SSN-like content:
```
Sample employee records:
Name: John Doe
SSN: 123-45-6789
Department: Sales

Name: Jane Smith  
SSN: 987-65-4321
Department: Marketing

Random text with SSN pattern: 555-12-3456
```

#### Step 4: Test Pattern Feedback
1. Click "Annotate Data" on your test data source
2. The SSNs should be highlighted automatically (from the demo pattern)
3. **Click on any highlighted SSN**
4. Check the browser console for debug logs:
   - "Highlight clicked:" - Shows pattern matching
   - "Pattern persistence check:" - Shows if feedback is enabled
5. If the pattern has a database ID, feedback UI should appear

### Troubleshooting

#### Feedback UI Not Appearing?
1. Check browser console for debug messages
2. Look for "Pattern persistence check" - `isPersistedPattern` should be `true`
3. Common issues:
   - Pattern has temporary ID (pattern-1, custom-123) = not saved to database
   - Pattern not found in patterns list
   - Click target not recognized as highlight

#### Console Debug Output
When clicking a highlight, you should see:
```javascript
Highlight clicked: {
  patternLabel: "Demo SSN Pattern",
  foundPattern: {...},
  patternId: "actual-database-id",
  allPatterns: [...]
}

Pattern persistence check: {
  patternId: "actual-database-id",
  isPersistedPattern: true,
  shouldShowFeedback: true
}
```

### How Pattern IDs Work

1. **Temporary IDs** (feedback disabled):
   - `pattern-0`, `pattern-1`, etc. - Predefined patterns not yet saved
   - `custom-1234567890` - Custom patterns created in UI

2. **Database IDs** (feedback enabled):
   - UUID format: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
   - Or incremental: `1`, `2`, `3` (depending on database)

### Using Existing Patterns
1. Create and save patterns through the UI first
2. They'll get proper database IDs
3. When you return to Pattern Definition, these saved patterns will load
4. Annotation with these patterns will have feedback enabled

### API Endpoints
- `/api/patterns/feedback` - Submit feedback
- `/api/patterns/refined` - Get patterns with exclusions
- `/api/patterns/feedback/accuracy` - Get accuracy metrics
- `/api/test/auto-refinement` - Test auto-refinement threshold

## Auto-Refinement
After 3 negative feedbacks on the same text:
1. The text is added to pattern exclusions
2. Future matches of that text are filtered out
3. The pattern becomes more accurate over time