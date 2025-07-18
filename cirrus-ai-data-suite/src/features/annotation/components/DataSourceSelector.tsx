import React from 'react';
import { DataSource } from '@/types/discovery';
import { CircleStackIcon } from '@heroicons/react/24/outline';

interface DataSourceSelectorProps {
  dataSources: DataSource[];
  selectedDataSource: DataSource | null;
  onSelect: (dataSource: DataSource) => void;
}

export function DataSourceSelector({ 
  dataSources, 
  selectedDataSource, 
  onSelect 
}: DataSourceSelectorProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Select Data Source</h3>
      <select
        value={selectedDataSource?.id || ''}
        onChange={(e) => {
          const source = dataSources.find(ds => ds.id === e.target.value);
          if (source) onSelect(source);
        }}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      >
        <option value="">Choose a data source...</option>
        {dataSources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.name} ({source.recordCount || 0} records)
          </option>
        ))}
      </select>
      
      {selectedDataSource && (
        <div className="mt-3 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center gap-2">
            <CircleStackIcon className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {selectedDataSource.type} • {selectedDataSource.recordCount?.toLocaleString() || 0} records
            </span>
          </div>
        </div>
      )}
    </div>
  );
}