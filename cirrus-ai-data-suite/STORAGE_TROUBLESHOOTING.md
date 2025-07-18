# Storage Configuration Troubleshooting Guide

## Overview

This guide helps diagnose and fix file upload issues in production, particularly on Vercel deployments.

## Quick Diagnosis

1. **Check Storage Configuration**
   ```
   GET /api/debug/storage-info
   ```
   This endpoint provides:
   - Current storage provider being used
   - Environment variables detected
   - Storage operation test results
   - Recommendations for fixes

## Common Issues and Solutions

### Issue 1: Uploads Failing on Vercel (No Blob Storage)

**Symptoms:**
- File uploads fail with 500 errors
- Storage provider shows as "vercel-temp"
- Files work initially but disappear after ~5 minutes

**Cause:** 
Vercel deployments without Blob storage use temporary `/tmp` storage, which is:
- Limited to function execution lifetime
- Not persistent across requests
- Deleted when serverless function recycles

**Solution:**
1. Add Vercel Blob storage to your project:
   - Go to https://vercel.com/dashboard/stores
   - Create a new Blob store
   - Add the store to your project

2. Set the environment variable in Vercel:
   ```
   BLOB_READ_WRITE_TOKEN=<your-token>
   ```

3. Redeploy your application

### Issue 2: "Upload session not found" Error

**Symptoms:**
- Streaming uploads fail with "Upload session not found"
- Works locally but fails in production
- Session exists initially but disappears

**Cause:**
Serverless functions don't share memory/state between invocations. Upload sessions stored in memory are lost.

**Solution:**
The application already stores upload sessions in the database. If you're seeing this error:
1. Check that your database is properly configured
2. Ensure `DATABASE_URL` is set in production
3. Check database connection in logs

### Issue 3: Large File Upload Failures (413 Error)

**Symptoms:**
- Files over 4MB fail with 413 "Payload too large"
- Smaller files work fine

**Cause:**
Vercel has a 4.5MB request size limit for serverless functions.

**Solution:**
1. Use streaming uploads for large files (already implemented)
2. Ensure chunk size is under 4MB:
   ```javascript
   // In your upload code
   chunkSize: 2 * 1024 * 1024  // 2MB chunks
   ```

## Storage Provider Selection Logic

The application automatically selects storage based on environment:

```
1. If VERCEL=true AND BLOB_READ_WRITE_TOKEN exists → Vercel Blob Storage
2. If S3 credentials configured → S3 Storage
3. If VERCEL=true (no Blob token) → Temporary Storage (NOT RECOMMENDED)
4. Otherwise → Local file storage
```

## Verifying Your Configuration

### Step 1: Check Environment Variables
In Vercel dashboard, ensure you have:
- `BLOB_READ_WRITE_TOKEN` (for Vercel Blob)
- OR all S3 variables (for S3 storage)

### Step 2: Test Storage Operations
```bash
# Test the debug endpoint
curl https://your-app.vercel.app/api/debug/storage-info
```

Expected response for properly configured Vercel Blob:
```json
{
  "storage": {
    "provider": {
      "name": "vercel-blob",
      "configured": true,
      "error": null
    },
    "test": {
      "canUpload": true,
      "canRead": true,
      "canList": true,
      "error": null
    }
  }
}
```

### Step 3: Test File Upload
```bash
# Create a test file
echo "test content" > test.txt

# Upload via API
curl -X POST https://your-app.vercel.app/api/data-sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Upload",
    "type": "filesystem",
    "configuration": {
      "files": [{
        "name": "test.txt",
        "content": "test content",
        "type": "text/plain"
      }]
    }
  }'
```

## Alternative Storage Options

### Option 1: Vercel Blob (Recommended for Vercel)
- Integrated with Vercel platform
- No additional setup beyond token
- Automatic CDN distribution
- Pay-per-use pricing

### Option 2: AWS S3
```env
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
S3_REGION=us-east-1
S3_BUCKET=your-bucket
```

### Option 3: S3-Compatible (MinIO, Backblaze B2, etc.)
```env
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
S3_REGION=us-east-1
S3_BUCKET=your-bucket
S3_ENDPOINT=https://s3.compatible.endpoint.com
```

## Migration from Temp Storage

If you've been using temporary storage and need to migrate:

1. **Export existing data** before adding proper storage
2. **Configure storage provider** (Vercel Blob or S3)
3. **Redeploy application**
4. **Re-upload files** (temporary files are already lost)

## Monitoring Storage Health

Add monitoring for storage issues:

1. **Health Check Endpoint**
   ```javascript
   // Add to your monitoring
   GET /api/debug/storage-info
   ```

2. **Look for these logs:**
   - "Using vercel-temp provider" (WARNING - temporary storage)
   - "Failed to store files in external storage" (ERROR)
   - "Storage provider is configured but operations are failing" (ERROR)

## Best Practices

1. **Always configure persistent storage in production**
   - Never rely on vercel-temp provider
   - Test uploads after deployment

2. **Set appropriate chunk sizes for streaming**
   - 2MB chunks for Vercel (safe under 4.5MB limit)
   - Larger chunks for self-hosted deployments

3. **Monitor storage usage**
   - Vercel Blob has usage limits
   - S3 has cost implications
   - Set up alerts for failures

4. **Test file retrieval**
   - Ensure files can be downloaded after upload
   - Test with different file types and sizes

## Emergency Fixes

If uploads are completely broken in production:

1. **Quick Fix: Enable S3**
   - Faster than waiting for Vercel Blob approval
   - Use AWS S3 or Backblaze B2
   - Can migrate to Vercel Blob later

2. **Temporary Workaround: Reduce File Sizes**
   - Limit uploads to <1MB
   - Use file compression
   - Split large files

3. **Database Storage Fallback**
   - Already implemented as fallback
   - Limited by database size constraints
   - Not recommended for production

## Getting Help

1. Check `/api/debug/storage-info` first
2. Review Vercel function logs for errors
3. Ensure all environment variables are set
4. Test with small files first (<100KB)
5. Verify database connectivity

Remember: Temporary storage (`vercel-temp`) should NEVER be used in production!