'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  CloudArrowUpIcon, 
  XMarkIcon,
  DocumentIcon,
  ExclamationCircleIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import StreamingFileUpload from './StreamingFileUpload';
import EnhancedStreamingFileUpload from './EnhancedStreamingFileUpload';
import { useDialog } from '@/contexts/DialogContext';

interface ProcessedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  contentTruncated: boolean;
  originalContentLength: number;
  storageKey?: string;
}

interface UnifiedFileUploadProps {
  onFilesProcessed: (files: ProcessedFile[]) => void;
  onComplete?: () => void; // Called when user clicks Done in streaming mode
  maxRegularFileSize?: number;
  streamingThreshold?: number;
  accept?: Record<string, string[]>;
}

export default function UnifiedFileUpload({
  onFilesProcessed,
  onComplete,
  maxRegularFileSize = 50 * 1024 * 1024, // 50MB default for regular upload
  streamingThreshold = 10 * 1024 * 1024, // 10MB threshold to suggest streaming
  accept = {
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],
    'application/json': ['.json'],
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  }
}: UnifiedFileUploadProps) {
  const useEnhancedUpload = process.env.NEXT_PUBLIC_USE_ENHANCED_UPLOAD === 'true';
  const dialog = useDialog();
  const [uploadMode, setUploadMode] = useState<'regular' | 'streaming'>('regular');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [streamingFiles, setStreamingFiles] = useState<Map<string, string>>(new Map()); // filename -> storageKey
  const [processing, setProcessing] = useState(false);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const pdfjs = await import('pdfjs-dist');
    
    // Configure worker from local public directory
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textItems = (textContent.items as any[]).filter((item) => 'str' in item);
      
      // Process text items to preserve spacing and line breaks
      let pageText = '';
      let lastY = -1;
      let lastX = -1;
      
      for (const item of textItems) {
        const currentY = item.transform[5]; // Y coordinate
        const currentX = item.transform[4]; // X coordinate
        
        // If this is a new line (different Y coordinate)
        if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
          pageText += '\n';
        }
        // If there's a significant horizontal gap, add space
        else if (lastX !== -1 && currentX - lastX > 10) {
          pageText += ' ';
        }
        
        pageText += item.str;
        lastY = currentY;
        lastX = currentX + (item.width || 0);
      }
      
      text += pageText + '\n\n'; // Double newline between pages
    }
    
    return text;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Check if any files exceed the streaming threshold
    const largeFiles = acceptedFiles.filter(file => file.size > streamingThreshold);
    
    if (largeFiles.length > 0) {
      // Show dialog suggesting streaming upload
      dialog.showConfirm({
        title: 'Large Files Detected',
        message: `${largeFiles.length} file(s) are larger than ${(streamingThreshold / 1024 / 1024).toFixed(0)}MB. Would you like to use streaming upload for better performance?

Large files:
${largeFiles.map(f => `• ${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join('\n')}`,
        type: 'info',
        confirmText: 'Use Streaming Upload',
        cancelText: 'Continue Regular Upload'
      }).then(useStreaming => {
        if (useStreaming) {
          setUploadMode('streaming');
          // Don't add files here, let the streaming component handle them
        } else {
          setUploadedFiles(prev => [...prev, ...acceptedFiles]);
        }
      });
    } else {
      setUploadedFiles(prev => [...prev, ...acceptedFiles]);
    }
  }, [streamingThreshold, dialog]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    disabled: uploadMode === 'streaming'
  });

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const processRegularFiles = async () => {
    setProcessing(true);
    try {
      // Check file sizes before processing
      const oversizedFiles = uploadedFiles.filter(file => file.size > maxRegularFileSize);
      if (oversizedFiles.length > 0) {
        const maxSizeMB = maxRegularFileSize / (1024 * 1024);
        dialog.showAlert({
          title: 'Files Too Large',
          message: `Some files are too large for regular upload:\n${oversizedFiles.map(f => `• ${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join('\n')}\n\nMaximum size: ${maxSizeMB}MB. Please use streaming upload for larger files.`,
          type: 'warning'
        });
        setProcessing(false);
        return;
      }
      
      const processedFiles = await Promise.all(
        uploadedFiles.map(async (file) => {
          let text: string;
          
          if (file.type === 'application/pdf') {
            text = await extractTextFromPdf(file);
          } else {
            text = await file.text();
          }
          
          // Send full content to backend - it will handle external storage and truncation
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            content: text, // Full content - backend will store in external storage
            contentTruncated: false,
            originalContentLength: text.length,
          };
        })
      );

      onFilesProcessed(processedFiles);
      setUploadedFiles([]);
      
      // Also call onComplete for regular uploads to maintain consistent flow
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error processing files:', error);
      dialog.showAlert({
        title: 'Processing Error',
        message: 'An error occurred while processing the files. Please try again.',
        type: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleStreamingComplete = (fileName: string, storageKey: string, fileSize: number, mimeType: string) => {
    setStreamingFiles(prev => {
      const newMap = new Map(prev);
      newMap.set(fileName, JSON.stringify({ storageKey, fileSize, mimeType }));
      return newMap;
    });
  };

  const processStreamingFiles = async () => {
    if (streamingFiles.size === 0) return;

    setProcessing(true);
    try {
      const processedFiles: ProcessedFile[] = [];
      
      for (const [fileName, dataStr] of streamingFiles) {
        const data = JSON.parse(dataStr);
        // For streaming files, we don't include content in the initial upload
        // The backend will handle retrieving content from the storage key
        processedFiles.push({
          name: fileName,
          type: data.mimeType,
          size: data.fileSize,
          content: '', // Empty for streaming uploads
          contentTruncated: false,
          originalContentLength: data.fileSize,
          storageKey: data.storageKey // This is the key part - backend will use this
        });
      }

      onFilesProcessed(processedFiles);
      setStreamingFiles(new Map());
      
      // Call onComplete to signal that the upload session is done
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error processing streaming files:', error);
      dialog.showAlert({
        title: 'Processing Error',
        message: 'An error occurred while processing the streaming files. Please try again.',
        type: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {uploadMode === 'regular' ? (
        <>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <CloudArrowUpIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" />
            {isDragActive ? (
              <p className="text-sm text-blue-600">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Click to upload multiple files</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  TXT, CSV, JSON, PDF, DOCX • Regular upload up to {formatBytes(maxRegularFileSize)}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadMode('streaming');
                  }}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  Use Streaming Upload for Large Files (&gt;{(streamingThreshold / 1024 / 1024).toFixed(0)}MB)
                </button>
              </div>
            )}
          </div>
          
          {uploadedFiles.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DocumentIcon className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatBytes(file.size)}
                        {file.size > streamingThreshold && (
                          <span className="ml-2 text-orange-600">
                            (Consider streaming upload)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={processRegularFiles}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : 'Add to Data Source'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExclamationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Streaming Upload Mode</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Ideal for large files. Files are uploaded in chunks with resume capability.
                </p>
              </div>
            </div>
          </div>

          {useEnhancedUpload ? (
            <EnhancedStreamingFileUpload
              onUploadComplete={handleStreamingComplete}
              maxSize={5 * 1024 * 1024 * 1024} // 5GB for streaming
              onError={(error) => {
                dialog.showAlert({
                  title: 'Upload Error',
                  message: error,
                  type: 'error'
                });
              }}
            />
          ) : (
            <StreamingFileUpload
              onUploadComplete={handleStreamingComplete}
              maxSize={5 * 1024 * 1024 * 1024} // 5GB for streaming
            />
          )}

          {streamingFiles.size > 0 && (
            <div className="space-y-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 className="text-sm font-medium text-green-900">
                    {streamingFiles.size === 1 ? 'Upload Complete' : `${streamingFiles.size} Uploads Complete`}
                  </h4>
                </div>
                <div className="space-y-1">
                  {Array.from(streamingFiles.entries()).map(([fileName, storageKey]) => (
                    <div key={storageKey} className="flex items-center gap-2 text-sm text-green-800">
                      <DocumentIcon className="h-4 w-4 text-green-600" />
                      <span>{fileName}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-green-700 mt-2">
                  Click &quot;Done&quot; to add {streamingFiles.size === 1 ? 'this file' : 'these files'} to your data source
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => {
                setUploadMode('regular');
                setStreamingFiles(new Map());
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Switch to Regular Upload
            </button>
            {streamingFiles.size > 0 && (
              <button
                onClick={processStreamingFiles}
                disabled={processing}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
              >
                {processing ? 'Processing...' : 'Done'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}