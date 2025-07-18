/**
 * S3 Storage Provider
 * Uses AWS S3 or S3-compatible storage services
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider, StorageFile, StorageResult, StorageListItem } from './storageInterface';

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string; // For S3-compatible services like MinIO
}

export class S3Provider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(config: S3Config) {
    this.bucket = config.bucket;
    
    this.client = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: !!config.endpoint, // Required for S3-compatible services
    });
  }

  async upload(file: StorageFile): Promise<StorageResult> {
    const content = typeof file.content === 'string' 
      ? Buffer.from(file.content, 'utf8') 
      : file.content;

    const metadata: Record<string, string> = {};
    if (file.metadata) {
      // S3 metadata must be string values
      Object.entries(file.metadata).forEach(([key, value]) => {
        metadata[`x-amz-meta-${key}`] = String(value);
      });
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: file.key,
      Body: content,
      ContentType: file.contentType,
      Metadata: metadata,
    });

    await this.client.send(command);

    // Get the URL for the uploaded file
    const url = await this.getUrl(file.key);

    return {
      url,
      key: file.key,
      size: content.length,
      contentType: file.contentType,
      metadata: file.metadata,
    };
  }

  async get(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response: GetObjectCommandOutput = await this.client.send(command);
      
      if (!response.Body) {
        throw new Error(`File not found: ${key}`);
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      
      // AWS SDK v3 returns different stream types depending on environment
      // Check if it's a web stream (has transformToByteArray method)
      if (response.Body && typeof (response.Body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === 'function') {
        // Web stream (browser environment)
        const bytes = await (response.Body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
        return Buffer.from(bytes);
      } else {
        // Node stream (Node.js environment)
        const stream = response.Body as NodeJS.ReadableStream;
        return new Promise((resolve, reject) => {
          stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error && 
          ('name' in error && error.name === 'NoSuchKey' || 
           '$metadata' in error && (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404)) {
        throw new Error(`File not found: ${key}`);
      }
      throw error;
    }
  }

  async getUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // First check if the object exists
    const exists = await this.exists(key);
    if (!exists) {
      throw new Error(`File not found: ${key}`);
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.client.send(command);
    } catch (error: unknown) {
      // S3 doesn't throw on deleting non-existent objects
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Failed to delete ${key}:`, errorMessage);
    }
  }

  async list(prefix?: string): Promise<StorageListItem[]> {
    const items: StorageListItem[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await this.client.send(command);

      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key && object.Size !== undefined && object.LastModified) {
            items.push({
              key: object.Key,
              size: object.Size,
              lastModified: object.LastModified,
            });
          }
        }
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return items;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && 
          ('name' in error && error.name === 'NoSuchKey' || 
           '$metadata' in error && (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404)) {
        return false;
      }
      throw error;
    }
  }

  getProviderName(): string {
    return 's3';
  }
}