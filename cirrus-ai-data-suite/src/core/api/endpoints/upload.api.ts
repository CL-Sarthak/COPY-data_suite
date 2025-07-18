import { apiClient } from '../client';
import { ApiResponse } from '@/core/types/api.types';

export interface UploadSession {
  uploadId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number;
  status: 'initialized' | 'uploading' | 'completed' | 'failed';
  createdAt: string;
  expiresAt: string;
}

export interface InitializeUploadRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
  chunkSize?: number;
  metadata?: Record<string, unknown>;
}

export interface UploadChunkRequest {
  uploadId: string;
  chunkIndex: number;
  chunk: Blob | ArrayBuffer;
  checksum?: string;
}

export interface CompleteUploadRequest {
  uploadId: string;
  expectedChunks: number;
  metadata?: Record<string, unknown>;
}

export interface UploadProgressUpdate {
  uploadId: string;
  progress: number;
  uploadedBytes: number;
  totalBytes: number;
  chunksUploaded: number;
  totalChunks: number;
  status: UploadSession['status'];
  estimatedTimeRemaining?: number;
}

export class UploadAPI {
  // Initialize chunked upload
  async initializeUpload(data: InitializeUploadRequest): Promise<UploadSession> {
    return apiClient.post<UploadSession>('/streaming/upload/initialize', data);
  }

  // Upload a chunk
  async uploadChunk(data: UploadChunkRequest): Promise<{
    success: boolean;
    chunkIndex: number;
    uploadedChunks: number;
    totalChunks: number;
  }> {
    const formData = new FormData();
    formData.append('uploadId', data.uploadId);
    formData.append('chunkIndex', data.chunkIndex.toString());
    formData.append('chunk', new Blob([data.chunk]));
    
    if (data.checksum) {
      formData.append('checksum', data.checksum);
    }

    return apiClient.upload('/streaming/upload/chunk', formData);
  }

  // Complete upload
  async completeUpload(data: CompleteUploadRequest): Promise<{
    success: boolean;
    file: {
      id: string;
      name: string;
      size: number;
      mimeType: string;
      storageKey: string;
    };
  }> {
    return apiClient.post('/streaming/upload/complete', data);
  }

  // Alternative complete endpoint (v2)
  async completeUploadV2(uploadId: string): Promise<{
    success: boolean;
    file: {
      id: string;
      name: string;
      size: number;
      mimeType: string;
      storageKey: string;
    };
  }> {
    return apiClient.post(`/streaming/upload/complete-v2`, { uploadId });
  }

  // Get upload status
  async getUploadStatus(uploadId: string): Promise<UploadSession> {
    return apiClient.get<UploadSession>('/streaming/upload/status', {
      params: { uploadId }
    });
  }

  // Cancel upload
  async cancelUpload(uploadId: string): Promise<ApiResponse> {
    return apiClient.delete(`/streaming/upload/${uploadId}`);
  }

  // Simple file upload (non-chunked)
  async uploadFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{
    id: string;
    name: string;
    size: number;
    mimeType: string;
    storageKey: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    // Create a custom request to handle progress
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            reject(new Error('Invalid response format'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || `Upload failed: ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      xhr.open('POST', '/api/files/upload');
      xhr.send(formData);
    });
  }

  // Batch file upload
  async uploadFiles(
    files: File[],
    onProgress?: (file: string, progress: number) => void
  ): Promise<Array<{
    name: string;
    success: boolean;
    data?: {
      id: string;
      storageKey: string;
    };
    error?: string;
  }>> {
    const results = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, (progress) => {
          if (onProgress) {
            onProgress(file.name, progress);
          }
        });
        
        results.push({
          name: file.name,
          success: true,
          data: result
        });
      } catch (error) {
        results.push({
          name: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  // Helper to upload large file with chunking
  async uploadLargeFile(
    file: File,
    options?: {
      chunkSize?: number;
      onProgress?: (progress: UploadProgressUpdate) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<{ id: string; storageKey: string }> {
    const chunkSize = options?.chunkSize || 5 * 1024 * 1024; // 5MB default
    const totalChunks = Math.ceil(file.size / chunkSize);

    // Initialize upload
    const session = await this.initializeUpload({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      chunkSize
    });

    try {
      // Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        await this.uploadChunk({
          uploadId: session.uploadId,
          chunkIndex: i,
          chunk
        });

        if (options?.onProgress) {
          const progress: UploadProgressUpdate = {
            uploadId: session.uploadId,
            progress: ((i + 1) / totalChunks) * 100,
            uploadedBytes: end,
            totalBytes: file.size,
            chunksUploaded: i + 1,
            totalChunks,
            status: 'uploading',
            estimatedTimeRemaining: undefined // Could calculate based on upload speed
          };
          options.onProgress(progress);
        }
      }

      // Complete upload
      const result = await this.completeUpload({
        uploadId: session.uploadId,
        expectedChunks: totalChunks
      });

      if (options?.onProgress) {
        options.onProgress({
          uploadId: session.uploadId,
          progress: 100,
          uploadedBytes: file.size,
          totalBytes: file.size,
          chunksUploaded: totalChunks,
          totalChunks,
          status: 'completed'
        });
      }

      return {
        id: result.file.id,
        storageKey: result.file.storageKey
      };
    } catch (error) {
      if (options?.onError) {
        options.onError(error instanceof Error ? error : new Error('Upload failed'));
      }
      
      // Try to cancel the upload
      try {
        await this.cancelUpload(session.uploadId);
      } catch {
        // Ignore cancel errors
      }
      
      throw error;
    }
  }
}

export const uploadAPI = new UploadAPI();