/**
 * Vercel Blob Storage Provider
 * Uses Vercel's Blob storage service for production file storage
 */

import { put, del, head, list as vercelList } from '@vercel/blob';
import { StorageProvider, StorageFile, StorageResult, StorageListItem } from './storageInterface';

export class VercelBlobProvider implements StorageProvider {
  private token?: string;

  constructor(token?: string) {
    this.token = token || process.env.BLOB_READ_WRITE_TOKEN;
    
    if (!this.token) {
      throw new Error('Vercel Blob storage requires BLOB_READ_WRITE_TOKEN environment variable');
    }
  }

  async upload(file: StorageFile): Promise<StorageResult> {
    const blob = await put(file.key, file.content, {
      access: 'public',
      contentType: file.contentType,
      token: this.token,
      addRandomSuffix: false, // Use our own key management
      cacheControlMaxAge: 31536000, // 1 year cache
    });

    // Store metadata as a separate JSON file if provided
    if (file.metadata && Object.keys(file.metadata).length > 0) {
      const metadataKey = `${file.key}.metadata.json`;
      await put(metadataKey, JSON.stringify(file.metadata), {
        access: 'public',
        contentType: 'application/json',
        token: this.token,
        addRandomSuffix: false,
      });
    }

    const content = typeof file.content === 'string' ? file.content : file.content;
    return {
      url: blob.url,
      key: file.key,
      size: (blob as { size?: number }).size || Buffer.byteLength(content),
      contentType: file.contentType,
      metadata: file.metadata
    };
  }

  async get(key: string): Promise<Buffer> {
    try {
      const response = await fetch(await this.getUrl(key));
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`File not found: ${key}`);
        }
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new Error(`File not found: ${key}`);
      }
      throw error;
    }
  }

  async getUrl(key: string): Promise<string> {
    // Vercel Blob URLs are public by default
    // First check if the blob exists
    try {
      const blob = await head(key, { token: this.token });
      return blob.url;
    } catch {
      throw new Error(`File not found: ${key}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await del(key, { token: this.token });
      
      // Also try to delete metadata if it exists
      try {
        await del(`${key}.metadata.json`, { token: this.token });
      } catch {
        // Ignore if metadata doesn't exist
      }
    } catch (error: unknown) {
      // Vercel Blob doesn't throw on non-existent files
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Failed to delete ${key}:`, errorMessage);
    }
  }

  async list(prefix?: string): Promise<StorageListItem[]> {
    const items: StorageListItem[] = [];
    let cursor: string | undefined;

    do {
      const response = await vercelList({
        token: this.token,
        prefix: prefix || undefined,
        cursor,
        limit: 1000,
      });

      for (const blob of response.blobs) {
        // Skip metadata files in the listing
        if (!blob.pathname.endsWith('.metadata.json')) {
          items.push({
            key: blob.pathname,
            size: blob.size,
            lastModified: new Date(blob.uploadedAt),
            contentType: (blob as { contentType?: string }).contentType || undefined,
          });
        }
      }

      cursor = response.cursor || undefined;
    } while (cursor);

    return items;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await head(key, { token: this.token });
      return true;
    } catch {
      return false;
    }
  }

  getProviderName(): string {
    return 'vercel-blob';
  }
}