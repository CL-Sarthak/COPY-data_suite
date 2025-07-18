import { useState, useEffect } from 'react';
import { DataSource } from '@/types';
import { dataSourceAPI, CreateDataSourceRequest } from '@/core/api';
import { useLoading } from '@/features/shared/hooks';

export function useDataSources() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const { isLoading: loading, startLoading, stopLoading } = useLoading();

  const loadDataSources = async () => {
    startLoading();
    setError(null);
    try {
      const data = await dataSourceAPI.getDataSources();
      setDataSources(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading data sources:', err);
    } finally {
      stopLoading();
    }
  };

  const createDataSource = async (data: { name: string; type: string; configuration: Record<string, unknown> }) => {
    try {
      // Map form data types to API types
      let mappedType: DataSource['type'];
      switch (data.type) {
        case 'azure_blob':
          mappedType = 'azure';
          break;
        case 'gcs':
          mappedType = 'gcp';
          break;
        case 'cloud_storage':
          mappedType = 's3'; // Default cloud storage to S3
          break;
        case 'file':
          mappedType = 'filesystem';
          break;
        default:
          mappedType = data.type as DataSource['type'];
      }

      const createRequest: CreateDataSourceRequest = {
        name: data.name,
        type: mappedType,
        configuration: data.configuration
      };

      const newDataSource = await dataSourceAPI.createDataSource(createRequest);
      setDataSources(prev => [...prev, newDataSource]);
      return newDataSource;
    } catch (err) {
      throw err;
    }
  };

  const updateDataSource = async (id: string, data: { name?: string; configuration?: Record<string, unknown> }) => {
    try {
      const updated = await dataSourceAPI.updateDataSource(id, data);
      setDataSources(prev => prev.map(ds => ds.id === id ? updated : ds));
      return updated;
    } catch (err) {
      throw err;
    }
  };

  const deleteDataSource = async (id: string) => {
    try {
      await dataSourceAPI.deleteDataSource(id);
      setDataSources(prev => prev.filter(ds => ds.id !== id));
    } catch (err) {
      throw err;
    }
  };


  const uploadFile = async (file: File, sourceId?: string) => {
    try {
      if (sourceId) {
        // Add file to existing data source
        const formData = new FormData();
        formData.append('file', file);
        const updated = await dataSourceAPI.addFiles(sourceId, formData);
        setDataSources(prev => prev.map(ds => ds.id === sourceId ? updated : ds));
        return updated;
      } else {
        // Create new file data source
        const newDataSource = await dataSourceAPI.createDataSource({
          name: file.name,
          type: 'filesystem',
          configuration: {
            files: [{
              name: file.name,
              type: file.type,
              size: file.size
            }]
          }
        });
        
        // Upload the file
        const formData = new FormData();
        formData.append('file', file);
        const updated = await dataSourceAPI.addFiles(newDataSource.id, formData);
        
        setDataSources(prev => [...prev, updated]);
        return updated;
      }
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    loadDataSources();
  }, []);

  return {
    dataSources,
    loading,
    error,
    refresh: loadDataSources,
    createDataSource,
    updateDataSource,
    deleteDataSource,
    uploadFile
  };
}