import { logger } from '@/utils/logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

/**
 * Default retry options
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  shouldRetry: (error: Error) => {
    // Retry on network errors and specific HTTP status codes
    if (error.name === 'NetworkError' || error.name === 'TimeoutError') {
      return true;
    }
    
    // Check if it's an HTTP error with a retryable status code
    const message = error.message.toLowerCase();
    if (message.includes('429') || // Too Many Requests
        message.includes('502') || // Bad Gateway
        message.includes('503') || // Service Unavailable
        message.includes('504') || // Gateway Timeout
        message.includes('529') || // Overloaded (Anthropic specific)
        message.includes('timeout') ||
        message.includes('network')) {
      return true;
    }
    
    return false;
  },
  onRetry: (error: Error, attempt: number, delay: number) => {
    logger.debug(`Retry attempt ${attempt} after ${delay}ms delay. Error: ${error.message}`);
  }
};

/**
 * Execute a function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt
      };
    } catch (error) {
      lastError = error as Error;
      
      // Check if we should retry
      if (attempt <= opts.maxRetries && opts.shouldRetry(lastError, attempt)) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
          opts.maxDelay
        );
        
        // Add jitter to prevent thundering herd
        const jitteredDelay = delay * (0.5 + Math.random() * 0.5);
        
        opts.onRetry(lastError, attempt, jitteredDelay);
        
        // Wait before retrying
        await sleep(jitteredDelay);
      } else {
        // No more retries or error is not retryable
        break;
      }
    }
  }
  
  return {
    success: false,
    error: lastError,
    attempts: opts.maxRetries + 1
  };
}

/**
 * Retry wrapper for fetch operations
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  const result = await withRetry(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Check if response is ok
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        
        throw error;
      }
    },
    options
  );
  
  if (!result.success) {
    throw result.error || new Error('Fetch failed after retries');
  }
  
  return result.data!;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry options specifically for file uploads
 */
export const FILE_UPLOAD_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  initialDelay: 2000,
  maxDelay: 60000,
  backoffMultiplier: 2,
  shouldRetry: (error: Error) => {
    // Always retry network errors
    if (error.name === 'NetworkError' || 
        error.name === 'TimeoutError' ||
        error.message.includes('network') ||
        error.message.includes('timeout')) {
      return true;
    }
    
    // Retry server errors
    const message = error.message.toLowerCase();
    if (message.includes('500') || // Internal Server Error
        message.includes('502') || // Bad Gateway
        message.includes('503') || // Service Unavailable
        message.includes('504')) { // Gateway Timeout
      return true;
    }
    
    // Don't retry client errors (4xx) except for rate limiting
    if (message.includes('429')) {
      return true;
    }
    
    return false;
  },
  onRetry: (error: Error, attempt: number, delay: number) => {
    logger.info(`File upload retry attempt ${attempt} after ${delay}ms. Error: ${error.message}`);
  }
};

/**
 * Calculate chunk retry options based on chunk size and index
 */
export function getChunkRetryOptions(chunkSize: number, chunkIndex: number): RetryOptions {
  // Larger chunks get more retries and longer delays
  const sizeFactor = Math.min(chunkSize / (1024 * 1024), 10); // MB
  const maxRetries = Math.floor(3 + sizeFactor / 2);
  
  return {
    maxRetries,
    initialDelay: 1000 + chunkIndex * 100, // Stagger retries for different chunks
    maxDelay: 60000,
    backoffMultiplier: 1.5,
    shouldRetry: FILE_UPLOAD_RETRY_OPTIONS.shouldRetry,
    onRetry: (error: Error, attempt: number, delay: number) => {
      logger.info(`Chunk ${chunkIndex} retry attempt ${attempt} after ${delay}ms. Error: ${error.message}`);
    }
  };
}