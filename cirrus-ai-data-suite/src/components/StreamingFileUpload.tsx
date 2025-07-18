'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  CloudArrowUpIcon, 
  XMarkIcon,
  PauseIcon,
  PlayIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';

interface UploadProgress {
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  uploadedChunks: number;
  totalChunks: number;
  percentage: number;
  status: 'preparing' | 'uploading' | 'paused' | 'completed' | 'failed';
  error?: string;
}

interface StreamingFileUploadProps {
  onUploadComplete: (fileName: string, storageKey: string, fileSize: number, mimeType: string) => void;
  onError?: (error: string) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
}

export default function StreamingFileUpload({
  onUploadComplete,
  onError,
  accept,
  maxSize = 5 * 1024 * 1024 * 1024 // 5GB default
}: StreamingFileUploadProps) {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const uploadRefs = useRef<Map<string, { uploadId: string; controller: AbortController }>>(new Map());

  const calculateChecksum = async (chunk: Blob): Promise<string> => {
    // Use SHA-256 which is supported by Web Crypto API
    const arrayBuffer = await chunk.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const uploadChunk = async (
    uploadId: string,
    chunk: Blob,
    chunkIndex: number,
    checksum: string,
    controller: AbortController
  ): Promise<boolean> => {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('checksum', checksum);
    formData.append('chunk', chunk);

    try {
      const response = await fetch('/api/streaming/upload/chunk', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chunk upload failed');
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.debug('Chunk upload aborted');
        return false;
      }
      throw error;
    }
  };

  const uploadFile = useCallback(async (file: File) => {
    const fileName = file.name;
    const controller = new AbortController();

    try {
      // Initialize upload session
      setUploads(prev => new Map(prev).set(fileName, {
        fileName,
        fileSize: file.size,
        uploadedBytes: 0,
        uploadedChunks: 0,
        totalChunks: 0,
        percentage: 0,
        status: 'preparing'
      }));

      const initResponse = await fetch('/api/streaming/upload/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          metadata: { uploadedAt: new Date().toISOString() }
        })
      });

      if (!initResponse.ok) {
        throw new Error('Failed to initialize upload');
      }

      const { uploadId, chunkSize, totalChunks } = await initResponse.json();
      uploadRefs.current.set(fileName, { uploadId, controller });

      setUploads(prev => {
        const newMap = new Map(prev);
        const progress = newMap.get(fileName)!;
        progress.totalChunks = totalChunks;
        progress.status = 'uploading';
        return newMap;
      });

      // Upload chunks
      let uploadedChunks = 0;
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        const checksum = await calculateChecksum(chunk);

        const success = await uploadChunk(uploadId, chunk, i, checksum, controller);
        if (!success) {
          throw new Error('Chunk upload failed');
        }

        uploadedChunks++;
        const uploadedBytes = Math.min((i + 1) * chunkSize, file.size);
        const percentage = Math.round((uploadedBytes / file.size) * 100);

        setUploads(prev => {
          const newMap = new Map(prev);
          const progress = newMap.get(fileName)!;
          progress.uploadedBytes = uploadedBytes;
          progress.uploadedChunks = uploadedChunks;
          progress.percentage = percentage;
          return newMap;
        });
      }

      // Small delay to ensure database writes are committed in serverless environment
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get final storage key with retry logic
      let completeResponse;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        completeResponse = await fetch('/api/streaming/upload/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId })
        });

        if (completeResponse.ok) {
          break;
        }
        
        if (retries < maxRetries - 1) {
          console.log(`Upload complete attempt ${retries + 1} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retries++;
        } else {
          const errorData = await completeResponse.json().catch(() => ({}));
          console.error('Upload complete failed:', errorData);
          throw new Error(`Failed to complete upload: ${errorData.error || 'Unknown error'}`);
        }
      }

      const completeData = await completeResponse!.json();
      const storageKey = completeData.storageKey || uploadId;

      // Mark as completed
      setUploads(prev => {
        const newMap = new Map(prev);
        const progress = newMap.get(fileName)!;
        progress.status = 'completed';
        return newMap;
      });

      onUploadComplete(fileName, storageKey, file.size, file.type || 'application/octet-stream');
      logger.info(`Upload completed: ${fileName} with storage key: ${storageKey}`);

    } catch (error) {
      logger.error(`Upload failed for ${fileName}:`, error);
      setUploads(prev => {
        const newMap = new Map(prev);
        const progress = newMap.get(fileName)!;
        progress.status = 'failed';
        progress.error = error instanceof Error ? error.message : 'Upload failed';
        return newMap;
      });
      
      if (onError) {
        onError(error instanceof Error ? error.message : 'Upload failed');
      }
    } finally {
      uploadRefs.current.delete(fileName);
    }
  }, [onUploadComplete, onError]);

  const pauseUpload = async (fileName: string) => {
    const ref = uploadRefs.current.get(fileName);
    if (!ref) return;

    ref.controller.abort();

    try {
      await fetch('/api/streaming/upload/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: ref.uploadId, action: 'pause' })
      });

      setUploads(prev => {
        const newMap = new Map(prev);
        const progress = newMap.get(fileName)!;
        progress.status = 'paused';
        return newMap;
      });
    } catch (error) {
      logger.error('Failed to pause upload:', error);
    }
  };

  const resumeUpload = async (fileName: string) => {
    const upload = uploads.get(fileName);
    if (!upload || upload.status !== 'paused') return;

    // Resume logic would go here
    logger.info('Resume functionality to be implemented');
  };

  const cancelUpload = (fileName: string) => {
    const ref = uploadRefs.current.get(fileName);
    if (ref) {
      ref.controller.abort();
      uploadRefs.current.delete(fileName);
    }
    
    setUploads(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileName);
      return newMap;
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      await uploadFile(file);
    }
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: true
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? 'Drop files here...' : 'Drag and drop files here, or click to browse'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Maximum file size: {formatBytes(maxSize)}
        </p>
      </div>

      {uploads.size > 0 && (
        <div className="space-y-2">
          {Array.from(uploads.values()).map((upload) => (
            <div key={upload.fileName} className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{upload.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {formatBytes(upload.uploadedBytes)} / {formatBytes(upload.fileSize)}
                    {upload.totalChunks > 0 && (
                      <span className="ml-2">
                        ({upload.uploadedChunks}/{upload.totalChunks} chunks)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {upload.status === 'uploading' && (
                    <button
                      onClick={() => pauseUpload(upload.fileName)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Pause upload"
                    >
                      <PauseIcon className="h-5 w-5" />
                    </button>
                  )}
                  {upload.status === 'paused' && (
                    <button
                      onClick={() => resumeUpload(upload.fileName)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Resume upload"
                    >
                      <PlayIcon className="h-5 w-5" />
                    </button>
                  )}
                  {upload.status === 'failed' && (
                    <button
                      onClick={() => {/* Retry logic */}}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Retry upload"
                    >
                      <ArrowPathIcon className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => cancelUpload(upload.fileName)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title="Cancel upload"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="relative">
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                  <div
                    style={{ width: `${upload.percentage}%` }}
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                      upload.status === 'failed' ? 'bg-red-500' :
                      upload.status === 'completed' ? 'bg-green-500' :
                      upload.status === 'paused' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}
                  />
                </div>
                {upload.error && (
                  <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}