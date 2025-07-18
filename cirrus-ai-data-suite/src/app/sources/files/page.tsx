'use client';

import React, { useState, useCallback, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import UnifiedFileUpload from '@/components/UnifiedFileUpload';
import { DialogProvider, useDialog } from '@/contexts/DialogContext';
import { HelpButton } from '@/components/HelpSystem';
import { getHelpContent } from '@/content/helpContent';
import { 
  FileText,
  AlertCircle,
  CheckCircleIcon,
  FolderOpenIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  Eye,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { formatBytes } from '@/utils/format';
import { useRouter } from 'next/navigation';
import { DataSource } from '@/types/discovery';
import { TagManager } from '@/components/TagManager';

interface ProcessedFile {
  name: string;
  type: string;
  size: number;
  content: string;
  contentTruncated: boolean;
  originalContentLength: number;
  storageKey?: string;
}

function FileUploadContent() {
  const dialog = useDialog();
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState<ProcessedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [dataSourceName, setDataSourceName] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [fileSources, setFileSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'name' | 'fileCount' | 'size'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [editingName, setEditingName] = useState('');

  const loadFileSources = useCallback(async () => {
    try {
      const response = await fetch('/api/data-sources');
      if (response.ok) {
        const sources = await response.json();
        // Filter for filesystem sources
        const fileDataSources = sources.filter((s: DataSource) => s.type === 'filesystem');
        setFileSources(fileDataSources);
      }
    } catch (error) {
      console.error('Error loading file sources:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const getFileCount = (source: DataSource) => {
    try {
      const config = source.configuration as {
        files?: Array<{
          name: string;
          type?: string;
          size?: number;
          originalContentLength?: number;
        }>;
        [key: string]: unknown;
      };
      if (config?.files && Array.isArray(config.files)) {
        return config.files.length;
      }
    } catch {
      // Ignore parsing errors
    }
    return 0;
  };

  const getTotalSize = (source: DataSource) => {
    try {
      const config = source.configuration as {
        files?: Array<{
          name: string;
          type?: string;
          size?: number;
          originalContentLength?: number;
        }>;
        [key: string]: unknown;
      };
      if (config?.files && Array.isArray(config.files)) {
        return config.files.reduce((total: number, file) => {
          return total + (file.originalContentLength || file.size || 0);
        }, 0);
      }
    } catch {
      // Ignore parsing errors
    }
    return 0;
  };

  const handleSort = (field: 'name' | 'fileCount' | 'size') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedFileSources = [...fileSources].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'fileCount':
        aValue = getFileCount(a);
        bValue = getFileCount(b);
        break;
      case 'size':
        aValue = getTotalSize(a);
        bValue = getTotalSize(b);
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Get all unique tags from all file sources
  const allTags = Array.from(new Set(
    fileSources.flatMap(source => source.tags || [])
  ));

  useEffect(() => {
    loadFileSources();
  }, [loadFileSources]);

  const handleFilesProcessed = useCallback((files: ProcessedFile[]) => {
    console.log('Files processed:', files.length);
    setUploadedFiles(files);
  }, []);

  const deleteFileSource = async (sourceId: string) => {
    try {
      const response = await fetch(`/api/data-sources/${sourceId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadFileSources();
        dialog.showAlert({
          title: 'Success',
          message: 'File source deleted successfully.',
          type: 'success'
        });
      } else {
        throw new Error('Failed to delete file source');
      }
    } catch (error) {
      console.error('Error deleting file source:', error);
      dialog.showAlert({
        title: 'Error',
        message: 'Failed to delete file source.',
        type: 'error'
      });
    }
  };

  const handleTagsUpdate = async (sourceId: string, tags: string[]) => {
    try {
      const response = await fetch(`/api/data-sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags })
      });

      if (response.ok) {
        await loadFileSources();
      } else {
        throw new Error('Failed to update tags');
      }
    } catch (error) {
      console.error('Error updating tags:', error);
      dialog.showAlert({
        title: 'Error',
        message: 'Failed to update tags.',
        type: 'error'
      });
    }
  };

  const handleEditSource = (source: DataSource) => {
    setEditingSource(source);
    setEditingName(source.name);
  };

  const handleSaveEdit = async () => {
    if (!editingSource || !editingName.trim()) return;

    try {
      const response = await fetch(`/api/data-sources/${editingSource.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() })
      });

      if (response.ok) {
        await loadFileSources();
        setEditingSource(null);
        setEditingName('');
        dialog.showAlert({
          title: 'Success',
          message: 'Source name updated successfully.',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error updating source name:', error);
      dialog.showAlert({
        title: 'Error',
        message: 'Failed to update source name.',
        type: 'error'
      });
    }
  };

  const saveDataSource = async () => {
    if (uploadedFiles.length === 0) {
      dialog.showAlert({
        title: 'No Files',
        message: 'Please upload at least one file before saving.',
        type: 'error'
      });
      return;
    }

    setProcessing(true);

    try {
      const files = uploadedFiles.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
        content: file.content,
        contentTruncated: file.contentTruncated,
        originalContentLength: file.originalContentLength,
        storageKey: file.storageKey
      }));

      const newSourceData = {
        name: dataSourceName || `File Upload - ${new Date().toLocaleDateString()}`,
        type: 'filesystem',
        path: '/uploads',
        connectionStatus: 'connected',
        configuration: {
          files
        }
      };

      const response = await fetch('/api/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSourceData)
      });

      if (response.ok) {
        dialog.showAlert({
          title: 'Success',
          message: 'Files uploaded successfully!',
          type: 'success'
        });
        
        setUploadedFiles([]);
        setDataSourceName('');
        setShowUploadForm(false);
        await loadFileSources();
      } else {
        const errorData = await response.json();
        let errorMessage = 'Failed to save data source';
        
        if (response.status === 413) {
          errorMessage = 'Files are too large. Large files should be uploaded using the streaming option.';
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        dialog.showAlert({
          title: 'Upload Failed',
          message: errorMessage,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error saving files:', error);
      dialog.showAlert({
        title: 'Error',
        message: 'An error occurred while saving the files.',
        type: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </AppLayout>
    );
  }

  if (showUploadForm) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => {
                  setShowUploadForm(false);
                  setUploadedFiles([]);
                  setDataSourceName('');
                }}
                className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                ← Back to File Sources
              </button>
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Upload New Files</h1>
                  <p className="text-gray-900 mt-1">
                    Upload files to create a new data source for analysis
                  </p>
                </div>
                <HelpButton 
                  content={getHelpContent('fileUpload')} 
                  className="ml-2"
                />
              </div>
            </div>

            {/* Vercel Environment Warning */}
            {(process.env.VERCEL || process.env.VERCEL_URL) && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-blue-800 mb-1">
                      Vercel Deployment Environment
                    </h3>
                    <p className="text-sm text-blue-700">
                      Maximum file size: 4MB • Text content up to 100KB preview • 
                      Files larger than 4MB will automatically use streaming upload.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Data Source Name */}
              <div className="mb-6">
                <label htmlFor="dataSourceName" className="block text-sm font-medium text-gray-700 mb-2">
                  Data Source Name (optional)
                </label>
                <input
                  id="dataSourceName"
                  type="text"
                  value={dataSourceName}
                  onChange={(e) => setDataSourceName(e.target.value)}
                  placeholder="My Dataset"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* File Upload Area */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Files
                </label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-800">
                    💡 <strong>Tip:</strong> Upload multiple files together to group them under one data source. 
                    Supported formats: TXT, CSV, JSON, PDF, DOCX, and more.
                  </p>
                </div>
                <UnifiedFileUpload
                  onFilesProcessed={handleFilesProcessed}
                />
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Uploaded Files ({uploadedFiles.length})
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatBytes(file.size)} • {file.type || 'Unknown type'}
                              {file.contentTruncated && (
                                <span className="text-orange-600 ml-2">
                                  (Preview only - {formatBytes(file.originalContentLength)} total)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setUploadedFiles([]);
                    setDataSourceName('');
                  }}
                  disabled={uploadedFiles.length === 0 || processing}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All
                </button>
                <button
                  onClick={saveDataSource}
                  disabled={uploadedFiles.length === 0 || processing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Saving...' : 'Save Data Source'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">File Sources</h1>
                <p className="text-gray-900 mt-1">
                  Upload and manage file-based data sources
                </p>
              </div>
              <HelpButton 
                content={getHelpContent('fileUpload')} 
                className="ml-2"
              />
            </div>
            <button
              onClick={() => setShowUploadForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Upload Files
            </button>
          </div>

          {fileSources.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <FolderOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">No file sources yet</p>
              <p className="text-gray-900 mb-6">
                Upload your first files to start analyzing data
              </p>
              <button
                onClick={() => setShowUploadForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Upload Files
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {sortField === 'name' && (
                          sortDirection === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('fileCount')}
                    >
                      <div className="flex items-center gap-1">
                        Files
                        {sortField === 'fileCount' && (
                          sortDirection === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('size')}
                    >
                      <div className="flex items-center gap-1">
                        Size
                        {sortField === 'size' && (
                          sortDirection === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedFileSources.map((source) => (
                    <tr key={source.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FolderOpenIcon className="h-5 w-5 text-gray-400 mr-3" />
                          {editingSource?.id === source.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit();
                                  if (e.key === 'Escape') {
                                    setEditingSource(null);
                                    setEditingName('');
                                  }
                                }}
                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <button
                                onClick={handleSaveEdit}
                                className="text-green-600 hover:text-green-700"
                                title="Save changes"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingSource(null);
                                  setEditingName('');
                                }}
                                className="text-red-600 hover:text-red-700"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="text-sm font-medium text-gray-900">{source.name}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getFileCount(source)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatBytes(getTotalSize(source))}
                      </td>
                      <td className="px-6 py-4">
                        <TagManager
                          tags={source.tags || []}
                          availableTags={allTags}
                          onTagsChange={(tags) => handleTagsUpdate(source.id, tags)}
                          className="max-w-xs"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {source.hasTransformedData && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Transformed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {editingSource?.id !== source.id && (
                            <button
                              onClick={() => handleEditSource(source)}
                              className="text-gray-600 hover:text-gray-900"
                              title="Edit name"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/discovery?source=${source.id}`)}
                            className="text-gray-600 hover:text-gray-900"
                            title="View in Discovery"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteFileSource(source.id)}
                            className="text-gray-600 hover:text-red-600"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function FileUploadPage() {
  return (
    <DialogProvider>
      <FileUploadContent />
    </DialogProvider>
  );
}