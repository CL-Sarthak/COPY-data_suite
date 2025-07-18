import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { DataSource } from '@/types/discovery';
import { FieldMappingInterface } from '@/components/fieldMapping/FieldMappingInterface';

interface FieldMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSource: DataSource;
}

export function FieldMappingModal({ isOpen, onClose, dataSource }: FieldMappingModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg border-2 border-gray-600 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Field Mapping - {dataSource.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <FieldMappingInterface
            sourceId={dataSource.id}
          />
        </div>
      </div>
    </div>
  );
}