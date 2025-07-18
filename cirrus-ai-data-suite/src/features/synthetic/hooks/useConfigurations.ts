import { useState, useEffect, useCallback } from 'react';
import { syntheticAPI } from '@/core/api';
import { SyntheticDataConfig } from '../types';
import { useToastActions } from '@/contexts/ToastContext';

export function useConfigurations() {
  const [configs, setConfigs] = useState<SyntheticDataConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const toast = useToastActions();

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await syntheticAPI.getDatasets();
      
      // Handle the response - it should be an array
      if (Array.isArray(response)) {
        // Convert API datasets to config format
        const convertedConfigs = response.map(dataset => 
          syntheticAPI.convertApiDatasetToConfig(dataset)
        );
        
        setConfigs(convertedConfigs);
      } else {
        // If not an array, we might have gotten an error response
        console.error('Unexpected response format:', response);
        setConfigs([]);
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Failed to load configurations:', error);
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, []); // Empty dependency array - only run on mount

  const createConfig = useCallback(async (data: Parameters<typeof syntheticAPI.createDataset>[0]) => {
    try {
      const dataset = await syntheticAPI.createDataset(data);
      
      // Refresh the list
      await loadConfigs();
      
      toast.success(
        'Configuration Created',
        `Synthetic data configuration "${dataset.name}" has been created successfully.`
      );
      
      return dataset;
    } catch (error) {
      const err = error as Error;
      toast.error('Creation Failed', err.message || 'Failed to create configuration');
      throw error;
    }
  }, [loadConfigs, toast]);

  const updateConfig = useCallback(async (id: string, data: Parameters<typeof syntheticAPI.updateDataset>[1]) => {
    try {
      await syntheticAPI.updateDataset(id, data);
      
      // Refresh the list
      await loadConfigs();
      
      toast.success('Configuration Updated', 'Successfully updated configuration.');
      
    } catch (error) {
      const err = error as Error;
      toast.error('Update Failed', err.message || 'Failed to update configuration');
      throw error;
    }
  }, [loadConfigs, toast]);

  const deleteConfig = useCallback(async (id: string) => {
    try {
      await syntheticAPI.deleteDataset(id);
      
      // Update local state immediately
      setConfigs(prev => prev.filter(config => config.id !== id));
      
      toast.success('Configuration Deleted', 'The configuration has been removed.');
      
    } catch (error) {
      const err = error as Error;
      toast.error('Deletion Failed', err.message || 'Failed to delete configuration');
      throw error;
    }
  }, [toast]);

  return {
    configs,
    loading,
    error,
    refetch: loadConfigs,
    createConfig,
    updateConfig,
    deleteConfig
  };
}