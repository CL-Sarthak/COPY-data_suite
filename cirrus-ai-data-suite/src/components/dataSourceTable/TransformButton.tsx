import React from 'react';
import { Tooltip } from '@/components/HelpSystem';
import { DataSource } from '@/types/discovery';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';

interface TransformButtonProps {
  source: DataSource;
  transformingSource: string | null;
  transformProgress?: string;
  onTransform: (sourceId: string) => void;
}

export function TransformButton({
  source,
  transformingSource,
  transformProgress,
  onTransform,
}: TransformButtonProps) {
  const isTransforming = transformingSource === source.id;
  const isDisabled = isTransforming || source.type === 'json_transformed';

  const getTooltipText = () => {
    if (source.type === 'json_transformed') {
      return 'This source is already transformed';
    }
    if (source.hasTransformedData) {
      return 'View the transformed data catalog';
    }
    return 'Transform this data to unified JSON format';
  };

  const getButtonContent = () => {
    if (isTransforming) {
      return (
        <>
          <ArrowPathIcon className="h-3 w-3 animate-spin mr-1" />
          Processing
        </>
      );
    }
    if (source.hasTransformedData) {
      return (
        <>
          <CheckCircleIcon className="h-3 w-3 mr-1" />
          View Catalog
        </>
      );
    }
    return (
      <>
        <ArrowsRightLeftIcon className="h-3 w-3 mr-1" />
        Transform
      </>
    );
  };

  const getButtonClass = () => {
    const baseClass = 'inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors';
    if (source.type === 'json_transformed') {
      return `${baseClass} bg-gray-100 text-gray-400 cursor-not-allowed`;
    }
    if (source.hasTransformedData) {
      return `${baseClass} bg-green-100 text-green-700 hover:bg-green-200`;
    }
    return `${baseClass} bg-blue-100 text-blue-700 hover:bg-blue-200`;
  };

  if (transformProgress) {
    return (
      <div className="flex items-center space-x-2">
        <ArrowPathIcon className="h-4 w-4 text-blue-600 animate-spin" />
        <span className="text-sm text-blue-700">Processing...</span>
      </div>
    );
  }

  return (
    <Tooltip text={getTooltipText()}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTransform(source.id);
        }}
        className={getButtonClass()}
        disabled={isDisabled}
      >
        {getButtonContent()}
      </button>
    </Tooltip>
  );
}