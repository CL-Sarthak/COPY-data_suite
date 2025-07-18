import React from 'react';
import { XMarkIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import LLMIndicator from '@/components/LLMIndicator';

interface EnhancementModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSourceName: string;
  children: React.ReactNode;
}

export function EnhancementModal({ 
  isOpen, 
  onClose, 
  dataSourceName, 
  children 
}: EnhancementModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl border-2 border-gray-600 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DocumentPlusIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Dataset Enhancement</h3>
              <p className="text-sm text-gray-600">{dataSourceName}</p>
            </div>
            <LLMIndicator feature="datasetEnhancement" className="ml-4" />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}