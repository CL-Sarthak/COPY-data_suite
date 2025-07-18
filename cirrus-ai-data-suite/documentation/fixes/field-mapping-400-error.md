# Field Mapping 400 Error Fix

## Problem

When attempting to apply field mappings, users were getting a 400 error:
```
POST http://localhost:3000/api/data-sources/{id}/transform/apply-mappings 400 (Bad Request)
Error: No data available for transformation
```

## Root Cause

The field mapping process requires transformed data from the data source, but:

1. The `/transform` endpoint was generating a UnifiedDataCatalog but not saving it to the database
2. The `/apply-mappings` endpoint was looking for transformed data but couldn't find it
3. The error message wasn't clear about what the user needed to do

## Solution

### 1. Save Transformation Results
Updated `/api/data-sources/[id]/transform/route.ts` to save the UnifiedDataCatalog:

```typescript
// Save the catalog to the database for future use
if (!entity?.transformedData && catalog.totalRecords > 0) {
  const catalogToSave = catalog.totalRecords > 10000 ? {
    ...catalog,
    records: [], // Don't store records for large datasets
    metadata: {
      recordsNotStored: true,
      reason: 'Large dataset - records not stored to prevent memory issues'
    },
    savedRecordCount: catalog.totalRecords
  } : catalog;
  
  await repository.update(id, {
    transformedData: JSON.stringify(catalogToSave),
    transformedAt: new Date(),
    recordCount: catalog.totalRecords
  });
}
```

### 2. Extract Data from UnifiedDataCatalog
Updated `/api/data-sources/[id]/transform/apply-mappings/route.ts` to properly extract data:

```typescript
// Extract data from UnifiedDataCatalog format
if (parsedTransformed && typeof parsedTransformed === 'object' && 'records' in parsedTransformed) {
  originalData = parsedTransformed.records.map((record: any) => {
    return record.data || record; // UnifiedDataRecord has data in 'data' property
  });
  
  // Handle large datasets where records weren't stored
  if (originalData.length === 0 && parsedTransformed.metadata?.recordsNotStored) {
    // Re-transform the data source to get records
    const fullDataSource = await DataSourceService.getDataSourceById(id, true);
    const catalog = await DataTransformationService.transformDataSource(fullDataSource);
    originalData = catalog.records.map((record: any) => record.data || record);
  }
}
```

### 3. Improved Error Message
```typescript
error: 'No data available for transformation. Please ensure the data source has been transformed first by clicking the "Transform" button.'
```

## User Workflow

The correct workflow is now:
1. Upload/connect a data source
2. Click "Transform" button to convert to unified JSON format
3. Click "Map Fields" to map to global catalog
4. Click "Apply Transformation" to apply the field mappings

## Technical Details

### Data Flow
1. **Upload**: Raw data stored in `configuration.files`
2. **Transform**: Creates UnifiedDataCatalog, saved to `transformedData`
3. **Map Fields**: UI maps source fields to catalog fields
4. **Apply Mappings**: Reads from `transformedData`, applies mappings, saves result

### Memory Optimization
- Large datasets (>10k records) save metadata only
- Records are re-transformed on-demand when needed
- Prevents database bloat and memory issues

### Error Prevention
- Clear error messages guide users to transform first
- Debug information helps developers troubleshoot
- Fallback logic handles various data formats