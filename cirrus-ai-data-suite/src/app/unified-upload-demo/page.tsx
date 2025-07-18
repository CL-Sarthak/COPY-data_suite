'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import UnifiedFileUpload from '@/components/UnifiedFileUpload';
import { DocumentIcon } from '@heroicons/react/24/outline';

interface ProcessedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  contentTruncated: boolean;
  originalContentLength: number;
  storageKey?: string;
}

export default function UnifiedUploadDemo() {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);

  const handleFilesProcessed = (files: ProcessedFile[]) => {
    console.log('Files processed:', files);
    setProcessedFiles(files);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Unified File Upload Demo</h1>
          <p className="text-gray-600 mb-8">
            Test the unified file upload component with automatic streaming for large files
          </p>

          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Files</h2>
            <UnifiedFileUpload
              onFilesProcessed={handleFilesProcessed}
              maxRegularFileSize={50 * 1024 * 1024} // 50MB
              streamingThreshold={10 * 1024 * 1024} // 10MB
            />
          </div>

          {processedFiles.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Processed Files ({processedFiles.length})
              </h2>
              <div className="space-y-3">
                {processedFiles.map((file, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <DocumentIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{file.name}</h3>
                        <div className="mt-1 text-sm text-gray-600 space-y-1">
                          <p>Type: {file.type}</p>
                          <p>Size: {formatBytes(file.size)}</p>
                          <p>Content Length: {file.originalContentLength} characters</p>
                          {file.contentTruncated && (
                            <p className="text-orange-600">Content was truncated for storage</p>
                          )}
                          {file.storageKey && (
                            <p className="text-green-600">Uploaded via streaming (key: {file.storageKey})</p>
                          )}
                        </div>
                        {file.content && (
                          <div className="mt-3">
                            <h4 className="text-sm font-medium text-gray-700">Content Preview:</h4>
                            <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                              {file.content.substring(0, 500)}
                              {file.content.length > 500 && '...'}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}