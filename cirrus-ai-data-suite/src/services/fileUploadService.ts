import { fetchWithRetry, FILE_UPLOAD_RETRY_OPTIONS } from '@/utils/retryUtils';
import { logger } from '@/utils/logger';

export interface FileUploadOptions {
  onProgress?: (progress: number) => void;
  metadata?: Record<string, unknown>;
}

export class FileUploadService {
  /**
   * Upload a file with automatic retry on failure
   */
  static async uploadFile(
    file: File,
    endpoint: string,
    options: FileUploadOptions = {}
  ): Promise<Response> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }

    // Create XMLHttpRequest for progress tracking
    if (options.onProgress) {
      return this.uploadWithProgress(endpoint, formData, options.onProgress);
    }

    // Use fetch with retry for regular uploads
    return fetchWithRetry(
      endpoint,
      {
        method: 'POST',
        body: formData
      },
      {
        ...FILE_UPLOAD_RETRY_OPTIONS,
        onRetry: (error, attempt, delay) => {
          logger.info(`File upload retry ${attempt} for ${file.name} after ${delay}ms: ${error.message}`);
        }
      }
    );
  }

  /**
   * Upload with progress tracking using XMLHttpRequest
   */
  private static uploadWithProgress(
    endpoint: string,
    formData: FormData,
    onProgress: (progress: number) => void
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let retryCount = 0;
      const maxRetries = FILE_UPLOAD_RETRY_OPTIONS.maxRetries || 3;

      const attemptUpload = () => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = new Response(xhr.response, {
              status: xhr.status,
              statusText: xhr.statusText,
              headers: this.parseHeaders(xhr.getAllResponseHeaders())
            });
            resolve(response);
          } else if (this.shouldRetry(xhr.status) && retryCount < maxRetries) {
            retryCount++;
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
            logger.info(`Retrying upload after ${delay}ms (attempt ${retryCount}/${maxRetries})`);
            setTimeout(attemptUpload, delay);
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          if (retryCount < maxRetries) {
            retryCount++;
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
            logger.info(`Retrying upload after network error (attempt ${retryCount}/${maxRetries})`);
            setTimeout(attemptUpload, delay);
          } else {
            reject(new Error('Upload failed: Network error'));
          }
        });

        xhr.addEventListener('timeout', () => {
          if (retryCount < maxRetries) {
            retryCount++;
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
            logger.info(`Retrying upload after timeout (attempt ${retryCount}/${maxRetries})`);
            setTimeout(attemptUpload, delay);
          } else {
            reject(new Error('Upload failed: Timeout'));
          }
        });

        xhr.open('POST', endpoint);
        xhr.timeout = 120000; // 2 minute timeout
        xhr.send(formData);
      };

      attemptUpload();
    });
  }

  /**
   * Check if status code is retryable
   */
  private static shouldRetry(status: number): boolean {
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  /**
   * Parse headers from XMLHttpRequest
   */
  private static parseHeaders(headerStr: string): Headers {
    const headers = new Headers();
    const headerPairs = headerStr.trim().split('\r\n');
    
    headerPairs.forEach(header => {
      const [name, value] = header.split(': ');
      if (name && value) {
        headers.append(name, value);
      }
    });
    
    return headers;
  }

  /**
   * Upload multiple files in parallel with retry
   */
  static async uploadMultipleFiles(
    files: File[],
    endpoint: string,
    options: {
      maxConcurrent?: number;
      onFileProgress?: (fileName: string, progress: number) => void;
      onFileComplete?: (fileName: string, success: boolean) => void;
    } = {}
  ): Promise<Map<string, { success: boolean; error?: string }>> {
    const maxConcurrent = options.maxConcurrent || 3;
    const results = new Map<string, { success: boolean; error?: string }>();
    
    // Process files in batches
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      const promises = batch.map(async (file) => {
        try {
          await this.uploadFile(file, endpoint, {
            onProgress: (progress) => {
              if (options.onFileProgress) {
                options.onFileProgress(file.name, progress);
              }
            }
          });
          
          results.set(file.name, { success: true });
          if (options.onFileComplete) {
            options.onFileComplete(file.name, true);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.set(file.name, { success: false, error: errorMessage });
          logger.error(`Failed to upload ${file.name}:`, error);
          
          if (options.onFileComplete) {
            options.onFileComplete(file.name, false);
          }
        }
      });
      
      await Promise.all(promises);
    }
    
    return results;
  }
}