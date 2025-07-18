/**
 * Storage Service
 * Main service that manages storage providers and handles file operations
 */

import { StorageProvider, StorageConfig, StorageFile, StorageResult } from './storageInterface';
import { LocalStorageProvider } from './localStorageProvider';
import { VercelBlobProvider } from './vercelBlobProvider';
import { VercelTempProvider } from './vercelTempProvider';
import { S3Provider } from './s3Provider';

export class StorageService {
  private static instance: StorageService;
  private provider: StorageProvider;
  private config: StorageConfig;

  private constructor(config?: StorageConfig) {
    this.config = config || this.getDefaultConfig();
    this.provider = this.createProvider(this.config);
  }

  /**
   * Get singleton instance of StorageService
   */
  public static getInstance(config?: StorageConfig): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService(config);
    }
    return StorageService.instance;
  }

  /**
   * Reset instance (useful for testing)
   */
  public static resetInstance(): void {
    StorageService.instance = undefined as unknown as StorageService;
  }

  /**
   * Get default configuration based on environment
   */
  private getDefaultConfig(): StorageConfig {
    // Check for Vercel environment with Blob storage
    if (process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN) {
      return {
        provider: 'vercel',
        vercel: {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        },
      };
    }

    // Check for S3 configuration
    if (
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY &&
      process.env.S3_REGION &&
      process.env.S3_BUCKET
    ) {
      return {
        provider: 's3',
        s3: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          region: process.env.S3_REGION,
          bucket: process.env.S3_BUCKET,
          endpoint: process.env.S3_ENDPOINT,
        },
      };
    }

    // Use temp storage for Vercel without Blob storage
    if (process.env.VERCEL) {
      return {
        provider: 'vercel-temp',
      };
    }

    // Default to local storage for development
    return {
      provider: 'local',
      local: {
        basePath: process.env.STORAGE_PATH || './data/storage',
      },
    };
  }

  /**
   * Create storage provider based on configuration
   */
  private createProvider(config: StorageConfig): StorageProvider {
    switch (config.provider) {
      case 'vercel':
        if (!config.vercel?.token && !process.env.BLOB_READ_WRITE_TOKEN) {
          throw new Error('Vercel Blob storage requires token configuration');
        }
        return new VercelBlobProvider(config.vercel?.token);

      case 'vercel-temp':
        return new VercelTempProvider();

      case 's3':
        if (!config.s3) {
          throw new Error('S3 storage requires configuration');
        }
        return new S3Provider(config.s3);

      case 'local':
      default:
        return new LocalStorageProvider(config.local?.basePath);
    }
  }

  /**
   * Upload a file to storage
   */
  async uploadFile(
    key: string,
    content: Buffer | string,
    options?: {
      contentType?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<StorageResult> {
    const file: StorageFile = {
      key: this.sanitizeKey(key),
      content,
      contentType: options?.contentType,
      metadata: options?.metadata,
    };

    return this.provider.upload(file);
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: Array<{
      key: string;
      content: Buffer | string;
      contentType?: string;
      metadata?: Record<string, string>;
    }>
  ): Promise<StorageResult[]> {
    return Promise.all(
      files.map((file) =>
        this.uploadFile(file.key, file.content, {
          contentType: file.contentType,
          metadata: file.metadata,
        })
      )
    );
  }

  /**
   * Get a file from storage
   */
  async getFile(key: string): Promise<Buffer> {
    return this.provider.get(this.sanitizeKey(key));
  }

  /**
   * Get a file as string
   */
  async getFileAsString(key: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    const buffer = await this.getFile(key);
    return buffer.toString(encoding);
  }

  /**
   * Get a signed URL for direct access
   */
  async getFileUrl(key: string, expiresIn?: number): Promise<string> {
    return this.provider.getUrl(this.sanitizeKey(key), expiresIn);
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(key: string): Promise<void> {
    return this.provider.delete(this.sanitizeKey(key));
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.deleteFile(key)));
  }

  /**
   * List files with optional prefix
   */
  async listFiles(prefix?: string) {
    return this.provider.list(prefix ? this.sanitizeKey(prefix) : undefined);
  }

  /**
   * Check if a file exists
   */
  async fileExists(key: string): Promise<boolean> {
    return this.provider.exists(this.sanitizeKey(key));
  }

  /**
   * Get current storage provider name
   */
  getProviderName(): string {
    return this.provider.getProviderName();
  }

  /**
   * Get storage configuration (sanitized)
   */
  getConfig(): { provider: string; configured: boolean } {
    return {
      provider: this.config.provider,
      configured: true,
    };
  }

  /**
   * Sanitize storage key to prevent directory traversal
   */
  private sanitizeKey(key: string): string {
    // Remove any ../ or ..\ patterns
    return key.replace(/\.\.[/\\]/g, '').replace(/^[/\\]+/, '');
  }

  /**
   * Generate a unique key for a file
   */
  static generateKey(prefix: string, filename: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${prefix}/${timestamp}-${random}-${sanitizedFilename}`;
  }

  /**
   * Get content type from file extension
   */
  static getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const contentTypes: Record<string, string> = {
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      zip: 'application/zip',
    };
    return contentTypes[ext || ''] || 'application/octet-stream';
  }
}