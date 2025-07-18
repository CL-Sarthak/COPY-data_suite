# Field Mapping Display Issue Analysis

## Problem Summary
When users map fields (e.g., "Name" → "Full name"), the transformed data preview still shows the original field names instead of the mapped names.

## Root Cause Analysis

### 1. Data Flow
1. User maps fields via Field Mapping UI
2. User clicks "Apply Mappings" which calls `/api/data-sources/[id]/transform/apply-mappings`
3. The apply-mappings endpoint:
   - Correctly transforms field names (line 273-274 uses `catalogField.name`)
   - Saves the transformed data as an array to `transformedData` field
   - Sets `transformationAppliedAt` timestamp

### 2. The Problem

The issue is in the **transform endpoint** (`/api/data-sources/[id]/transform/route.ts`):

1. When the transform endpoint is called after apply-mappings, it has logic to handle field-mapped data (lines 216-289).
2. However, there's a critical issue: **The transform endpoint may save its result back to the database** (lines 315-344).
3. When it saves, it might overwrite the field-mapped data with the original UnifiedDataCatalog format.

### 3. Why This Happens

Look at line 329-333 in the transform endpoint:
```typescript
await repository.update(id, {
  transformedData: JSON.stringify(catalogToSave),
  transformedAt: new Date(),
  recordCount: catalog.totalRecords
});
```

This saves the catalog **without preserving field mappings** if:
- `!entity?.transformedData` (but this check might not work correctly)
- AND `catalog.totalRecords > 0`

### 4. The Preview Issue

The preview component (`useTransformedPreview` hook) tries to:
1. First check for field-mapped data in the data source
2. If found, use it directly
3. Otherwise, call the transform endpoint

But if the transform endpoint has already overwritten the field-mapped data, the preview will show the original field names.

## Solution

### Option 1: Fix the Transform Endpoint (Recommended)
Modify the transform endpoint to:
1. Check if `transformationAppliedAt` exists (indicates field mappings were applied)
2. If yes, DO NOT overwrite the `transformedData` field
3. Only save when it's the initial transformation

### Option 2: Separate Storage
Store field-mapped data in a different field (e.g., `fieldMappedData`) to prevent conflicts.

### Option 3: Fix the Save Condition
The current condition `!entity?.transformedData` might be evaluating incorrectly. It should check:
- If transformedData exists AND
- If it's field-mapped data (array format) AND  
- If transformationAppliedAt is set

Then it should NOT overwrite.

## Recommended Fix

Update line 315 in `/api/data-sources/[id]/transform/route.ts`:

```typescript
// Only save if this is the first transformation (not field-mapped data)
if (!entity?.transformedData && !entity?.transformationAppliedAt && catalog.totalRecords > 0) {
  try {
    // Save logic...
  } catch (saveError) {
    // Error handling...
  }
}
```

This ensures that once field mappings are applied, the transform endpoint won't overwrite the field-mapped data.