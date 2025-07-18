import React from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { TransformationResult } from '@/types/fieldMapping';

interface TransformationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TransformationResult | null;
  transforming: boolean;
  onExport: (format: 'json' | 'csv') => void;
  onSuccessClose?: () => void;
}

export function TransformationModal({
  isOpen,
  onClose,
  result,
  transforming,
  onExport,
  onSuccessClose
}: TransformationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg border-2 border-gray-600 max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Data Transformation
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={transforming}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {transforming && !result && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Transforming data...</p>
              <p className="text-sm text-gray-500 mt-2">
                This may take a few moments for large datasets
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Summary */}
              <div className={`rounded-lg p-4 ${
                result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <ExclamationCircleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className={`font-medium ${
                      result.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {result.success ? 'Transformation Successful' : 'Transformation Failed'}
                    </h3>
                    <p className={`text-sm mt-1 ${
                      result.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {result.message || (result.success ? 'Data has been transformed and the source has been updated.' : 'Transformation failed.')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-semibold text-gray-900">
                    {result.transformedRecords}
                  </div>
                  <div className="text-sm text-gray-600">Records Transformed</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-semibold text-gray-900">
                    {result.statistics?.mappedFields || result.fieldsMapped || 0}
                  </div>
                  <div className="text-sm text-gray-600">Fields Mapped</div>
                </div>
              </div>

              {/* Errors */}
              {result.errors && result.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Errors ({result.errors.length})
                  </h4>
                  <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <ul className="space-y-1">
                      {result.errors.map((error, index) => (
                        <li key={index} className="text-sm text-red-700">
                          • {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {result.warnings && result.warnings.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Warnings ({result.warnings.length})
                  </h4>
                  <div className="bg-yellow-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <ul className="space-y-1">
                      {result.warnings.map((warning, index) => (
                        <li key={index} className="text-sm text-yellow-700">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Export Actions */}
              {result.success && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Export Transformed Data
                  </h4>
                  <div className="flex gap-3">
                    <button
                      onClick={() => onExport('json')}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Export as JSON
                    </button>
                    <button
                      onClick={() => onExport('csv')}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Export as CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {!transforming && (
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
            <button
              onClick={() => {
                if (result?.success && onSuccessClose) {
                  onSuccessClose();
                } else {
                  onClose();
                }
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}