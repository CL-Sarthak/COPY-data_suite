import React from 'react';
import { DataSource } from '@/types/discovery';
import { 
  TrashIcon, 
  PlayIcon, 
  ChartBarIcon, 
  MapIcon, 
  ClipboardDocumentCheckIcon,
  PencilIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { formatBytes } from '@/utils/fileUtils';
import { EmptyState } from '@/features/shared/components';
import { CircleStackIcon } from '@heroicons/react/24/outline';

interface DataSourceTableProps {
  dataSources: DataSource[];
  onTransform: (source: DataSource) => void;
  onAnalyze: (source: DataSource) => void;
  onMapping: (source: DataSource) => void;
  onProfile: (source: DataSource) => void;
  onEdit: (source: DataSource) => void;
  onAddFiles: (source: DataSource) => void;
  onDelete: (source: DataSource) => void;
  transformingSource: string | null;
  transformProgress: { [key: string]: string };
}

export function DataSourceTable({
  dataSources,
  onTransform,
  onAnalyze,
  onMapping,
  onProfile,
  onEdit,
  onAddFiles,
  onDelete,
  transformingSource,
  transformProgress
}: DataSourceTableProps) {
  if (dataSources.length === 0) {
    return (
      <EmptyState
        icon={<CircleStackIcon />}
        title="No data sources yet"
        description="Add your first data source to start discovering and transforming your data"
      />
    );
  }

  const getTotalSize = (source: DataSource): number => {
    const files = source.configuration.files as Array<{ size: number }> | undefined;
    if (!files) return 0;
    return files.reduce((total, file) => total + (file.size || 0), 0);
  };

  const getFileCount = (source: DataSource): number => {
    const files = source.configuration.files as Array<{ name: string; size: number }> | undefined;
    return files?.length || 0;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Files
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Size
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Records
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {dataSources.map((source) => (
            <tr key={source.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{source.name}</div>
                {source.tags && source.tags.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {source.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {source.type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {getFileCount(source)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatBytes(getTotalSize(source))}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {source.recordCount?.toLocaleString() || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-1">
                  {transformingSource === source.id && transformProgress[source.id] && (
                    <span className="text-xs text-gray-500">
                      {transformProgress[source.id]}
                    </span>
                  )}
                  
                  <button
                    onClick={() => onTransform(source)}
                    disabled={transformingSource === source.id}
                    className={`text-gray-400 hover:text-green-600 transition-colors ${
                      transformingSource === source.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    title="Transform data to unified catalog format"
                  >
                    {transformingSource === source.id ? (
                      <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
                    ) : (
                      <PlayIcon className="h-4 w-4" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => onAnalyze(source)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    title="Analyze data schema structure"
                  >
                    <ChartBarIcon className="h-4 w-4" />
                  </button>
                  
                  {source.hasTransformedData && (
                    <button
                      onClick={() => onMapping(source)}
                      className="text-gray-400 hover:text-indigo-600 transition-colors"
                      title="Map fields to unified catalog"
                    >
                      <MapIcon className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => onProfile(source)}
                    className="text-gray-400 hover:text-purple-600 transition-colors"
                    title="Generate comprehensive data quality profile"
                  >
                    <ClipboardDocumentCheckIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => onEdit(source)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit data source name"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  
                  {source.type === 'filesystem' && (
                    <button
                      onClick={() => onAddFiles(source)}
                      className="text-gray-400 hover:text-green-600 transition-colors"
                      title="Add additional files to this data source"
                    >
                      <FolderIcon className="h-4 w-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => onDelete(source)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete this data source permanently"
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
  );
}