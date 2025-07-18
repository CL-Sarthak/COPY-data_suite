import React, { useState, useEffect } from 'react';
import { Modal, LoadingState, ErrorState } from '@/features/shared/components';
import { syntheticAPI } from '@/core/api';
import { PreviewData } from '../../types';

interface PreviewDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  configId: string;
}

export function PreviewDataModal({ isOpen, onClose, configId }: PreviewDataModalProps) {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isOpen && configId) {
      loadPreviewData();
    }
  }, [isOpen, configId]);

  const loadPreviewData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await syntheticAPI.previewData(configId);
      setPreviewData(data);
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Failed to load preview data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Synthetic Data Preview"
      size="xl"
      className="sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl"
    >
      <div className="space-y-6">
        {loading ? (
          <LoadingState message="Generating preview data..." />
        ) : error ? (
          <ErrorState 
            error={error}
            title="Failed to generate preview"
            onRetry={loadPreviewData}
          />
        ) : previewData ? (
          <>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900">{previewData.dataset.name}</h4>
              <p className="text-sm text-gray-600">
                Showing 5 sample records from {previewData.dataset.recordCount.toLocaleString()} total records
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {previewData.records.length > 0 && 
                        Object.keys(previewData.records[0]).map((field) => (
                          <th 
                            key={field} 
                            className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {field}
                          </th>
                        ))
                      }
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.records.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {Object.values(record).map((value, i) => (
                          <td key={i} className="px-6 py-4 text-sm text-gray-900">
                            <div className="max-w-xs truncate" title={typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}>
                              {typeof value === 'object' && value !== null 
                                ? JSON.stringify(value)
                                : String(value)
                              }
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                This is a preview of the synthetic data. The actual generation will create the full dataset 
                with all {previewData.dataset.recordCount.toLocaleString()} records.
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No preview data available
          </div>
        )}
      </div>
    </Modal>
  );
}