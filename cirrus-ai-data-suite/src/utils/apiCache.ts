/**
 * API Caching Utilities
 * 
 * Provides caching headers and ETag support to reduce bandwidth usage
 */

import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

export interface CacheOptions {
  /**
   * Cache duration in seconds
   * - 0: no-cache
   * - -1: no-store
   * - > 0: cache for specified seconds
   */
  maxAge: number;
  
  /**
   * Whether to allow shared caches (CDN, proxy)
   */
  public?: boolean;
  
  /**
   * Whether to revalidate stale cache
   */
  mustRevalidate?: boolean;
  
  /**
   * Generate ETag from response data
   */
  etag?: boolean;
}

const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  maxAge: 0,
  public: false,
  mustRevalidate: true,
  etag: true
};

/**
 * Add cache headers to response
 */
export function withCacheHeaders(
  response: NextResponse,
  options: Partial<CacheOptions> = {}
): NextResponse {
  const opts = { ...DEFAULT_CACHE_OPTIONS, ...options };
  
  // Build Cache-Control header
  const cacheDirectives: string[] = [];
  
  if (opts.maxAge === -1) {
    cacheDirectives.push('no-store');
  } else if (opts.maxAge === 0) {
    cacheDirectives.push('no-cache');
  } else {
    cacheDirectives.push(opts.public ? 'public' : 'private');
    cacheDirectives.push(`max-age=${opts.maxAge}`);
  }
  
  if (opts.mustRevalidate) {
    cacheDirectives.push('must-revalidate');
  }
  
  response.headers.set('Cache-Control', cacheDirectives.join(', '));
  
  return response;
}

/**
 * Generate ETag from data
 */
export function generateETag(data: unknown): string {
  const hash = createHash('md5');
  hash.update(JSON.stringify(data));
  return `"${hash.digest('hex')}"`;
}

/**
 * Check if ETag matches
 */
export function checkETag(requestETag: string | null, dataETag: string): boolean {
  if (!requestETag) return false;
  
  // Remove quotes and weak indicator
  const normalizeETag = (etag: string) => 
    etag.replace(/^W\//, '').replace(/"/g, '');
  
  return normalizeETag(requestETag) === normalizeETag(dataETag);
}

/**
 * Create cached JSON response with ETag support
 */
export function cachedJsonResponse(
  data: unknown,
  options: Partial<CacheOptions> & { status?: number; headers?: HeadersInit } = {}
): NextResponse {
  const { status = 200, headers = {}, ...cacheOptions } = options;
  const opts = { ...DEFAULT_CACHE_OPTIONS, ...cacheOptions };
  
  // Generate ETag if requested
  let etag: string | undefined;
  if (opts.etag) {
    etag = generateETag(data);
  }
  
  // Create response
  const response = NextResponse.json(data, { 
    status,
    headers: {
      ...headers,
      ...(etag ? { 'ETag': etag } : {})
    }
  });
  
  // Add cache headers
  return withCacheHeaders(response, opts);
}

/**
 * Handle conditional requests (If-None-Match)
 */
export function handleConditionalRequest(
  request: Request,
  data: unknown,
  options: Partial<CacheOptions> = {}
): NextResponse {
  const etag = generateETag(data);
  const ifNoneMatch = request.headers.get('If-None-Match');
  
  // Check if client has current version
  if (checkETag(ifNoneMatch, etag)) {
    return new NextResponse(null, { 
      status: 304,
      headers: {
        'ETag': etag,
        'Cache-Control': 'private, must-revalidate'
      }
    });
  }
  
  // Return full response with ETag
  return cachedJsonResponse(data, { ...options, etag: true });
}

/**
 * Cache durations for different resource types
 */
export const CACHE_DURATIONS = {
  // Static data that rarely changes
  PATTERNS: 5 * 60,              // 5 minutes
  CATALOG_FIELDS: 10 * 60,       // 10 minutes
  TEMPLATES: 60 * 60,            // 1 hour
  
  // Dynamic data that changes frequently
  DASHBOARD: 0,                  // no-cache (always revalidate)
  DATA_SOURCES: 30,              // 30 seconds
  TRANSFORM_RESULTS: 5 * 60,     // 5 minutes
  
  // User-specific data
  SESSIONS: -1,                  // no-store
  SYNTHETIC_JOBS: 0,             // no-cache
  
  // API responses
  ML_DETECT: 60,                 // 1 minute (for same inputs)
  LLM_STATUS: 60,                // 1 minute
} as const;