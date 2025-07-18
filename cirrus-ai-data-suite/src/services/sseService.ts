/**
 * Server-Sent Events (SSE) Service
 * Provides centralized SSE connection management with automatic reconnection
 */

export interface SSEOptions {
  url: string;
  onMessage: (data: unknown) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface SSEConnection {
  close: () => void;
  reconnect: () => void;
  getState: () => EventSource['readyState'];
}

export class SSEService {
  private connections: Map<string, EventSource> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();

  /**
   * Create a new SSE connection
   */
  connect(id: string, options: SSEOptions): SSEConnection {
    // Check if connection already exists and is open
    const existingConnection = this.connections.get(id);
    if (existingConnection && existingConnection.readyState === EventSource.OPEN) {
      console.log(`[SSE] Connection already exists and is open: ${id}`);
      return {
        close: () => this.disconnect(id),
        reconnect: () => {
          this.disconnect(id);
          return this.connect(id, options);
        },
        getState: () => existingConnection.readyState
      };
    }

    // Close existing connection if any
    this.disconnect(id);

    const {
      url,
      onMessage,
      onError,
      onOpen,
      reconnectInterval = 5000,
      maxReconnectAttempts = 10
    } = options;

    const createConnection = () => {
      console.log(`[SSE] Creating new connection: ${id} to ${url}`);
      
      const eventSource = new EventSource(url);
      this.connections.set(id, eventSource);

      eventSource.onopen = () => {
        console.log(`[SSE] Connection opened: ${id}`);
        this.reconnectAttempts.set(id, 0);
        onOpen?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error(`[SSE] Failed to parse message for ${id}:`, error);
          console.error(`[SSE] Raw data:`, event.data);
          onMessage(event.data); // Pass raw data if JSON parsing fails
        }
      };

      eventSource.onerror = (error) => {
        console.error(`[SSE] Connection error for ${id}:`, error);
        onError?.(error);

        // Only attempt to reconnect if the connection is actually closed
        if (eventSource.readyState === EventSource.CLOSED) {
          // Attempt to reconnect
          const attempts = this.reconnectAttempts.get(id) || 0;
          if (attempts < maxReconnectAttempts) {
            console.log(`[SSE] Attempting reconnection ${attempts + 1}/${maxReconnectAttempts} for ${id}`);
            this.reconnectAttempts.set(id, attempts + 1);
            
            // Clear existing timer
            const existingTimer = this.reconnectTimers.get(id);
            if (existingTimer) {
              clearTimeout(existingTimer);
            }

            // Set reconnection timer with exponential backoff
            const backoffDelay = Math.min(reconnectInterval * Math.pow(2, attempts), 60000); // Max 60s
            const timer = setTimeout(() => {
              // Check if connection was not manually closed
              if (this.connections.has(id)) {
                createConnection();
              }
            }, backoffDelay);
            this.reconnectTimers.set(id, timer);
          } else {
            console.error(`[SSE] Max reconnection attempts reached for ${id}`);
            this.disconnect(id);
          }
        }
      };
    };

    createConnection();

    return {
      close: () => this.disconnect(id),
      reconnect: () => {
        this.reconnectAttempts.set(id, 0);
        createConnection();
      },
      getState: () => {
        const connection = this.connections.get(id);
        return connection ? connection.readyState : EventSource.CLOSED;
      }
    };
  }

  /**
   * Disconnect a specific SSE connection
   */
  disconnect(id: string): void {
    const connection = this.connections.get(id);
    if (connection) {
      console.log(`[SSE] Closing connection: ${id}`);
      connection.close();
      this.connections.delete(id);
    }

    const timer = this.reconnectTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(id);
    }

    this.reconnectAttempts.delete(id);
  }

  /**
   * Disconnect all SSE connections
   */
  disconnectAll(): void {
    console.log('[SSE] Closing all connections');
    this.connections.forEach((connection) => {
      connection.close();
    });
    this.connections.clear();
    
    this.reconnectTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.reconnectTimers.clear();
    
    this.reconnectAttempts.clear();
  }

  /**
   * Get the state of all connections
   */
  getConnectionStates(): Record<string, EventSource['readyState']> {
    const states: Record<string, EventSource['readyState']> = {};
    this.connections.forEach((connection, id) => {
      states[id] = connection.readyState;
    });
    return states;
  }

  /**
   * Check if a connection is active
   */
  isConnected(id: string): boolean {
    const connection = this.connections.get(id);
    return connection ? connection.readyState === EventSource.OPEN : false;
  }
}

// Export singleton instance
export const sseService = new SSEService();

// Helper to create typed SSE endpoints
export function createSSEResponse(
  stream: (send: (data: unknown) => void) => Promise<void> | void
): Response {
  const encoder = new TextEncoder();
  
  const customStream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // Send initial connection message
        send({ type: 'connected', timestamp: new Date().toISOString() });
        
        // Run the stream function
        await stream(send);
      } catch (error) {
        console.error('[SSE] Stream error:', error);
        send({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
        controller.close();
      }
    },
    cancel() {
      console.log('[SSE] Stream cancelled');
    }
  });

  return new Response(customStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}