# Pagination Troubleshooting Guide

## Why Pagination Might Not Work

### 1. Data Source Was Transformed Before Pagination Was Implemented
If your data source was uploaded and transformed before the pagination feature was added, it may have been limited to 100 records by the default `maxRecords` setting in `DataTransformationService`.

### 2. Current Limitations
- The default transformation limit was 100 records (fixed as of latest update)
- Pagination now supports up to 1000 records for performance reasons
- Very large datasets (>1000 records) will show the first 1000 records in annotation

## How to Fix

### Option 1: Re-transform the Data Source (Recommended)
1. Go to Data Discovery
2. Find your large dataset
3. Click the "Transform" button (circular arrow icon) or "View Catalog" button
4. This will re-process ALL data and save it for pagination support
5. You can also click "Re-transform" from within the catalog modal

### Option 2: Re-upload the Dataset
1. Delete the existing data source in Data Discovery
2. Upload the file again
3. The new upload will automatically support pagination

## How It Works Now

When you click "Transform":
1. **Full Transformation**: The system processes ALL records (no limit)
2. **Data Saved**: The full transformed data is saved to the database
3. **View Sample**: The UI shows up to 1000 records for performance
4. **Annotation Ready**: Pattern Definition can paginate through all saved records

## How Pagination Works

1. **Transform Phase**: When you click "Transform" on a data source, it processes up to 1000 records
2. **Annotation Phase**: When annotating, it loads 10 records at a time
3. **Navigation**: Use Previous/Next buttons to navigate through pages

## Performance Considerations

- For datasets with >1000 records, only the first 1000 are available for annotation
- This is a performance optimization to prevent browser memory issues
- During actual redaction, ALL records in your dataset will be processed

## Checking Your Dataset

To verify if your dataset supports pagination:
1. Go to Pattern Definition
2. Click "Annotate Data" on your dataset
3. If you see pagination controls at the top, it's working
4. The controls show: "Showing records X-Y of Z total"