'use client';

import { useState, useEffect, useRef } from 'react';
import { sseService, SSEOptions, SSEConnection } from '@/services/sseService';

// Export custom hook for React components
export function useSSE(id: string, options: Omit<SSEOptions, 'url'> & { url: string | null }) {
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef<SSEConnection | null>(null);

  const { url, onMessage, onError, onOpen, reconnectInterval, maxReconnectAttempts } = options;
  
  // Store callbacks in refs to avoid dependency issues
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onOpenRef = useRef(onOpen);
  
  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onOpenRef.current = onOpen;
  }, [onMessage, onError, onOpen]);

  useEffect(() => {
    if (!url) {
      return;
    }

    // Create stable callbacks that won't trigger reconnection
    const stableOnMessage = (data: unknown) => {
      onMessageRef.current?.(data);
    };

    const stableOnOpen = () => {
      setIsConnected(true);
      onOpenRef.current?.();
    };

    const stableOnError = (error: Event) => {
      setIsConnected(false);
      onErrorRef.current?.(error);
    };

    const connection = sseService.connect(id, {
      url,
      onMessage: stableOnMessage,
      onOpen: stableOnOpen,
      onError: stableOnError,
      reconnectInterval,
      maxReconnectAttempts
    });

    connectionRef.current = connection;

    return () => {
      sseService.disconnect(id);
      setIsConnected(false);
    };
  }, [id, url, reconnectInterval, maxReconnectAttempts]); // Only reconnect if id, url, or config changes

  return {
    isConnected,
    reconnect: () => connectionRef.current?.reconnect(),
    close: () => {
      connectionRef.current?.close();
      setIsConnected(false);
    }
  };
}