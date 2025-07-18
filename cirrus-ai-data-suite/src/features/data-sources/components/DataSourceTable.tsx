import React from 'react';
import { DataSource } from '@/types';
import { 
  CircleStackIcon, 
  CloudIcon, 
  DocumentIcon,
  GlobeAltIcon,
  PencilIcon,
  TrashIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { EmptyState } from '@/features/shared/components';

interface DataSourceTableProps {
  dataSources: DataSource[];
  onEdit: (dataSource: DataSource) => void;
  onDelete: (dataSource: DataSource) => void;
  onTest?: (dataSource: DataSource) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  file: <DocumentIcon className="h-5 w-5" />,
  database: <CircleStackIcon className="h-5 w-5" />,
  api: <GlobeAltIcon className="h-5 w-5" />,
  cloud_storage: <CloudIcon className="h-5 w-5" />,
  s3: <CloudIcon className="h-5 w-5" />,
  azure_blob: <CloudIcon className="h-5 w-5" />,
  gcs: <CloudIcon className="h-5 w-5" />
};

export function DataSourceTable({ 
  dataSources, 
  onEdit, 
  onDelete, 
  onTest 
}: DataSourceTableProps) {
  if (dataSources.length === 0) {
    return (
      <EmptyState
        icon={<CircleStackIcon />}
        title="No data sources"
        description="Connect your first data source to start working with your data"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Source
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Records
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Updated
            </th>
            <th className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {dataSources.map((source) => (
            <tr key={source.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 rounded-lg">
                    {typeIcons[source.type] || <CircleStackIcon className="h-5 w-5" />}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{source.name}</div>
                    {source.configuration?.database && (
                      <div className="text-sm text-gray-500">{source.configuration.database}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 capitalize">
                  {source.type.replace('_', ' ')}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  source.connectionStatus === 'connected' 
                    ? 'bg-green-100 text-green-800' 
                    : source.connectionStatus === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {source.connectionStatus}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {source.recordCount?.toLocaleString() || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {source.lastSync ? new Date(source.lastSync).toLocaleDateString() : 'Never'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  {onTest && (
                    <button
                      onClick={() => onTest(source)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Test Connection"
                    >
                      <BeakerIcon className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(source)}
                    className="text-indigo-600 hover:text-indigo-900"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(source)}
                    className="text-red-600 hover:text-red-900"
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
  );
}