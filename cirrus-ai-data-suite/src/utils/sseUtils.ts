/**
 * SSE Connection Configuration and Utilities
 * 
 * Provides standardized configuration for SSE connections to prevent
 * excessive bandwidth usage and connection buildup
 */

export const SSE_CONFIG = {
  // Connection limits
  CONNECTION_TIMEOUT: 5 * 60 * 1000,    // 5 minutes max connection time
  HEARTBEAT_INTERVAL: 60 * 1000,        // 60 seconds between heartbeats
  UPDATE_INTERVAL: 30 * 1000,           // 30 seconds between updates
  
  // Response headers with caching
  HEADERS: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
  }
} as const;

/**
 * Create a managed SSE connection with automatic timeout and cleanup
 */
export function createManagedSSEConnection(options: {
  onUpdate: () => Promise<unknown>;
  onCleanup?: () => void;
  updateInterval?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  sendInitialData?: boolean;
}) {
  const {
    onUpdate,
    onCleanup,
    updateInterval = SSE_CONFIG.UPDATE_INTERVAL,
    heartbeatInterval = SSE_CONFIG.HEARTBEAT_INTERVAL,
    connectionTimeout = SSE_CONFIG.CONNECTION_TIMEOUT,
    sendInitialData = true
  } = options;

  let updateTimer: NodeJS.Timeout | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let timeoutTimer: NodeJS.Timeout | null = null;
  let connectionClosed = false;

  const cleanup = () => {
    connectionClosed = true;
    
    if (updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
    }
    
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
    
    onCleanup?.();
    console.log('[SSE] Connection cleaned up');
  };

  const start = async (send: (data: unknown) => void) => {
    // Send initial data if requested
    if (sendInitialData) {
      try {
        const data = await onUpdate();
        send({
          type: 'update',
          data,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[SSE] Initial update failed:', error);
        send({
          type: 'error',
          message: 'Failed to load initial data',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Set up periodic updates
    updateTimer = setInterval(async () => {
      if (connectionClosed) return;
      
      try {
        const data = await onUpdate();
        send({
          type: 'update',
          data,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[SSE] Update failed:', error);
        send({
          type: 'error',
          message: 'Update failed',
          timestamp: new Date().toISOString()
        });
      }
    }, updateInterval);

    // Set up heartbeat
    heartbeatTimer = setInterval(() => {
      if (connectionClosed) return;
      
      send({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      });
    }, heartbeatInterval);

    // Set up connection timeout
    timeoutTimer = setTimeout(() => {
      console.log('[SSE] Connection timeout reached');
      send({
        type: 'connection_timeout',
        message: 'Connection closed due to timeout. Please refresh to reconnect.',
        timestamp: new Date().toISOString()
      });
      cleanup();
    }, connectionTimeout);
  };

  return {
    start,
    cleanup,
    isConnectionClosed: () => connectionClosed
  };
}