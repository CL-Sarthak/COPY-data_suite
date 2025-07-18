/**
 * Storage Provider Interface
 * Abstraction layer for file storage across different providers
 */

export interface StorageFile {
  key: string;
  content: Buffer | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageResult {
  url: string;
  key: string;
  size: number;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageListItem {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
}

export interface StorageProvider {
  /**
   * Upload a file to storage
   */
  upload(file: StorageFile): Promise<StorageResult>;
  
  /**
   * Get a file from storage
   */
  get(key: string): Promise<Buffer>;
  
  /**
   * Get a signed URL for direct access
   */
  getUrl(key: string, expiresIn?: number): Promise<string>;
  
  /**
   * Delete a file from storage
   */
  delete(key: string): Promise<void>;
  
  /**
   * List files with optional prefix
   */
  list(prefix?: string): Promise<StorageListItem[]>;
  
  /**
   * Check if a file exists
   */
  exists(key: string): Promise<boolean>;
  
  /**
   * Get provider name for logging/debugging
   */
  getProviderName(): string;
}

export interface StorageConfig {
  provider: 'vercel' | 'vercel-temp' | 'local' | 's3';
  vercel?: {
    token?: string;
  };
  local?: {
    basePath: string;
  };
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    endpoint?: string; // For S3-compatible services
  };
}