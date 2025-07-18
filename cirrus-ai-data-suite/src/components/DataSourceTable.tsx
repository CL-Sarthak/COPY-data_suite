'use client';

import React, { useEffect } from 'react';
import { DataSourceTableProps } from '@/types/dataSourceTable';
import { useDataSourceTable } from '@/hooks/useDataSourceTable';
import { DataSourceTableService } from '@/services/dataSourceTableService';
import { TagManager, TagFilter } from '@/components/TagManager';
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

// Import sub-components
import { SortHeader } from './dataSourceTable/SortHeader';
import { StatusDisplay } from './dataSourceTable/StatusDisplay';
import { TransformButton } from './dataSourceTable/TransformButton';
import { ActionButtons } from './dataSourceTable/ActionButtons';
import { DataSourceDetails } from './dataSourceTable/DataSourceDetails';
import { EmptyState } from './dataSourceTable/EmptyState';
import { LoadingState } from './dataSourceTable/LoadingState';
import { SourceTypeIcon } from './dataSourceTable/SourceTypeIcon';

export default function DataSourceTable({
  dataSources,
  loading,
  transformingSource,
  transformProgress,
  onSourceSelect,
  onTransform,
  onEdit,
  onDelete,
  onAnalyze,
  onMap,
  onAddFiles,
  onTagsUpdate,
  onProfile,
  onRefresh,
  onAskAI,
  refreshingSource,
  initialExpandedRow,
}: DataSourceTableProps) {
  const {
    sortField,
    sortDirection,
    handleSort,
    selectedTagFilters,
    setSelectedTagFilters,
    allTags,
    expandedRow,
    setExpandedRow,
    filteredAndSortedDataSources,
  } = useDataSourceTable(dataSources, initialExpandedRow);

  // Trigger source selection when initial expanded row is set
  useEffect(() => {
    if (initialExpandedRow && dataSources.length > 0) {
      const source = dataSources.find(s => s.id === initialExpandedRow);
      if (source) {
        // Always trigger selection when we have a matching source
        onSourceSelect(source);
      }
    }
  }, [initialExpandedRow, dataSources, onSourceSelect]);

  if (loading) {
    return <LoadingState />;
  }

  if (dataSources.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Tag Filter Header */}
      {allTags.length > 0 && (
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedTagFilters.length > 0 
                  ? `Showing ${filteredAndSortedDataSources.length} of ${dataSources.length} data sources`
                  : `${dataSources.length} data sources`
                }
              </span>
              {selectedTagFilters.length > 0 && (
                <button
                  onClick={() => setSelectedTagFilters([])}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear filters
                </button>
              )}
            </div>
            <TagFilter
              allTags={allTags}
              selectedTags={selectedTagFilters}
              onTagFilterChange={setSelectedTagFilters}
            />
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="pl-4 pr-2 py-3 w-8"></th>
              <SortHeader 
                field="name" 
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Name & Type
              </SortHeader>
              <SortHeader 
                field="status"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Status
              </SortHeader>
              <SortHeader 
                field="recordCount"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Records
              </SortHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <SortHeader 
                field="lastSync"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Last Activity
              </SortHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Transform
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedDataSources.map((source) => (
              <React.Fragment key={source.id}>
                <tr id={`source-row-${source.id}`} className="hover:bg-gray-50 transition-colors">
                  {/* Expand/Collapse Button */}
                  <td className="pl-4 pr-2 py-4 whitespace-nowrap">
                    <button
                      onClick={() => {
                        if (expandedRow === source.id) {
                          setExpandedRow(null);
                        } else {
                          setExpandedRow(source.id);
                          onSourceSelect(source);
                        }
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {expandedRow === source.id ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  
                  {/* Name & Type */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-3 text-gray-400">
                        <SourceTypeIcon type={source.type} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900">{source.name}</div>
                          {source.metadata && typeof source.metadata === 'object' && 'isEnhanced' in source.metadata && (source.metadata as { isEnhanced: boolean }).isEnhanced && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Enhanced
                            </span>
                          )}
                          {source.hasTransformedData && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              JSON Ready
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {DataSourceTableService.getSourceTypeLabel(source.type)}
                        </div>
                        {(source.type === 'filesystem' || source.type === 'json_transformed') && source.configuration.files && (
                          <div className="text-xs text-gray-400 mt-1">
                            {source.configuration.files.length} file{source.configuration.files.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusDisplay status={source.connectionStatus} />
                  </td>

                  {/* Records */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {source.recordCount ? source.recordCount.toLocaleString() : '-'}
                  </td>

                  {/* Tags */}
                  <td className="px-6 py-4">
                    <TagManager
                      tags={source.tags || []}
                      availableTags={allTags}
                      onTagsChange={(tags) => onTagsUpdate(source.id, tags)}
                      size="sm"
                    />
                  </td>

                  {/* Last Activity */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {DataSourceTableService.formatRelativeTime(
                      source.hasTransformedData ? source.transformedAt : source.lastSync
                    )}
                  </td>

                  {/* Transform */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <TransformButton
                      source={source}
                      transformingSource={transformingSource}
                      transformProgress={transformProgress[source.id]}
                      onTransform={onTransform}
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <ActionButtons
                      source={source}
                      onMap={onMap}
                      onAnalyze={onAnalyze}
                      onProfile={onProfile}
                      onAddFiles={onAddFiles}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onRefresh={onRefresh}
                      onAskAI={onAskAI}
                      refreshing={refreshingSource === source.id}
                    />
                  </td>
                </tr>
                
                {/* Expandable Details Row */}
                {expandedRow === source.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={8} className="p-0">
                      <div className="px-6 py-6">
                        <DataSourceDetails source={source} onAskAI={onAskAI} />
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}