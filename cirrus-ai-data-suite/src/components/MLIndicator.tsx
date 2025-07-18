'use client';

import React, { useEffect, useState } from 'react';
import { useSSE } from '@/hooks/useSSE';

interface MLStatus {
  configured: boolean;
  provider: string;
  hasApiKey: boolean;
  message: string;
}

interface MLIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export default function MLIndicator({ 
  className = '',
  showDetails = false 
}: MLIndicatorProps) {
  const [status, setStatus] = useState<MLStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Use SSE for real-time ML status updates
  const { isConnected } = useSSE('ml-status', {
    url: '/api/ml/status/updates',
    onMessage: (data: unknown) => {
      const messageData = data as { type: string; data?: MLStatus };
      if (messageData.type === 'ml_status_update' && messageData.data) {
        setStatus(messageData.data);
        setLoading(false);
      }
    },
    onError: () => {
      console.warn('ML status SSE error, falling back to fetch');
      // Fallback to fetch if SSE fails
      checkMLStatusFallback();
    },
    onOpen: () => {
      console.log('ML status SSE connection established');
    }
  });

  const checkMLStatusFallback = async () => {
    try {
      const response = await fetch('/api/ml/status');
      if (response.ok) {
        const data = await response.json();
        // The API returns the status directly, not nested
        setStatus({
          configured: data.configured,
          provider: data.provider,
          hasApiKey: data.hasApiKey,
          message: data.message
        });
      }
    } catch (error) {
      console.error('Failed to check ML status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always do an initial fetch to get status immediately
    checkMLStatusFallback();
  }, []);

  useEffect(() => {
    // If SSE fails to connect after some time, retry the fallback
    if (!isConnected && !status) {
      const timeout = setTimeout(() => {
        checkMLStatusFallback();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isConnected, status]);

  if (loading) {
    return (
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full mr-1.5 animate-pulse"></div>
        Checking ML...
      </div>
    );
  }

  if (!status || !status.configured) {
    return (
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full mr-1.5"></div>
        No ML Provider
      </div>
    );
  }

  // Provider-specific colors and icons
  const providerStyles = {
    google: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      dot: 'bg-blue-500',
      icon: '🧠',
      name: 'Google NLP'
    },
    vertex: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-500',
      icon: '☁️',
      name: 'Vertex AI'
    },
    aws: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      dot: 'bg-orange-500',
      icon: '📊',
      name: 'AWS Comprehend'
    },
    azure: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      dot: 'bg-purple-500',
      icon: '🔷',
      name: 'Azure Cognitive'
    },
    local: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-800',
      dot: 'bg-indigo-500',
      icon: '💻',
      name: 'Local Model'
    },
    default: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      dot: 'bg-gray-500',
      icon: '🤖',
      name: 'ML Provider'
    }
  };

  const style = providerStyles[status.provider as keyof typeof providerStyles] || providerStyles.default;

  return (
    <div 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text} ${className}`}
      title={showDetails ? status.message : style.name}
    >
      <div className={`w-2 h-2 ${style.dot} rounded-full mr-1.5 animate-pulse`}></div>
      <span className="mr-1">{style.icon}</span>
      <span>
        {style.name}
        {showDetails && status.message && (
          <span className="ml-1 opacity-75">• {status.message}</span>
        )}
      </span>
    </div>
  );
}