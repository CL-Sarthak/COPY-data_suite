import React from 'react';
import { Tooltip } from '@/components/HelpSystem';
import { DataSource } from '@/types/discovery';
import {
  MapIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  FolderIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface ActionButtonsProps {
  source: DataSource;
  onMap: (source: DataSource) => void;
  onAnalyze: (source: DataSource) => void;
  onProfile: (source: DataSource) => void;
  onAddFiles: (source: DataSource) => void;
  onEdit: (source: DataSource) => void;
  onDelete: (sourceId: string) => void;
  onRefresh?: (source: DataSource) => void;
  onAskAI?: (source: DataSource) => void;
  refreshing?: boolean;
}

export function ActionButtons({
  source,
  onMap,
  onAnalyze,
  onProfile,
  onAddFiles,
  onEdit,
  onDelete,
  onRefresh,
  onAskAI,
  refreshing,
}: ActionButtonsProps) {
  const handleClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className="flex items-center space-x-2">
      {onAskAI && source.hasTransformedData && (
        <Tooltip text="Ask AI about this data">
          <button
            onClick={(e) => handleClick(e, () => onAskAI(source))}
            className="text-gray-400 hover:text-blue-600 transition-colors"
          >
            <SparklesIcon className="h-4 w-4" />
          </button>
        </Tooltip>
      )}
      {source.hasTransformedData && (
        <>
          <Tooltip text="Map fields to global catalog schema">
            <button
              onClick={(e) => handleClick(e, () => onMap(source))}
              className="text-gray-400 hover:text-purple-600 transition-colors"
            >
              <MapIcon className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip text="Analyze data schema and field relationships">
            <button
              onClick={(e) => handleClick(e, () => onAnalyze(source))}
              className="text-gray-400 hover:text-blue-600 transition-colors"
            >
              <ChartBarIcon className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip text="Generate comprehensive data quality profile">
            <button
              onClick={(e) => handleClick(e, () => onProfile(source))}
              className="text-gray-400 hover:text-purple-600 transition-colors"
            >
              <ClipboardDocumentCheckIcon className="h-4 w-4" />
            </button>
          </Tooltip>
        </>
      )}
      {source.type === 'filesystem' && (
        <Tooltip text="Add additional files to this data source">
          <button
            onClick={(e) => handleClick(e, () => onAddFiles(source))}
            className="text-gray-400 hover:text-green-600 transition-colors"
          >
            <FolderIcon className="h-4 w-4" />
          </button>
        </Tooltip>
      )}
      {source.type === 'api' && onRefresh && (
        <Tooltip text="Refresh data from API">
          <button
            onClick={(e) => handleClick(e, () => onRefresh(source))}
            className={`text-gray-400 hover:text-green-600 transition-colors ${refreshing ? 'animate-spin' : ''}`}
            disabled={refreshing}
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </Tooltip>
      )}
      <Tooltip text="Edit data source name">
        <button
          onClick={(e) => handleClick(e, () => onEdit(source))}
          className="text-gray-400 hover:text-blue-600 transition-colors"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
      </Tooltip>
      <Tooltip text="Delete this data source permanently">
        <button
          onClick={(e) => handleClick(e, () => onDelete(source.id))}
          className="text-gray-400 hover:text-red-600 transition-colors"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </Tooltip>
    </div>
  );
}