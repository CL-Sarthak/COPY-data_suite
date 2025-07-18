import React, { useState } from 'react';
import { DocumentPlusIcon } from '@heroicons/react/24/outline';
import { DataSource } from '@/types/discovery';
import { useDataSources } from '../../hooks/useDataSources';
import { Panel, LoadingState, ErrorState, EmptyState } from '@/features/shared/components';
import { EnhancementModal } from './EnhancementModal';

interface EnhancementResult {
  success: boolean;
  enhancedRecords: Record<string, unknown>[];
  enhancementStats: {
    originalRecords: number;
    enhancedRecords: number;
    originalFields: number;
    addedFields: number;
    totalFields: number;
    fieldsAdded: Array<{
      name: string;
      type: string;
      description: string;
    }>;
  };
  enhancementName: string;
  timestamp: string;
}

export function DatasetEnhancementPanel() {
  const { dataSources, loading, error, refetch } = useDataSources();
  const [showEnhancementModal, setShowEnhancementModal] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);

  const handleStartEnhancement = (dataSource: DataSource) => {
    setSelectedDataSource(dataSource);
    setShowEnhancementModal(true);
  };

  const handleEnhancementComplete = async (result: EnhancementResult) => {
    console.log('Enhancement complete:', result);
    // TODO: Handle the enhanced data (e.g., create a new synthetic dataset)
    setShowEnhancementModal(false);
    setSelectedDataSource(null);
  };

  if (loading) {
    return (
      <Panel title="Dataset Enhancement">
        <LoadingState message="Loading data sources..." />
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel 
        title="Dataset Enhancement" 
        action={
          <button
            onClick={refetch}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Retry
          </button>
        }
      >
        <ErrorState error={error} onRetry={refetch} />
      </Panel>
    );
  }

  if (dataSources.length === 0) {
    return (
      <Panel title="Dataset Enhancement">
        <EmptyState
          title="No data sources available"
          description="Upload data sources in the Discovery section to enhance them with synthetic data"
          icon={<DocumentPlusIcon className="h-12 w-12 text-gray-400" />}
        />
      </Panel>
    );
  }

  return (
    <>
      <Panel 
        title="Dataset Enhancement" 
        description="Enhance existing datasets with additional synthetic fields"
      >
        <div className="space-y-4">
          {dataSources.map((dataSource) => (
            <div
              key={dataSource.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{dataSource.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {dataSource.configuration.files?.length || 0} file{(dataSource.configuration.files?.length || 0) !== 1 ? 's' : ''}
                    {dataSource.recordCount && (
                      <span> • {dataSource.recordCount.toLocaleString()} records</span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleStartEnhancement(dataSource)}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <DocumentPlusIcon className="h-4 w-4" />
                Enhance Dataset
              </button>
            </div>
          ))}
        </div>
      </Panel>

      {/* Enhancement Modal */}
      {showEnhancementModal && selectedDataSource && (
        <EnhancementModal
          isOpen={showEnhancementModal}
          onClose={() => {
            setShowEnhancementModal(false);
            setSelectedDataSource(null);
          }}
          dataSource={selectedDataSource}
          onEnhancementComplete={handleEnhancementComplete}
        />
      )}
    </>
  );
}