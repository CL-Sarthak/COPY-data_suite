import { useState, useCallback, useEffect } from 'react';
import { dataSourceAPI } from '@/core/api';
import { DataSource } from '@/types/discovery';
import { useToastActions } from '@/contexts/ToastContext';

export function useDataSources() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const toast = useToastActions();

  const loadDataSources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const sources = await dataSourceAPI.getDataSources();
      setDataSources(sources);
    } catch (err) {
      const error = err as Error;
      setError(error);
      console.error('Failed to load data sources:', error);
      toast.error('Failed to load data sources', error.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDataSources();
  }, []); // Load on mount

  return {
    dataSources,
    loading,
    error,
    refetch: loadDataSources
  };
}