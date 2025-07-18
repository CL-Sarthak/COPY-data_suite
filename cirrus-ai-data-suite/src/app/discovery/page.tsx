'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import SchemaAnalyzer from '@/components/SchemaAnalyzer';
import { FieldMappingModal } from '@/components/fieldMapping/FieldMappingModal';
import DataSourceTable from '@/components/DataSourceTable';
import DataProfilingViewer from '@/components/DataProfilingViewer';
import { HelpButton } from '@/components/HelpSystem';
import { getHelpContent } from '@/content/helpContent';
import { DataSource } from '@/types/discovery';
import { DialogProvider, useDialog } from '@/contexts/DialogContext';
import { AskAIModal } from '@/components/dataSourceTable/AskAIModal';
import { 
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

function DataDiscoveryContent() {
  const dialog = useDialog();
  const searchParams = useSearchParams();
  const sourceIdFromUrl = searchParams?.get('source') || null;
  const clustersFromUrl = searchParams?.get('clusters') || null;
  
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [transformingSource, setTransformingSource] = useState<string | null>(null);
  const [transformProgress, setTransformProgress] = useState<{ [key: string]: string }>({});
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [editingSource, setEditingSource] = useState<DataSource | null>(null);
  const [editSourceName, setEditSourceName] = useState('');
  const [analyzingSource, setAnalyzingSource] = useState<DataSource | null>(null);
  const [mappingSource, setMappingSource] = useState<DataSource | null>(null);
  const [profilingSource, setProfilingSource] = useState<DataSource | null>(null);
  const [refreshingSource, setRefreshingSource] = useState<string | null>(null);
  const [askAISource, setAskAISource] = useState<DataSource | null>(null);

  const loadDataSources = useCallback(async () => {
    try {
      const response = await fetch('/api/data-sources');
      if (response.ok) {
        const sources = await response.json();
        setDataSources(sources);
      }
    } catch (error) {
      console.error('Error loading data sources:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataSources();
  }, [loadDataSources]);

  // Handle source parameter from URL
  useEffect(() => {
    if (sourceIdFromUrl && dataSources.length > 0) {
      const source = dataSources.find(s => s.id === sourceIdFromUrl);
      if (source) {
        // Trigger source selection
        setSelectedSource(source);
        
        // Scroll to the source after a short delay to ensure the table is rendered
        setTimeout(() => {
          const element = document.getElementById(`source-row-${sourceIdFromUrl}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a highlight effect
            element.classList.add('bg-blue-50');
            setTimeout(() => {
              element.classList.remove('bg-blue-50');
            }, 3000);
          }
        }, 100);
        
        // Show cluster detection notification if clusters were detected
        if (clustersFromUrl) {
          try {
            const clusters = JSON.parse(decodeURIComponent(clustersFromUrl));
            if (clusters && clusters.length > 0) {
              dialog.showAlert({
                title: 'Cluster Patterns Detected',
                message: `Found ${clusters.length} cluster pattern${clusters.length > 1 ? 's' : ''} in the imported relational data:\n\n${clusters.map((c: { name: string; fields: string[] }) => `• ${c.name} (${c.fields.length} fields)`).join('\n')}\n\nThese patterns have been saved and can be used for redaction.`,
                type: 'success'
              });
            }
          } catch (error) {
            console.error('Failed to parse clusters from URL:', error);
          }
        }
      }
    }
  }, [sourceIdFromUrl, dataSources, clustersFromUrl, dialog]);

  const deleteDataSource = async (sourceId: string) => {
    try {
      // Find the data source to check if it's an inbound API
      const source = dataSources.find(s => s.id === sourceId);
      const isInboundApi = (source?.configuration as { type?: string })?.type === 'inbound';
      
      // Show appropriate confirmation dialog
      const message = isInboundApi 
        ? 'Are you sure you want to delete this data source?\n\n⚠️ WARNING: This is an inbound API data source. The API endpoint will remain active and new data sent to it will recreate this data source automatically. To permanently stop receiving data, delete the inbound API endpoint in the "Inbound API" section.'
        : 'Are you sure you want to delete this data source? This action cannot be undone.';
      
      const confirmed = await dialog.showConfirm({
        title: 'Delete Data Source',
        message: message,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      });

      if (!confirmed) return;

      const response = await fetch(`/api/data-sources/${sourceId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadDataSources();
        if (selectedSource?.id === sourceId) {
          setSelectedSource(null);
        }
        
        if (isInboundApi) {
          dialog.showAlert({
            title: 'Data Source Deleted',
            message: 'The data source has been deleted. Remember that the API endpoint is still active - new data will recreate this source.',
            type: 'success'
          });
        }
      } else {
        console.error('Failed to delete data source');
      }
    } catch (error) {
      console.error('Error deleting data source:', error);
    }
  };

  const refreshApiDataSource = async (source: DataSource) => {
    if (source.type !== 'api') return;
    
    try {
      setRefreshingSource(source.id);
      
      // Use the dedicated refresh endpoint
      const refreshResponse = await fetch(`/api/data-sources/${source.id}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!refreshResponse.ok) {
        const error = await refreshResponse.json();
        throw new Error(error.error || 'Failed to refresh API data');
      }
      
      const result = await refreshResponse.json();
      
      // Trigger transformation after refresh with cache-busting
      await fetch(`/api/data-sources/${source.id}/transform?skipPagination=true&_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      // Small delay to ensure backend updates are complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await loadDataSources();
      
      dialog.showAlert({
        title: 'Success',
        message: result.message || `Refreshed ${result.recordCount} records from API.`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error refreshing API data:', error);
      dialog.showAlert({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to refresh API data.',
        type: 'error'
      });
    } finally {
      setRefreshingSource(null);
    }
  };

  const updateDataSourceTags = async (sourceId: string, tags: string[]) => {
    try {
      const response = await fetch(`/api/data-sources/${sourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: JSON.stringify(tags) })
      });

      if (response.ok) {
        setDataSources(dataSources.map(source => 
          source.id === sourceId ? { ...source, tags } : source
        ));
        if (selectedSource?.id === sourceId) {
          setSelectedSource({ ...selectedSource, tags });
        }
      } else {
        console.error('Failed to update data source tags');
        await loadDataSources();
      }
    } catch (error) {
      console.error('Error updating data source tags:', error);
      await loadDataSources();
    }
  };

  const transformDataSource = async (sourceId: string) => {
    setTransformingSource(sourceId);
    
    setTransformProgress(prev => ({
      ...prev,
      [sourceId]: 'Initializing transformation...'
    }));
    
    try {
      setTransformProgress(prev => ({
        ...prev,
        [sourceId]: 'Reading data source...'
      }));
      
      const fullTransformResponse = await fetch(`/api/data-sources/${sourceId}/transform?skipPagination=true`);
      
      if (fullTransformResponse.ok) {
        const fullCatalog = await fullTransformResponse.json();
        
        setTransformProgress(prev => ({
          ...prev,
          [sourceId]: 'Saving transformed data...'
        }));
        
        const catalogMetadata = {
          ...fullCatalog,
          records: [],
          savedRecordCount: fullCatalog.totalRecords,
          metadata: {
            ...fullCatalog.metadata,
            recordsNotStored: true
          }
        };
        
        await fetch(`/api/data-sources/${sourceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transformedData: JSON.stringify(catalogMetadata),
            hasTransformedData: true,
            transformedAt: new Date(),
            recordCount: fullCatalog.totalRecords
          })
        });
      }
      
      const response = await fetch(`/api/data-sources/${sourceId}/transform?pageSize=1000`);
      
      setTransformProgress(prev => ({
        ...prev,
        [sourceId]: 'Processing data...'
      }));
      
      if (response.ok) {
        const catalog = await response.json();
        
        setTransformProgress(prev => ({
          ...prev,
          [sourceId]: `Transformed ${catalog.totalRecords} records`
        }));
        
        // Reload data sources to show the transformed state
        await loadDataSources();
        
        setTimeout(() => {
          setTransformProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[sourceId];
            return newProgress;
          });
        }, 3000);
      } else {
        console.error('Failed to transform data source');
      }
    } catch (error) {
      console.error('Error transforming data source:', error);
    } finally {
      setTransformingSource(null);
    }
  };

  const handleEditSave = async () => {
    if (!editingSource) return;

    try {
      const response = await fetch(`/api/data-sources/${editingSource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editSourceName })
      });

      if (response.ok) {
        await loadDataSources();
        setEditingSource(null);
        setEditSourceName('');
      } else {
        console.error('Failed to update data source');
      }
    } catch (error) {
      console.error('Error updating data source:', error);
    }
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Data Discovery</h1>
                <p className="text-gray-600 mt-1">View and analyze your connected data sources</p>
              </div>
              <HelpButton 
                content={getHelpContent('discovery')} 
                className="ml-2"
              />
            </div>
          </div>

          {/* Vercel Environment Warning */}
          {(process.env.VERCEL || process.env.VERCEL_URL) && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <ExclamationCircleIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">
                    Vercel Deployment Environment
                  </h3>
                  <p className="text-sm text-blue-700">
                    Maximum file size: 4MB • Text content up to 100KB preview • 
                    Optimized for Vercel&apos;s serverless function limits.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Data Sources Table */}
          <div className="mb-8">
            <DataSourceTable
              key={sourceIdFromUrl || 'default'}
              dataSources={dataSources}
              loading={loading}
              transformingSource={transformingSource}
              transformProgress={transformProgress}
              onSourceSelect={setSelectedSource}
              onTransform={transformDataSource}
              onEdit={(source) => {
                setEditingSource(source);
                setEditSourceName(source.name);
              }}
              onDelete={deleteDataSource}
              onAnalyze={setAnalyzingSource}
              onMap={setMappingSource}
              onAddFiles={() => {
                dialog.showAlert({
                  title: 'Add Files',
                  message: 'Please use the File Upload page to add new files.',
                  type: 'info'
                });
              }}
              onTagsUpdate={updateDataSourceTags}
              onProfile={setProfilingSource}
              onRefresh={refreshApiDataSource}
              onAskAI={setAskAISource}
              refreshingSource={refreshingSource}
              initialExpandedRow={sourceIdFromUrl}
            />
          </div>


          {/* Edit Source Name Modal */}
          {editingSource && (
            <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => {
              setEditingSource(null);
              setEditSourceName('');
            }}>
              <div className="bg-white rounded-lg border-2 border-gray-600 p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Data Source</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editSourceName}
                    onChange={(e) => setEditSourceName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditingSource(null);
                      setEditSourceName('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditSave}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Schema Analyzer Modal */}
          {analyzingSource && (
            <SchemaAnalyzer
              dataSourceId={analyzingSource.id}
              dataSourceName={analyzingSource.name}
              onClose={() => setAnalyzingSource(null)}
            />
          )}

          {/* Field Mapping Modal */}
          {mappingSource && (
            <FieldMappingModal
              sourceId={mappingSource.id}
              sourceName={mappingSource.name}
              onClose={() => setMappingSource(null)}
              onMappingsChanged={() => {
                // Just reload data sources without closing the modal
                loadDataSources();
              }}
              onTransformSuccess={() => {
                // Close modal and refresh data sources
                setMappingSource(null);
                loadDataSources();
              }}
            />
          )}

          {/* Data Profiling Modal */}
          {profilingSource && (
            <DataProfilingViewer
              sourceId={profilingSource.id}
              onClose={() => setProfilingSource(null)}
            />
          )}
          
          {/* Ask AI Modal */}
          {askAISource && (
            <AskAIModal
              isOpen={!!askAISource}
              onClose={() => setAskAISource(null)}
              dataSource={askAISource}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function DataDiscovery() {
  return (
    <DialogProvider>
      <DataDiscoveryContent />
    </DialogProvider>
  );
}