import { useState, useCallback, useEffect } from 'react';
import { patternAPI } from '@/core/api';
import type { MLStatusResponse } from '@/core/api/endpoints/pattern.api';

export function useMLStatus() {
  const [mlStatus, setMLStatus] = useState<MLStatusResponse>({
    isAvailable: false,
    isConfigured: false
  });
  const [loading, setLoading] = useState(true);

  const loadMLStatus = useCallback(async () => {
    try {
      setLoading(true);
      const status = await patternAPI.getMLStatus();
      setMLStatus(status);
    } catch (error) {
      console.error('Error loading ML status:', error);
      // Default to unavailable on error
      setMLStatus({
        isAvailable: false,
        isConfigured: false
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMLStatus();
  }, [loadMLStatus]);

  return {
    mlStatus,
    loading,
    reload: loadMLStatus
  };
}