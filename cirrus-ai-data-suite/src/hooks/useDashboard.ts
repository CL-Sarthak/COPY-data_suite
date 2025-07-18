import { useState, useEffect, useCallback } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { DashboardClientService } from '@/services/dashboardClientService';
import { DashboardMetrics } from '@/types/dashboard';

interface UseDashboardResult {
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  refetch: () => Promise<void>;
}

export function useDashboard(): UseDashboardResult {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard');
      
      if (!response.ok) {
        console.warn('Dashboard API failed, using fallback data');
        const fallbackMetrics = DashboardClientService.getFallbackMetrics();
        setMetrics(fallbackMetrics);
        setError('Dashboard data unavailable in serverless environment. Functionality may be limited.');
        return;
      }
      
      const data = await response.json();
      const parsedData = DashboardClientService.parseDashboardData(data);
      setMetrics(parsedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. This may be due to serverless environment limitations.');
      const fallbackMetrics = DashboardClientService.getFallbackMetrics();
      setMetrics(fallbackMetrics);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle SSE messages
  const handleSSEMessage = useCallback((data: unknown) => {
    const messageData = data as { type: string; data?: unknown; message?: string };
    
    if (messageData.type === 'dashboard_update' && messageData.data) {
      const parsedData = DashboardClientService.parseDashboardData(messageData.data as DashboardMetrics & { recentActivity: Array<{ timestamp: string }>, environmentStatus: Array<{ lastSync: string }> });
      setMetrics(parsedData);
      setError(null);
      setLoading(false);
    } else if (messageData.type === 'error') {
      console.error('Dashboard SSE error:', messageData.message);
      setError(messageData.message || 'Failed to load dashboard data');
      setLoading(false);
    }
  }, []);

  const handleSSEError = useCallback(() => {
    console.warn('SSE connection error, falling back to manual fetch');
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSSEOpen = useCallback(() => {
    console.log('Dashboard SSE connection established');
  }, []);

  // Use SSE for real-time updates
  const { isConnected } = useSSE('dashboard', {
    url: '/api/dashboard/updates',
    onMessage: handleSSEMessage,
    onError: handleSSEError,
    onOpen: handleSSEOpen
  });

  // Initial fetch when SSE is not connected
  useEffect(() => {
    if (!isConnected) {
      fetchDashboardData();
    }
  }, [isConnected, fetchDashboardData]);

  return {
    metrics,
    loading,
    error,
    isConnected,
    refetch: fetchDashboardData
  };
}