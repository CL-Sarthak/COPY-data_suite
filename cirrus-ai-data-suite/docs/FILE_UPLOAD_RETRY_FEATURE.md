# File Upload Retry Feature Documentation

## Overview

The file upload retry feature enhances the reliability of file uploads by implementing automatic retry logic with exponential backoff, progress tracking, and pause/resume functionality. This feature is particularly useful for large file uploads over unstable network connections.

## Components

### 1. Retry Utilities (`src/utils/retryUtils.ts`)

The core retry logic implementation with the following features:

- **Exponential backoff**: Delays between retries increase exponentially
- **Jitter**: Random variation in delay to prevent thundering herd
- **Configurable retry conditions**: Custom logic to determine if an error is retryable
- **Progress callbacks**: Track retry attempts
- **Maximum delay limits**: Prevent excessive wait times

#### Key Functions:

- `withRetry<T>()`: Generic retry wrapper for any async function
- `fetchWithRetry()`: Specialized retry wrapper for fetch operations
- `getChunkRetryOptions()`: Dynamic retry configuration based on chunk size

#### Configuration Options:

```typescript
interface RetryOptions {
  maxRetries?: number;          // Default: 3
  initialDelay?: number;         // Default: 1000ms
  maxDelay?: number;            // Default: 30000ms
  backoffMultiplier?: number;    // Default: 2
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}
```

### 2. File Upload Service (`src/services/fileUploadService.ts`)

Provides reliable file upload capabilities for regular (non-streaming) uploads:

- **Automatic retry on failure**: Uses `fetchWithRetry` for network resilience
- **Progress tracking**: Real-time upload progress via XMLHttpRequest
- **Batch uploads**: Upload multiple files with concurrency control
- **Error handling**: Detailed error reporting for each file

#### Usage:

```typescript
// Single file upload
await FileUploadService.uploadFile(file, '/api/upload', {
  onProgress: (progress) => console.log(`${progress}% uploaded`),
  metadata: { tags: ['important'] }
});

// Multiple files upload
const results = await FileUploadService.uploadMultipleFiles(files, '/api/upload', {
  maxConcurrent: 3,
  onFileProgress: (fileName, progress) => console.log(`${fileName}: ${progress}%`),
  onFileComplete: (fileName, success) => console.log(`${fileName}: ${success ? 'done' : 'failed'}`)
});
```

### 3. Enhanced Streaming Upload (`src/components/EnhancedStreamingFileUpload.tsx`)

Advanced upload component for large files with:

- **Automatic chunk retry**: Failed chunks are retried with exponential backoff
- **Upload speed calculation**: Real-time bytes/second measurement
- **ETA estimation**: Time remaining based on current speed
- **Pause/resume functionality**: Interrupt and continue uploads
- **Resume from failure**: Pick up where upload left off
- **Visual retry indicators**: Shows retry count and status

#### Features:

1. **Smart Chunk Management**
   - Tracks uploaded chunks to avoid re-uploading
   - Skips already uploaded chunks when resuming
   - Validates chunk integrity with checksums

2. **Performance Metrics**
   - Upload speed in KB/s, MB/s
   - Estimated time remaining
   - Per-chunk progress tracking

3. **User Controls**
   - Pause individual uploads
   - Resume paused uploads
   - Retry failed uploads
   - Cancel uploads in progress
   - Global pause/resume all uploads

### 4. Unified File Upload (`src/components/UnifiedFileUpload.tsx`)

The main upload interface that:

- Automatically suggests streaming for large files
- Switches between regular and enhanced streaming upload
- Controlled by `NEXT_PUBLIC_USE_ENHANCED_UPLOAD` environment variable

## Configuration

### Environment Variables

Add to your `.env.local`:

```bash
# Enable enhanced file upload with retry logic
NEXT_PUBLIC_USE_ENHANCED_UPLOAD=true
```

### Retry Configuration

The retry behavior can be customized for different scenarios:

```typescript
// File uploads (more aggressive retry)
export const FILE_UPLOAD_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  initialDelay: 2000,
  maxDelay: 60000,
  backoffMultiplier: 2
};

// Chunk uploads (dynamic based on size)
export function getChunkRetryOptions(chunkSize: number, chunkIndex: number): RetryOptions {
  const sizeFactor = Math.min(chunkSize / (1024 * 1024), 10);
  const maxRetries = Math.floor(3 + sizeFactor / 2);
  
  return {
    maxRetries,
    initialDelay: 1000 + chunkIndex * 100, // Stagger retries
    maxDelay: 60000,
    backoffMultiplier: 1.5
  };
}
```

## Error Handling

The retry system handles various error types:

1. **Network Errors**: Always retried
   - Connection timeouts
   - Network unreachable
   - DNS failures

2. **Server Errors**: Retried with backoff
   - 500 Internal Server Error
   - 502 Bad Gateway
   - 503 Service Unavailable
   - 504 Gateway Timeout

3. **Rate Limiting**: Retried with longer delays
   - 429 Too Many Requests

4. **Client Errors**: Not retried (except 429)
   - 400 Bad Request
   - 401 Unauthorized
   - 403 Forbidden
   - 404 Not Found

## Testing

Comprehensive test coverage is provided:

```bash
# Run retry utility tests
npm test src/utils/__tests__/retryUtils.test.ts
```

Test scenarios include:
- Successful operations (no retry needed)
- Transient failures with eventual success
- Permanent failures after max retries
- Custom retry conditions
- Exponential backoff timing
- Maximum delay limits
- Fetch-specific scenarios

## Usage Examples

### Basic File Upload with Retry

```typescript
import { FileUploadService } from '@/services/fileUploadService';

const file = new File(['content'], 'document.txt');
const response = await FileUploadService.uploadFile(
  file,
  '/api/upload',
  {
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress}%`);
    }
  }
);
```

### Streaming Upload with Enhanced Features

```typescript
// In your component
<EnhancedStreamingFileUpload
  onUploadComplete={(fileName, storageKey) => {
    console.log(`File ${fileName} uploaded with key ${storageKey}`);
  }}
  onError={(error) => {
    console.error('Upload failed:', error);
  }}
  maxSize={5 * 1024 * 1024 * 1024} // 5GB
/>
```

### Custom Retry Logic

```typescript
import { withRetry } from '@/utils/retryUtils';

const result = await withRetry(
  async () => {
    // Your async operation
    return await riskyOperation();
  },
  {
    maxRetries: 10,
    shouldRetry: (error, attempt) => {
      // Custom logic
      return error.message.includes('TEMPORARY') && attempt < 5;
    },
    onRetry: (error, attempt, delay) => {
      console.log(`Retry ${attempt} in ${delay}ms: ${error.message}`);
    }
  }
);
```

## Best Practices

1. **Set appropriate retry limits**: Balance between reliability and user experience
2. **Use exponential backoff**: Prevents overwhelming the server
3. **Implement circuit breakers**: Stop retrying when service is clearly down
4. **Provide user feedback**: Show retry status and allow manual intervention
5. **Log retry attempts**: Help with debugging and monitoring
6. **Test failure scenarios**: Ensure retry logic works as expected

## Migration Guide

To enable the enhanced upload feature:

1. Set `NEXT_PUBLIC_USE_ENHANCED_UPLOAD=true` in your environment
2. Deploy the application
3. Users will automatically get the enhanced upload UI
4. No code changes required in existing implementations

The feature is backward compatible - setting the flag to `false` reverts to the original upload behavior.