# Dataset Enhancement Issue - Root Cause Analysis

## The Problem
Dataset enhancement is only processing 100 records out of 27,707 because the CSV file content is being truncated when stored.

## Root Cause
1. **File Content Truncation**: In `dataSourceService.ts`, file content is truncated to 500KB (or 100KB on Vercel) before storage
2. **External Storage Not Used**: While the system supports external storage for large files, the truncation happens BEFORE external storage is considered
3. **Field Mapping Uses Truncated Data**: When field mappings are applied, it uses the truncated content from the configuration

## The Truncation Flow
1. User uploads 27,707 record CSV file (likely >1MB)
2. `dataSourceService.ts` truncates content to 500KB (lines 136-137)
3. Only ~100 records fit in 500KB
4. Field mappings are applied to these 100 records
5. Enhancement tries to process "all" records but only has 100

## Why External Storage Isn't Helping
The code shows that external storage IS implemented:
- Files should be stored externally if large
- Apply-mappings tries to retrieve from storage (lines 113-160)
- But the content is truncated BEFORE it gets to external storage

## The Solution
The issue is in the upload flow. The file content needs to be stored in external storage BEFORE truncation, not after.

## Immediate Workaround
1. Use the re-apply mappings feature in the enhancement modal (already implemented)
2. Or manually re-upload the CSV file
3. Or use external data sources that don't have this limitation

## Proper Fix Required
1. Store full file content in external storage FIRST
2. Then truncate for configuration storage
3. Ensure field mappings always use external storage when available

## Current State
- The enhancement modal DOES try to auto-fix by re-applying mappings
- But if the original file content is already truncated, it can't recover the full data
- The only solution is to re-upload the file or fix the upload flow