import { Readable } from 'stream';
import { StorageService } from '@/services/storage/storageService';
// Note: @aws-sdk/client-s3 and @aws-sdk/lib-storage would be used for S3 streaming
// For now, we'll implement a simpler version
import { logger } from '@/utils/logger';

export interface StreamingStorageOptions {
  provider: 'local' | 's3' | 'vercel-blob';
  onProgress?: (bytes: number) => void;
}

export class StreamingStorageAdapter {
  private storageService: StorageService;
  
  constructor() {
    this.storageService = StorageService.getInstance();
  }

  /**
   * Stream upload to storage provider
   */
  async streamUpload(
    stream: Readable,
    key: string,
    contentType: string,
    options: StreamingStorageOptions
  ): Promise<string> {
    const provider = options.provider || this.storageService.getProviderName();

    switch (provider) {
      case 's3':
        return this.streamToS3(stream, key, contentType, options.onProgress);
      case 'vercel-blob':
        return this.streamToVercelBlob(stream, key, contentType, options.onProgress);
      case 'local':
      default:
        return this.streamToLocal(stream, key, options.onProgress);
    }
  }

  /**
   * Stream download from storage provider
   */
  async streamDownload(
    key: string,
    options: StreamingStorageOptions
  ): Promise<Readable> {
    const provider = options.provider || this.storageService.getProviderName();

    switch (provider) {
      case 's3':
        return this.streamFromS3(key);
      case 'vercel-blob':
        return this.streamFromVercelBlob(key);
      case 'local':
      default:
        return this.streamFromLocal(key);
    }
  }

  /**
   * Stream to S3 with multipart upload
   */
  private async streamToS3(
    stream: Readable,
    key: string,
    contentType: string,
    onProgress?: (bytes: number) => void
  ): Promise<string> {
    // S3 streaming would require the AWS SDK lib-storage package
    // For now, we'll buffer and upload
    logger.warn('S3 streaming not fully implemented, using buffered upload');
    
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        totalBytes += chunk.length;
        if (onProgress) {
          onProgress(totalBytes);
        }
      });

      stream.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          await this.storageService.uploadFile(key, buffer, { contentType });
          resolve(key);
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', reject);
    });
  }

  /**
   * Stream to Vercel Blob
   */
  private async streamToVercelBlob(
    stream: Readable,
    key: string,
    contentType: string,
    onProgress?: (bytes: number) => void
  ): Promise<string> {
    // Vercel Blob doesn't support true streaming yet, so we need to buffer
    // This is a limitation we'll need to work around
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        totalBytes += chunk.length;
        if (onProgress) {
          onProgress(totalBytes);
        }
      });

      stream.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          await this.storageService.uploadFile(key, buffer, { contentType });
          resolve(key);
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', reject);
    });
  }

  /**
   * Stream to local file system
   */
  private async streamToLocal(
    stream: Readable,
    key: string,
    onProgress?: (bytes: number) => void
  ): Promise<string> {
    const fs = await import('fs');
    const path = await import('path');
    const { pipeline } = await import('stream/promises');

    const storagePath = path.join(process.cwd(), 'data', 'storage');
    const filePath = path.join(storagePath, key);
    
    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

    // Create write stream
    const writeStream = fs.createWriteStream(filePath);
    let totalBytes = 0;

    // Track progress
    if (onProgress) {
      stream.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;
        onProgress(totalBytes);
      });
    }

    // Stream to file
    await pipeline(stream, writeStream);
    
    logger.info(`Streamed upload to local storage completed: ${key}`);
    return key;
  }

  /**
   * Stream from S3
   */
  private async streamFromS3(key: string): Promise<Readable> {
    // S3 streaming would require proper S3 client setup
    // For now, we'll download and create a stream
    logger.warn('S3 streaming not fully implemented, using buffered download');
    
    try {
      const data = await this.storageService.getFile(key);
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      
      // Create a readable stream from the buffer
      const readable = new Readable({
        read() {
          this.push(buffer);
          this.push(null);
        }
      });
      
      return readable;
    } catch (error) {
      logger.error('S3 streaming download failed:', error);
      throw error;
    }
  }

  /**
   * Stream from Vercel Blob
   */
  private async streamFromVercelBlob(key: string): Promise<Readable> {
    // Vercel Blob returns URLs, so we need to fetch and stream
    const url = await this.storageService.getFileUrl(key);
    const response = await fetch(url);
    
    if (!response.body) {
      throw new Error('No body in response');
    }

    // Convert Web Stream to Node.js stream
    const reader = response.body.getReader();
    return new Readable({
      async read() {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      }
    });
  }

  /**
   * Stream from local file system
   */
  private async streamFromLocal(key: string): Promise<Readable> {
    const fs = await import('fs');
    const path = await import('path');

    const filePath = path.join(process.cwd(), 'data', 'storage', key);
    
    if (!await fs.promises.access(filePath).then(() => true).catch(() => false)) {
      throw new Error(`File not found: ${key}`);
    }

    return fs.createReadStream(filePath);
  }

  /**
   * Create a streaming transform pipeline
   */
  createTransformPipeline(
    transforms: NodeJS.ReadWriteStream[]
  ): NodeJS.ReadWriteStream {
    if (transforms.length === 0) {
      throw new Error('No transforms provided');
    }

    // Chain transforms together
    let pipeline = transforms[0];
    for (let i = 1; i < transforms.length; i++) {
      pipeline = pipeline.pipe(transforms[i]);
    }

    return pipeline;
  }
}