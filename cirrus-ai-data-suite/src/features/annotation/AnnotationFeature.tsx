import React from 'react';
import { Panel, LoadingState, ErrorState, EmptyState } from '@/features/shared/components';
import { DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { DataSourceSelector } from './components/DataSourceSelector';
import { DataAnnotation } from './components/DataAnnotation';
import { PatternDetectionPanel } from './components/PatternDetectionPanel';
import { Pagination } from './components/Pagination';
import { useAnnotation } from './hooks/useAnnotation';

export function AnnotationFeature() {
  const {
    dataSources,
    patterns,
    selectedDataSource,
    annotationData,
    detectedPatterns,
    currentPage,
    isLoading,
    error,
    selectDataSource,
    changePage,
    detectPatternsWithML,
    savePatterns,
    refresh
  } = useAnnotation();

  if (isLoading && !annotationData) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        <LoadingState message="Loading annotation data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        <ErrorState 
          error={error ? new Error(error) : null} 
          onRetry={refresh}
          message="Failed to load annotation data" 
        />
      </div>
    );
  }

  const totalPages = annotationData 
    ? Math.ceil(annotationData.totalRecords / annotationData.pageSize)
    : 0;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Data Annotation</h1>
        <p className="text-gray-600 mt-1">
          Annotate sensitive data patterns in your datasets
        </p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="lg:col-span-3">
          <DataSourceSelector
            dataSources={dataSources}
            selectedDataSource={selectedDataSource}
            onSelect={selectDataSource}
          />
        </div>
        <div>
          <PatternDetectionPanel
            detectedPatterns={detectedPatterns}
            onDetect={async () => {
              await detectPatternsWithML();
            }}
            onSave={savePatterns}
          />
        </div>
      </div>

      {/* Data Table */}
      <Panel title="Data Preview" noPadding>
        {annotationData ? (
          <>
            <DataAnnotation 
              data={annotationData} 
              patterns={patterns}
            />
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={changePage}
              />
            )}
          </>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={<DocumentMagnifyingGlassIcon />}
              title="No data source selected"
              description="Select a data source above to start annotating"
            />
          </div>
        )}
      </Panel>
    </div>
  );
}