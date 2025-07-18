import { withRetry, fetchWithRetry, getChunkRetryOptions } from '../retryUtils';

// Mock fetch
global.fetch = jest.fn();

// Mock Response for Node.js environment
if (typeof Response === 'undefined') {
  global.Response = class Response {
    body: string;
    status: number;
    statusText: string;
    ok: boolean;
    
    constructor(body: string, init?: { status?: number; statusText?: string }) {
      this.body = body;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || 'OK';
      this.ok = this.status >= 200 && this.status < 300;
    }
    
    async json() {
      return JSON.parse(this.body);
    }
    
    async text() {
      return this.body;
    }
  } as any;
}

describe('retryUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn);

      expect(result).toEqual({
        success: true,
        data: 'success',
        attempts: 1
      });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const promise = withRetry(fn, { maxRetries: 3, initialDelay: 100 });
      
      // Fast-forward through retries
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(200);
      
      const result = await promise;

      expect(result).toEqual({
        success: true,
        data: 'success',
        attempts: 3
      });
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const error = new Error('Network error');
      const fn = jest.fn().mockRejectedValue(error);

      const promise = withRetry(fn, { maxRetries: 2, initialDelay: 100 });
      
      // Fast-forward through all retries
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(200);
      
      const result = await promise;

      expect(result).toEqual({
        success: false,
        error,
        attempts: 3
      });
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use custom shouldRetry function', async () => {
      const error = new Error('Not retryable');
      const fn = jest.fn().mockRejectedValue(error);
      const shouldRetry = jest.fn().mockReturnValue(false);

      const result = await withRetry(fn, { shouldRetry, maxRetries: 3 });

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(error, 1);
    });

    it('should call onRetry callback', async () => {
      const error = new Error('Network error');
      const fn = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      const onRetry = jest.fn();

      const promise = withRetry(fn, { 
        maxRetries: 2, 
        initialDelay: 100,
        onRetry 
      });
      
      await jest.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(onRetry).toHaveBeenCalledWith(error, 1, expect.any(Number));
    });

    it('should apply exponential backoff', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Network error'));
      const onRetry = jest.fn();

      withRetry(fn, {
        maxRetries: 3,
        initialDelay: 100,
        backoffMultiplier: 2,
        onRetry
      });

      // First retry after ~100ms (with jitter)
      await jest.advanceTimersByTimeAsync(150);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, expect.any(Number));
      
      // Second retry after ~200ms (with jitter)
      await jest.advanceTimersByTimeAsync(300);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 2, expect.any(Number));
      
      // Third retry after ~400ms (with jitter)
      await jest.advanceTimersByTimeAsync(600);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 3, expect.any(Number));
    });

    it('should respect maxDelay', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Network error'));
      const onRetry = jest.fn();

      withRetry(fn, {
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 2000,
        backoffMultiplier: 10,
        onRetry
      });

      await jest.advanceTimersByTimeAsync(2500);
      
      // Check that delay never exceeds maxDelay
      expect(onRetry).toHaveBeenCalled();
      const calls = onRetry.mock.calls;
      calls.forEach(call => {
        const delay = call[2];
        expect(delay).toBeLessThanOrEqual(2000);
      });
    });
  });

  describe('fetchWithRetry', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockReset();
    });

    it('should return successful response', async () => {
      const mockResponse = new Response('success', { status: 200 });
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const response = await fetchWithRetry('https://example.com');

      expect(response).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should retry on network error', async () => {
      const mockResponse = new Response('success', { status: 200 });
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(mockResponse);

      const promise = fetchWithRetry('https://example.com', {}, {
        maxRetries: 2,
        initialDelay: 100
      });

      await jest.advanceTimersByTimeAsync(100);
      const response = await promise;

      expect(response).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw on non-ok response', async () => {
      const mockResponse = new Response('error', { 
        status: 500, 
        statusText: 'Internal Server Error' 
      });
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(fetchWithRetry('https://example.com')).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should handle timeout', async () => {
      const error = new Error('AbortError');
      error.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValue(error);

      await expect(fetchWithRetry('https://example.com', {}, { 
        maxRetries: 0 // Don't retry, just fail immediately
      })).rejects.toThrow('Request timeout');
    });
  });

  describe('getChunkRetryOptions', () => {
    it('should return appropriate retry options for small chunks', () => {
      const options = getChunkRetryOptions(1024 * 1024, 0); // 1MB
      
      expect(options.maxRetries).toBe(3);
      expect(options.initialDelay).toBe(1000);
      expect(options.backoffMultiplier).toBe(1.5);
    });

    it('should return more retries for larger chunks', () => {
      const options = getChunkRetryOptions(10 * 1024 * 1024, 0); // 10MB
      
      expect(options.maxRetries).toBe(8); // 3 + 10/2
      expect(options.initialDelay).toBe(1000);
    });

    it('should stagger initial delay based on chunk index', () => {
      const options1 = getChunkRetryOptions(1024 * 1024, 0);
      const options2 = getChunkRetryOptions(1024 * 1024, 5);
      
      expect(options1.initialDelay).toBe(1000);
      expect(options2.initialDelay).toBe(1500); // 1000 + 5*100
    });
  });

  describe('FILE_UPLOAD_RETRY_OPTIONS', () => {
    it('should retry on network errors', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { FILE_UPLOAD_RETRY_OPTIONS } = require('../retryUtils');
      const { shouldRetry } = FILE_UPLOAD_RETRY_OPTIONS;
      
      expect(shouldRetry({ name: 'NetworkError', message: 'Network error' } as Error, 1)).toBe(true);
      expect(shouldRetry({ name: 'TimeoutError', message: 'Timeout' } as Error, 1)).toBe(true);
      expect(shouldRetry(new Error('Request timeout'), 1)).toBe(true);
    });

    it('should retry on server errors', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { FILE_UPLOAD_RETRY_OPTIONS } = require('../retryUtils');
      const { shouldRetry } = FILE_UPLOAD_RETRY_OPTIONS;
      
      expect(shouldRetry(new Error('HTTP 500'), 1)).toBe(true);
      expect(shouldRetry(new Error('HTTP 502'), 1)).toBe(true);
      expect(shouldRetry(new Error('HTTP 503'), 1)).toBe(true);
      expect(shouldRetry(new Error('HTTP 504'), 1)).toBe(true);
    });

    it('should retry on rate limiting', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { FILE_UPLOAD_RETRY_OPTIONS } = require('../retryUtils');
      const { shouldRetry } = FILE_UPLOAD_RETRY_OPTIONS;
      
      expect(shouldRetry(new Error('HTTP 429'), 1)).toBe(true);
    });

    it('should not retry on client errors', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { FILE_UPLOAD_RETRY_OPTIONS } = require('../retryUtils');
      const { shouldRetry } = FILE_UPLOAD_RETRY_OPTIONS;
      
      expect(shouldRetry(new Error('HTTP 400'), 1)).toBe(false);
      expect(shouldRetry(new Error('HTTP 401'), 1)).toBe(false);
      expect(shouldRetry(new Error('HTTP 403'), 1)).toBe(false);
      expect(shouldRetry(new Error('HTTP 404'), 1)).toBe(false);
    });
  });
});