import { useState, useEffect, useCallback } from 'react';
import { TransformedData } from '@/types/dataSourceTable';
import { DataSourceTableService } from '@/services/dataSourceTableService';

interface UseTransformedPreviewResult {
  previewData: TransformedData | null;
  loading: boolean;
  error: string | null;
  viewMode: 'formatted' | 'raw';
  setViewMode: (mode: 'formatted' | 'raw') => void;
  reload: () => void;
}

export function useTransformedPreview(sourceId: string): UseTransformedPreviewResult {
  const [previewData, setPreviewData] = useState<TransformedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  const loadPreviewData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First check if there's field-mapped transformed data
      console.log('Fetching data source with transformed data for:', sourceId);
      const dataSourceResponse = await fetch(`/api/data-sources/${sourceId}?includeFileContent=true`);
      if (dataSourceResponse.ok) {
        const dataSource = await dataSourceResponse.json();
        console.log('Data source response:', {
          hasTransformedData: !!dataSource.transformedData,
          hasTransformationAppliedAt: !!dataSource.transformationAppliedAt,
          transformedDataLength: dataSource.transformedData?.length
        });
        
        // Check if there's field-mapped transformed data from apply-mappings
        if (dataSource.transformedData && dataSource.transformationAppliedAt) {
          try {
            const fieldMappedData = JSON.parse(dataSource.transformedData);
            
            // If it's an array (field-mapped data), use it directly
            if (Array.isArray(fieldMappedData) && fieldMappedData.length > 0) {
              // Convert to preview format
              const previewData = {
                totalRecords: dataSource.recordCount || fieldMappedData.length,
                records: fieldMappedData.slice(0, 2), // Show first 2 records
                schema: {
                  fields: Object.keys(fieldMappedData[0]).map(name => ({
                    name,
                    type: typeof fieldMappedData[0][name]
                  }))
                }
              };
              setPreviewData(previewData);
              return;
            }
          } catch (e) {
            console.log('Failed to parse field-mapped data:', e);
            console.log('Falling back to transform endpoint');
          }
        }
      }
      
      // Fall back to regular transform endpoint
      console.log('Falling back to transform endpoint for source:', sourceId);
      try {
        const data = await DataSourceTableService.fetchTransformedPreview(sourceId);
        console.log('Transform endpoint response:', {
          totalRecords: data.totalRecords,
          recordsLength: data.records?.length
        });
        setPreviewData(data);
      } catch (transformError) {
        console.error('Transform endpoint error:', transformError);
        throw transformError;
      }
    } catch (err) {
      console.error('Error loading preview data:', err);
      setError(err instanceof Error ? err.message : 'Error loading preview data');
    } finally {
      setLoading(false);
    }
  }, [sourceId]);

  useEffect(() => {
    loadPreviewData();
  }, [loadPreviewData]);

  return {
    previewData,
    loading,
    error,
    viewMode,
    setViewMode,
    reload: loadPreviewData
  };
}