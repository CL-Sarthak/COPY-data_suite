import React, { useState } from 'react';
import { Modal, Button } from '@/features/shared/components';
import UnifiedFileUpload from '@/components/UnifiedFileUpload';
import { ProcessedFile } from '../../types';
import { DataSource } from '@/types/discovery';
import { 
  CloudIcon, 
  CircleStackIcon,
  GlobeAltIcon,
  DocumentIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface AddDataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    name: string, 
    type: DataSource['type'], 
    config: Record<string, unknown>, 
    files: ProcessedFile[]
  ) => Promise<void>;
}

export function AddDataSourceModal({ isOpen, onClose, onAdd }: AddDataSourceModalProps) {
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [sourceType, setSourceType] = useState<DataSource['type']>('filesystem');
  const [sourceName, setSourceName] = useState('');
  const [sourceConfig, setSourceConfig] = useState<Record<string, unknown>>({});
  const [uploadedFiles, setUploadedFiles] = useState<ProcessedFile[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFilesProcessed = (files: ProcessedFile[]) => {
    setUploadedFiles(files);
  };

  const handleNext = () => {
    if (step === 'type') {
      setStep('config');
    }
  };

  const handleBack = () => {
    if (step === 'config') {
      setStep('type');
    }
  };

  const handleSubmit = async () => {
    if (!sourceName.trim()) {
      return;
    }

    if (sourceType === 'filesystem' && uploadedFiles.length === 0) {
      return;
    }

    setLoading(true);
    try {
      await onAdd(sourceName, sourceType, sourceConfig, uploadedFiles);
      // Reset form
      setStep('type');
      setSourceType('filesystem');
      setSourceName('');
      setSourceConfig({});
      setUploadedFiles([]);
    } catch (error) {
      console.error('Failed to add data source:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Data Source"
      size="lg"
    >
      <div className="space-y-6">
        {step === 'type' ? (
          <>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Select Data Source Type
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <label className={`relative flex cursor-pointer rounded-lg border p-4 ${
                  sourceType === 'filesystem' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300'
                }`}>
                  <input
                    type="radio"
                    value="filesystem"
                    checked={sourceType === 'filesystem'}
                    onChange={(e) => setSourceType(e.target.value as DataSource['type'])}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <CloudIcon className="h-5 w-5 text-gray-600 mr-3" />
                    <div>
                      <span className="block text-sm font-medium">
                        File System / Cloud Storage
                      </span>
                      <span className="block text-sm text-gray-600">
                        Upload files from your computer or cloud storage
                      </span>
                    </div>
                  </div>
                </label>

                <label className={`relative flex cursor-pointer rounded-lg border p-4 ${
                  sourceType === 'database' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300'
                }`}>
                  <input
                    type="radio"
                    value="database"
                    checked={sourceType === 'database'}
                    onChange={(e) => setSourceType(e.target.value as DataSource['type'])}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <CircleStackIcon className="h-5 w-5 text-gray-600 mr-3" />
                    <div>
                      <span className="block text-sm font-medium">
                        Database
                      </span>
                      <span className="block text-sm text-gray-600">
                        Connect to a database (Coming soon)
                      </span>
                    </div>
                  </div>
                </label>

                <label className={`relative flex cursor-pointer rounded-lg border p-4 ${
                  sourceType === 'api' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300'
                }`}>
                  <input
                    type="radio"
                    value="api"
                    checked={sourceType === 'api'}
                    onChange={(e) => setSourceType(e.target.value as DataSource['type'])}
                    className="sr-only"
                  />
                  <div className="flex items-center">
                    <GlobeAltIcon className="h-5 w-5 text-gray-600 mr-3" />
                    <div>
                      <span className="block text-sm font-medium">
                        API Endpoint
                      </span>
                      <span className="block text-sm text-gray-600">
                        Connect to REST or GraphQL APIs (Coming soon)
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={sourceType !== 'filesystem'}
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Source Name
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter a name for this data source"
              />
            </div>

            {sourceType === 'filesystem' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Upload Files
                  </h4>
                  <UnifiedFileUpload
                    onFilesProcessed={handleFilesProcessed}
                  />
                </div>

                {uploadedFiles.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Uploaded Files ({uploadedFiles.length})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <DocumentIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={handleBack}
              >
                Back
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  loading={loading}
                  disabled={!sourceName.trim() || (sourceType === 'filesystem' && uploadedFiles.length === 0)}
                >
                  Create Data Source
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}