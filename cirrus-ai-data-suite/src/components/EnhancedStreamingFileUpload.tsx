'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, PauseIcon, PlayIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';
import { withRetry, fetchWithRetry, FILE_UPLOAD_RETRY_OPTIONS, getChunkRetryOptions } from '@/utils/retryUtils';

interface UploadProgress {
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  uploadedChunks: number;
  totalChunks: number;
  percentage: number;
  status: 'preparing' | 'uploading' | 'paused' | 'completed' | 'failed' | 'retrying';
  error?: string;
  retryCount?: number;
  speed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
}

interface UploadRef {
  uploadId: string;
  controller: AbortController;
  startTime: number;
  lastProgressTime: number;
  lastProgressBytes: number;
}

interface EnhancedStreamingFileUploadProps {
  accept?: Record<string, string[]>;
  maxSize?: number;
  onUploadComplete: (fileName: string, storageKey: string, fileSize: number, mimeType: string) => void;
  onError?: (error: string) => void;
}

export default function EnhancedStreamingFileUpload({
  accept = {
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],
    'application/json': ['.json'],
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
  },
  maxSize = 5 * 1024 * 1024 * 1024, // 5GB
  onUploadComplete,
  onError
}: EnhancedStreamingFileUploadProps) {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const uploadRefs = useRef<Map<string, UploadRef>>(new Map());
  const [globalPause, setGlobalPause] = useState(false);

  const calculateChecksum = async (data: Blob): Promise<string> => {
    const arrayBuffer = await data.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const updateUploadSpeed = useCallback((fileName: string, bytesUploaded: number) => {
    const ref = uploadRefs.current.get(fileName);
    if (!ref) return;

    const now = Date.now();
    const timeDiff = (now - ref.lastProgressTime) / 1000; // seconds
    const bytesDiff = bytesUploaded - ref.lastProgressBytes;
    
    if (timeDiff > 0) {
      const speed = bytesDiff / timeDiff;
      const upload = uploads.get(fileName);
      if (upload) {
        const remainingBytes = upload.fileSize - bytesUploaded;
        const estimatedTimeRemaining = remainingBytes / speed;
        
        setUploads(prev => {
          const newMap = new Map(prev);
          const progress = newMap.get(fileName)!;
          progress.speed = speed;
          progress.estimatedTimeRemaining = estimatedTimeRemaining;
          return newMap;
        });
      }
    }
    
    ref.lastProgressTime = now;
    ref.lastProgressBytes = bytesUploaded;
  }, [uploads]);

  const uploadChunkWithRetry = useCallback(async (
    uploadId: string,
    chunk: Blob,
    chunkIndex: number,
    checksum: string,
    controller: AbortController
  ): Promise<boolean> => {
    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('chunk', chunk);
    formData.append('checksum', checksum);

    const retryOptions = getChunkRetryOptions(chunk.size, chunkIndex);
    
    const result = await withRetry(
      async () => {
        if (controller.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const response = await fetch('/api/streaming/upload/chunk', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'Chunk upload failed');
        }

        return true;
      },
      {
        ...retryOptions,
        onRetry: (error, attempt, delay) => {
          logger.info(`Chunk ${chunkIndex} retry ${attempt} after ${delay}ms: ${error.message}`);
          // Update UI to show retry status
          const fileName = Array.from(uploads.entries()).find(([name]) => uploadRefs.current.get(name)?.uploadId === uploadId)?.[0];
          if (fileName) {
            setUploads(prev => {
              const newMap = new Map(prev);
              const progress = newMap.get(fileName);
              if (progress) {
                progress.status = 'retrying';
                progress.retryCount = attempt;
              }
              return newMap;
            });
          }
        }
      }
    );

    return result.success;
  }, [uploads]);

  const uploadFile = useCallback(async (file: File) => {
    if (globalPause) {
      logger.info('Upload paused globally, queuing file:', file.name);
      return;
    }

    const fileName = file.name;
    const controller = new AbortController();
    const startTime = Date.now();

    try {
      // Initialize upload session
      setUploads(prev => new Map(prev).set(fileName, {
        fileName,
        fileSize: file.size,
        uploadedBytes: 0,
        uploadedChunks: 0,
        totalChunks: 0,
        percentage: 0,
        status: 'preparing',
        retryCount: 0
      }));

      // Initialize upload with retry
      const initResult = await withRetry(
        async () => {
          const response = await fetch('/api/streaming/upload/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type || 'application/octet-stream',
              metadata: { uploadedAt: new Date().toISOString() }
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to initialize upload: ${response.status}`);
          }

          return response.json();
        },
        FILE_UPLOAD_RETRY_OPTIONS
      );

      if (!initResult.success) {
        throw new Error('Failed to initialize upload after retries');
      }

      const { uploadId, chunkSize, totalChunks } = initResult.data;
      
      uploadRefs.current.set(fileName, { 
        uploadId, 
        controller,
        startTime,
        lastProgressTime: startTime,
        lastProgressBytes: 0
      });

      setUploads(prev => {
        const newMap = new Map(prev);
        const progress = newMap.get(fileName)!;
        progress.totalChunks = totalChunks;
        progress.status = 'uploading';
        return newMap;
      });

      // Upload chunks with smart retry and resume
      let uploadedChunks = 0;
      
      // Check for existing chunks if resuming
      const statusResponse = await fetchWithRetry(
        `/api/streaming/upload/status?uploadId=${uploadId}`,
        { method: 'GET' }
      );
      
      const status = await statusResponse.json();
      const existingChunks = new Set(status.uploadedChunks || []);
      
      for (let i = 0; i < totalChunks; i++) {
        if (controller.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        // Skip already uploaded chunks
        if (existingChunks.has(i)) {
          uploadedChunks++;
          continue;
        }

        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        const checksum = await calculateChecksum(chunk);

        const success = await uploadChunkWithRetry(uploadId, chunk, i, checksum, controller);
        if (!success) {
          throw new Error(`Failed to upload chunk ${i}`);
        }

        uploadedChunks++;
        const uploadedBytes = Math.min((uploadedChunks) * chunkSize, file.size);
        const percentage = Math.round((uploadedBytes / file.size) * 100);

        updateUploadSpeed(fileName, uploadedBytes);

        setUploads(prev => {
          const newMap = new Map(prev);
          const progress = newMap.get(fileName)!;
          progress.uploadedBytes = uploadedBytes;
          progress.uploadedChunks = uploadedChunks;
          progress.percentage = percentage;
          progress.status = 'uploading';
          progress.retryCount = 0;
          return newMap;
        });
      }

      // Complete upload with retry
      const completeResult = await withRetry(
        async () => {
          const response = await fetch('/api/streaming/upload/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uploadId })
          });

          if (!response.ok) {
            throw new Error(`Failed to complete upload: ${response.status}`);
          }

          return response.json();
        },
        FILE_UPLOAD_RETRY_OPTIONS
      );

      if (!completeResult.success) {
        throw new Error('Failed to complete upload after retries');
      }

      const storageKey = completeResult.data.storageKey || uploadId;

      // Mark as completed
      setUploads(prev => {
        const newMap = new Map(prev);
        const progress = newMap.get(fileName)!;
        progress.status = 'completed';
        progress.percentage = 100;
        return newMap;
      });

      onUploadComplete(fileName, storageKey, file.size, file.type || 'application/octet-stream');
      logger.info(`Upload completed: ${fileName} with storage key: ${storageKey}`);

    } catch (error) {
      logger.error(`Upload failed for ${fileName}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploads(prev => {
        const newMap = new Map(prev);
        const progress = newMap.get(fileName)!;
        progress.status = 'failed';
        progress.error = errorMessage;
        return newMap;
      });
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      uploadRefs.current.delete(fileName);
    }
  }, [onUploadComplete, onError, globalPause, updateUploadSpeed, uploadChunkWithRetry]);

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

    // Find the file in the input element or ask user to re-select
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = Object.values(accept).flat().join(',');
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name === fileName) {
          await uploadFile(file);
        } else {
          alert('Please select the same file to resume upload');
        }
      }
    };
    
    input.click();
  };

  const retryUpload = async (fileName: string) => {
    const upload = uploads.get(fileName);
    if (!upload || upload.status !== 'failed') return;

    // Similar to resume, ask user to re-select the file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = Object.values(accept).flat().join(',');
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name === fileName) {
          await uploadFile(file);
        }
      }
    };
    
    input.click();
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

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Enhanced Streaming Upload</h3>
        <button
          onClick={() => setGlobalPause(!globalPause)}
          className={`px-3 py-1 text-sm rounded ${
            globalPause 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
          }`}
        >
          {globalPause ? 'Resume All' : 'Pause All'}
        </button>
      </div>

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
          Maximum file size: {formatBytes(maxSize)} • Automatic retry on failure
        </p>
      </div>

      {uploads.size > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Upload Progress</h4>
          {Array.from(uploads.entries()).map(([fileName, progress]) => (
            <div key={fileName} className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{fileName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      progress.status === 'completed' ? 'bg-green-100 text-green-700' :
                      progress.status === 'failed' ? 'bg-red-100 text-red-700' :
                      progress.status === 'retrying' ? 'bg-yellow-100 text-yellow-700' :
                      progress.status === 'paused' ? 'bg-gray-100 text-gray-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {progress.status}
                      {progress.retryCount && progress.retryCount > 0 && ` (retry ${progress.retryCount})`}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                    <span>{formatBytes(progress.uploadedBytes)} / {formatBytes(progress.fileSize)}</span>
                    {progress.speed && progress.status === 'uploading' && (
                      <>
                        <span>•</span>
                        <span>{formatSpeed(progress.speed)}</span>
                        <span>•</span>
                        <span>ETA: {formatTime(progress.estimatedTimeRemaining || 0)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {progress.status === 'uploading' && (
                    <button
                      onClick={() => pauseUpload(fileName)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Pause upload"
                    >
                      <PauseIcon className="h-4 w-4" />
                    </button>
                  )}
                  {progress.status === 'paused' && (
                    <button
                      onClick={() => resumeUpload(fileName)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Resume upload"
                    >
                      <PlayIcon className="h-4 w-4" />
                    </button>
                  )}
                  {progress.status === 'failed' && (
                    <button
                      onClick={() => retryUpload(fileName)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Retry upload"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                    </button>
                  )}
                  {progress.status !== 'completed' && (
                    <button
                      onClick={() => cancelUpload(fileName)}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Cancel upload"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    progress.status === 'completed' ? 'bg-green-500' :
                    progress.status === 'failed' ? 'bg-red-500' :
                    progress.status === 'retrying' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              {progress.error && (
                <p className="text-xs text-red-600">{progress.error}</p>
              )}
              <div className="text-xs text-gray-500">
                Chunks: {progress.uploadedChunks} / {progress.totalChunks}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}