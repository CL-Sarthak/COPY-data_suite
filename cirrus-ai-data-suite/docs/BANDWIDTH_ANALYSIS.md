# Vercel Fast Origin Transfer Bandwidth Analysis

## Summary of Findings

After analyzing the codebase for potential causes of high bandwidth usage (30GB/day with 1-2 users), I've identified several issues that could be contributing to excessive data transfer:

## 1. Server-Sent Events (SSE) with Continuous Streaming

### Dashboard Updates (`/api/dashboard/updates`)
- **Issue**: Continuously streams dashboard metrics every 30 seconds
- **Additional overhead**: Heartbeat messages every 15 seconds
- **Problem**: Connection never closes (infinite promise), keeping streams open indefinitely
- **Impact**: Each user maintains an open connection consuming bandwidth continuously

### Other SSE Endpoints
- `/api/llm/status/updates` - LLM status streaming
- `/api/ml/status/updates` - ML status streaming
- `/api/pipelines/[id]/execution/updates` - Pipeline execution updates
- `/api/synthetic/jobs/updates` - Synthetic data job updates

**Estimated bandwidth**: With 5 SSE connections per user, even small updates (1KB each) every 15-30 seconds = ~14.4MB/user/day minimum

## 2. Large Data Transfer APIs Without Proper Caching

### Data Transformation API (`/api/data-sources/[id]/transform`)
- **Issue**: Can return entire datasets without pagination by default
- **Problem**: Re-transforms data on every request if not cached in database
- **No caching headers**: Results in repeated transfers of the same data
- **Large payloads**: Datasets with thousands of records transferred repeatedly

### Raw Data API (`/api/data-sources/[id]/raw`)
- **Issue**: Returns full file contents without caching
- **Problem**: No `Cache-Control` headers, causing browsers to re-fetch

### Data Profiling API (`/api/data-sources/[id]/profile`)
- **Issue**: Internally calls the transform API, doubling data transfer
- **Problem**: No caching mechanism for profiling results

## 3. File Storage and Serving Issues

### Storage API (`/api/storage/files/[...path]`)
- **Good**: Has proper caching headers (`Cache-Control: public, max-age=31536000`)
- **Bad**: May be serving large files repeatedly if URLs change

### PDF.js Worker
- **Issue**: FileUpload component loads PDF worker from CDN instead of local file
- **Location**: `src/components/FileUpload.tsx` line 44
- **Problem**: External CDN requests instead of using local `/public/pdf.worker.min.js`

## 4. Streaming File Uploads

### Chunk Upload API (`/api/streaming/upload/chunk`)
- **Issue**: Each chunk upload creates database queries and session lookups
- **Problem**: High frequency of small requests can add up
- **Chunk size**: Up to 4MB per chunk in production

## 5. Debug Endpoints Exposing Data

### Database State Debug (`/api/debug/database-state`)
- **Issue**: Returns database samples and counts
- **Risk**: If accessed frequently (by monitoring tools?), adds unnecessary transfer

## 6. Missing Optimizations

### No Pagination by Default
- Transform API can return entire datasets unless `?skipPagination=false` is specified
- Default behavior should paginate to prevent large transfers

### No Response Compression
- API responses don't appear to use gzip/brotli compression
- Large JSON responses could be 60-80% smaller with compression

### No ETags or Conditional Requests
- APIs don't implement If-None-Match/If-Modified-Since
- Results in full data transfer even when data hasn't changed

## Recommendations

### Immediate Actions
1. **Fix SSE Connections**
   - Add connection limits and timeouts
   - Implement proper cleanup when users disconnect
   - Consider switching to polling with exponential backoff

2. **Add Caching Headers**
   ```typescript
   // Add to API responses
   headers: {
     'Cache-Control': 'private, max-age=300', // 5 minutes
     'ETag': generateETag(data),
   }
   ```

3. **Enable Pagination by Default**
   - Change transform API to paginate by default
   - Require explicit parameter to fetch all records

4. **Use Local PDF Worker**
   ```typescript
   // Change in FileUpload.tsx
   pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
   ```

5. **Implement Response Compression**
   - Enable Vercel's edge compression
   - Add to `vercel.json`:
   ```json
   {
     "functions": {
       "src/app/api/**/*.ts": {
         "compress": true
       }
     }
   }
   ```

### Long-term Solutions
1. **Implement Proper Caching Layer**
   - Use Redis or similar for API response caching
   - Cache transformation results, profiles, etc.

2. **Add CDN for Static Assets**
   - Move large static files to CDN
   - Implement proper asset versioning

3. **Optimize Data Transfer**
   - Implement field selection (GraphQL-like)
   - Add data compression for large payloads
   - Stream large datasets instead of loading all at once

4. **Monitor and Alert**
   - Add bandwidth monitoring
   - Set up alerts for unusual transfer patterns
   - Log which endpoints consume most bandwidth

## Estimated Bandwidth Savings

Implementing these changes could reduce bandwidth by 70-90%:
- SSE optimization: -50% (eliminate unnecessary connections)
- Caching: -80% (avoid repeated transfers)
- Compression: -60% (smaller payloads)
- Pagination: -90% (for large dataset requests)

## Priority Order

1. **High Priority**: Fix SSE connections and add basic caching (1-2 days)
2. **Medium Priority**: Enable compression and pagination defaults (1 day)
3. **Low Priority**: Implement full caching layer and CDN (1 week)