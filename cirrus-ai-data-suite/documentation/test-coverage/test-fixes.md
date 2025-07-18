# Testing Pattern Definition Fixes

## 1. Test JSON Data Fix
1. Create a new data source with a JSON file containing an array of objects
2. Go to Pattern Definition and click "Annotate Data" for this source
3. You should see individual records (Record 1, Record 2, etc.) instead of a single record with _raw_json_array

## 2. Test Duplicate Files Fix
1. Create a new data source with a CSV file
2. In Discovery, add the same CSV file again to this data source
3. The file should be replaced, not duplicated (check the file count)

## 3. Test Text Transposition Fix
1. Go to Pattern Definition with any data source
2. Select some text and create a pattern example
3. The highlighted text should appear correctly without duplication

## If Issues Persist

### For existing data sources with JSON:
The transformation was already done with the old logic. You need to:
- Option 1: Delete the data source and re-upload
- Option 2: Force re-transformation by updating the data source

### For existing duplicates:
The fix prevents new duplicates but doesn't clean up existing ones. You can:
- Remove the data source and re-create it
- Or manually clean up through the UI

### Note on Caching
If you still see old behavior, try:
1. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check browser console for any errors