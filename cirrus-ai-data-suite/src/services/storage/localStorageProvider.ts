/**
 * Local Filesystem Storage Provider
 * Stores files on the local filesystem for development
 */

import fs from 'fs/promises';
import path from 'path';
import { StorageProvider, StorageFile, StorageResult, StorageListItem } from './storageInterface';

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string = './data/storage') {
    this.basePath = path.resolve(basePath);
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
      url: `file://${fullPath}`,
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
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`File not found: ${key}`);
      }
      throw error;
    }
  }

  async getUrl(key: string): Promise<string> {
    // For local storage, we'll return a special URL that the app can handle
    // In production, this would be replaced with actual file serving
    const exists = await this.exists(key);
    if (!exists) {
      throw new Error(`File not found: ${key}`);
    }
    
    // Return a URL that can be handled by the API
    return `/api/storage/local/${encodeURIComponent(key)}`;
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);
    
    try {
      await fs.unlink(fullPath);
      
      // Also delete metadata if it exists
      try {
        await fs.unlink(`${fullPath}.metadata.json`);
      } catch {
        // Ignore if metadata doesn't exist
      }
    } catch (error: unknown) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
        throw error;
      }
    }
  }

  async list(prefix?: string): Promise<StorageListItem[]> {
    const items: StorageListItem[] = [];
    const searchPath = prefix 
      ? path.join(this.basePath, prefix)
      : this.basePath;

    try {
      await this.listRecursive(searchPath, this.basePath, items);
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    return items.filter(item => !item.key.endsWith('.metadata.json'));
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.getFullPath(key);
    
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  getProviderName(): string {
    return 'local';
  }

  private getFullPath(key: string): string {
    // Sanitize the key to prevent directory traversal
    const sanitizedKey = key.replace(/\.\./g, '');
    return path.join(this.basePath, sanitizedKey);
  }

  private async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error: unknown) {
      if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) {
        throw error;
      }
    }
  }

  private async listRecursive(
    dir: string, 
    baseDir: string, 
    items: StorageListItem[]
  ): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await this.listRecursive(fullPath, baseDir, items);
      } else {
        const stats = await fs.stat(fullPath);
        const relativePath = path.relative(baseDir, fullPath);
        
        // Load metadata if available
        let contentType: string | undefined;
        try {
          const metadataPath = `${fullPath}.metadata.json`;
          const metadataContent = await fs.readFile(metadataPath, 'utf8');
          const metadata = JSON.parse(metadataContent);
          contentType = metadata.contentType;
        } catch {
          // No metadata available
        }

        items.push({
          key: relativePath.replace(/\\/g, '/'), // Normalize path separators
          size: stats.size,
          lastModified: stats.mtime,
          contentType
        });
      }
    }
  }
}