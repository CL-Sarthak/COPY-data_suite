/**
 * Vercel Temp Storage Provider
 * Uses /tmp directory for temporary file storage in Vercel's serverless environment
 * Note: Files are ephemeral and will be deleted when the function instance is recycled
 */

import fs from 'fs/promises';
import path from 'path';
import { StorageProvider, StorageFile, StorageResult, StorageListItem } from './storageInterface';

export class VercelTempProvider implements StorageProvider {
  private basePath: string;

  constructor() {
    // Use /tmp which is the only writable directory in Vercel
    this.basePath = '/tmp/storage';
  }

  async upload(file: StorageFile): Promise<StorageResult> {
    // Ensure base directory exists
    await this.ensureDirectory(path.dirname(this.getFullPath(file.key)));

    const fullPath = this.getFullPath(file.key);
    const content = typeof file.content === 'string' 
      ? Buffer.from(file.content, 'utf8') 
      : file.content;

    await fs.writeFile(fullPath, content);

    // Store metadata if provided
    if (file.metadata) {
      const metadataPath = `${fullPath}.metadata.json`;
      await fs.writeFile(metadataPath, JSON.stringify({
        contentType: file.contentType,
        metadata: file.metadata,
        uploadedAt: new Date().toISOString()
      }, null, 2));
    }

    const stats = await fs.stat(fullPath);

    return {
      url: `/api/storage/files/${file.key}`,
      key: file.key,
      size: stats.size,
      contentType: file.contentType,
      metadata: file.metadata
    };
  }

  async get(key: string): Promise<Buffer> {
    const fullPath = this.getFullPath(key);
    
    try {
      return await fs.readFile(fullPath);
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${key}`);
      }
      throw error;
    }
  }

  async getUrl(key: string): Promise<string> {
    // For temp storage, just return the API route
    return `/api/storage/files/${key}`;
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);
    
    try {
      await fs.unlink(fullPath);
      
      // Also try to delete metadata file
      try {
        await fs.unlink(`${fullPath}.metadata.json`);
      } catch {
        // Ignore if metadata doesn't exist
      }
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT')) {
        throw error;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.getFullPath(key));
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix?: string): Promise<StorageListItem[]> {
    const items: StorageListItem[] = [];
    const searchPath = prefix ? this.getFullPath(prefix) : this.basePath;
    
    try {
      await this.listRecursive(searchPath, this.basePath, items);
    } catch (error) {
      if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
    
    return items;
  }

  getProviderName(): string {
    return 'vercel-temp';
  }

  private getFullPath(key: string): string {
    // Sanitize key to prevent directory traversal
    const sanitizedKey = key.replace(/\.\.[/\\]/g, '').replace(/^[/\\]+/, '');
    return path.join(this.basePath, sanitizedKey);
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'EEXIST')) {
        throw error;
      }
    }
  }

  private async listRecursive(
    dirPath: string, 
    basePath: string, 
    items: StorageListItem[]
  ): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        await this.listRecursive(fullPath, basePath, items);
      } else if (!entry.name.endsWith('.metadata.json')) {
        const stats = await fs.stat(fullPath);
        const key = path.relative(basePath, fullPath);
        
        items.push({
          key,
          size: stats.size,
          lastModified: stats.mtime
        });
      }
    }
  }
}