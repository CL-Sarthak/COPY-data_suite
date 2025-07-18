import { useState, useCallback, useEffect } from 'react';
import { dataSourceAPI } from '@/core/api';
import { DataSource } from '@/types/discovery';
import { ProcessedFile } from '../types';
import { useToastActions } from '@/contexts/ToastContext';
import { useDialog } from '@/contexts/DialogContext';

export function useDataSources() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [transformingSource, setTransformingSource] = useState<string | null>(null);
  const [transformProgress, setTransformProgress] = useState<{ [key: string]: string }>({});
  const toast = useToastActions();
  const dialog = useDialog();

  const loadDataSources = useCallback(async () => {
    try {
      setLoading(true);
      const sources = await dataSourceAPI.getDataSources();
      setDataSources(sources);
    } catch (error) {
      console.error('Error loading data sources:', error);
      toast.error('Failed to load data sources');
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array - toast is stable enough

  // Load data sources on mount only
  useEffect(() => {
    loadDataSources();
  }, []); // Empty dependency array to run only once

  const createDataSource = useCallback(async (
    name: string,
    type: DataSource['type'],
    config: Record<string, unknown>,
    files: ProcessedFile[]
  ) => {
    try {
      const response = await dataSourceAPI.createDataSource({
        name,
        type,
        configuration: {
          ...config,
          files: files.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size,
            content: file.content,
            contentTruncated: file.contentTruncated,
            originalContentLength: file.originalContentLength,
            storageKey: file.storageKey
          }))
        }
      });

      setDataSources(prev => [...prev, response]);
      toast.success(`Data source "${name}" created successfully`);
      return response;
    } catch (error) {
      console.error('Error creating data source:', error);
      toast.error('Failed to create data source');
      throw error;
    }
  }, []); // Remove toast dependency

  const updateDataSource = useCallback(async (id: string, updates: Partial<DataSource>) => {
    try {
      const response = await dataSourceAPI.updateDataSource(id, updates);
      setDataSources(prev => prev.map(source => 
        source.id === id ? response : source
      ));
      toast.success('Data source updated successfully');
      return response;
    } catch (error) {
      console.error('Error updating data source:', error);
      toast.error('Failed to update data source');
      throw error;
    }
  }, []); // Remove toast dependency

  const deleteDataSource = useCallback(async (source: DataSource) => {
    const confirmed = await dialog.showConfirm({
      title: 'Delete Data Source',
      message: `Are you sure you want to delete "${source.name}"? This action cannot be undone.`,
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      await dataSourceAPI.deleteDataSource(source.id);
      setDataSources(prev => prev.filter(s => s.id !== source.id));
      toast.success(`Data source "${source.name}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting data source:', error);
      toast.error('Failed to delete data source');
    }
  }, []); // Remove dependencies

  const transformDataSource = useCallback(async (
    source: DataSource,
    onProgress?: (message: string) => void
  ) => {
    try {
      setTransformingSource(source.id);
      setTransformProgress(prev => ({ ...prev, [source.id]: 'Starting transformation...' }));
      
      if (onProgress) {
        onProgress('Starting transformation...');
      }

      const catalog = await dataSourceAPI.transformDataSource(source.id);
      
      setTransformProgress(prev => ({ ...prev, [source.id]: 'Transformation complete!' }));
      if (onProgress) {
        onProgress('Transformation complete!');
      }

      toast.success(`Data source "${source.name}" transformed successfully`);
      return catalog;
    } catch (error) {
      console.error('Error transforming data source:', error);
      toast.error('Failed to transform data source');
      throw error;
    } finally {
      setTransformingSource(null);
      // Clear progress after a delay
      setTimeout(() => {
        setTransformProgress(prev => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [source.id]: removed, ...rest } = prev;
          return rest;
        });
      }, 2000);
    }
  }, []); // Remove toast dependency

  const addFilesToDataSource = useCallback(async (
    sourceId: string,
    files: FormData
  ) => {
    try {
      const response = await dataSourceAPI.addFiles(sourceId, files);
      setDataSources(prev => prev.map(source => 
        source.id === sourceId ? response : source
      ));
      toast.success('Files added successfully');
      return response;
    } catch (error) {
      console.error('Error adding files:', error);
      toast.error('Failed to add files');
      throw error;
    }
  }, []); // Remove toast dependency

  return {
    dataSources,
    loading,
    transformingSource,
    transformProgress,
    actions: {
      reload: loadDataSources,
      create: createDataSource,
      update: updateDataSource,
      delete: deleteDataSource,
      transform: transformDataSource,
      addFiles: addFilesToDataSource
    }
  };
}