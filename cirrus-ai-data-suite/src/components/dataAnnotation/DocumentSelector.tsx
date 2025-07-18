import React from 'react';
import { FileData } from '@/types';

interface DocumentSelectorProps {
  data: FileData[];
  currentIndex: number;
  onSelectDocument: (index: number) => void;
}

export function DocumentSelector({ data, currentIndex, onSelectDocument }: DocumentSelectorProps) {
  return (
    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
      <h4 className="text-sm font-medium text-blue-900 mb-2">Select Document:</h4>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {data.map((file, index) => (
          <button
            key={file.id}
            onClick={() => onSelectDocument(index)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              index === currentIndex
                ? 'bg-blue-600 text-white font-medium'
                : 'bg-white text-blue-900 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="truncate flex-1 mr-2">{file.name}</span>
              <span className="text-xs opacity-75">
                {(file.size / 1024).toFixed(1)}KB
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}