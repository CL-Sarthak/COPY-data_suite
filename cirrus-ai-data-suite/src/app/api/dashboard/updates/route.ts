import { NextRequest } from 'next/server';
import { DashboardService } from '@/services/dashboardService';
import { createSSEResponse } from '@/services/sseService';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  return createSSEResponse(async (send) => {
    const CONNECTION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    const UPDATE_INTERVAL = 30 * 1000; // 30 seconds
    const HEARTBEAT_INTERVAL = 60 * 1000; // 60 seconds (reduced from 15s)
    
    // eslint-disable-next-line prefer-const
    let connectionTimer: NodeJS.Timeout | undefined;
    let updateInterval: NodeJS.Timeout | undefined;
    // eslint-disable-next-line prefer-const
    let heartbeatInterval: NodeJS.Timeout | undefined;
    let connectionClosed = false;

    // Send initial dashboard data
    try {
      const initialData = await DashboardService.getDashboardMetrics();
      send({
        type: 'dashboard_update',
        data: initialData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get initial dashboard data:', error);
      send({
        type: 'error',
        message: 'Failed to load dashboard data',
        timestamp: new Date().toISOString()
      });
    }

    // Set up periodic updates
    // eslint-disable-next-line prefer-const
    updateInterval = setInterval(async () => {
      if (connectionClosed) return;
      
      try {
        const data = await DashboardService.getDashboardMetrics();
        send({
          type: 'dashboard_update',
          data,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to get dashboard data:', error);
        send({
          type: 'error',
          message: 'Failed to update dashboard data',
          timestamp: new Date().toISOString()
        });
      }
    }, UPDATE_INTERVAL);

    // Cleanup function
    const cleanup = () => {
      connectionClosed = true;
      clearInterval(updateInterval);
      clearInterval(heartbeatInterval);
      clearTimeout(connectionTimer);
      console.log('[SSE] Dashboard connection closed and cleaned up');
    };

    // Keep connection alive with heartbeat (less frequent)
    heartbeatInterval = setInterval(() => {
      if (connectionClosed) return;
      
      send({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      });
    }, HEARTBEAT_INTERVAL);

    // Auto-close connection after timeout
    connectionTimer = setTimeout(() => {
      console.log('[SSE] Dashboard connection timeout - closing');
      send({
        type: 'connection_timeout',
        message: 'Connection closed due to timeout. Please refresh to reconnect.',
        timestamp: new Date().toISOString()
      });
      cleanup();
    }, CONNECTION_TIMEOUT);

    // Handle connection cleanup on abort
    if (typeof _request.signal !== 'undefined') {
      _request.signal.addEventListener('abort', cleanup);
    }

    // Keep the connection open until timeout or abort
    return new Promise((resolve) => {
      // Set up cleanup to resolve the promise
      const checkInterval = setInterval(() => {
        if (connectionClosed) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });
  });
}