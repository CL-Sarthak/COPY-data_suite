'use client';

import React, { useEffect, useState } from 'react';
import { useSSE } from '@/hooks/useSSE';

interface LLMStatus {
  configured: boolean;
  provider: string;
  providerName: string;
  model: string;
  features: {
    datasetEnhancement: boolean;
    naturalLanguageAnalysis: boolean;
    codeGeneration: boolean;
  };
}

interface LLMIndicatorProps {
  feature?: keyof LLMStatus['features'];
  className?: string;
  showModel?: boolean;
}

export default function LLMIndicator({ 
  feature = 'datasetEnhancement', 
  className = '',
  showModel = false 
}: LLMIndicatorProps) {
  const [status, setStatus] = useState<LLMStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Use SSE for real-time LLM status updates
  const { isConnected } = useSSE('llm-status', {
    url: '/api/llm/status/updates',
    onMessage: (data: unknown) => {
      const messageData = data as { type: string; data?: LLMStatus };
      if (messageData.type === 'llm_status_update' && messageData.data) {
        setStatus(messageData.data);
        setLoading(false);
      }
    },
    onError: () => {
      console.warn('LLM status SSE error, falling back to fetch');
      // Fallback to fetch if SSE fails
      checkLLMStatusFallback();
    },
    onOpen: () => {
      console.log('LLM status SSE connection established');
    }
  });

  const checkLLMStatusFallback = async () => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('/api/llm/status', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('LLM status check timed out');
      } else {
        console.error('Failed to check LLM status:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fallback fetch if SSE is not connected after a delay
    if (!isConnected && !status) {
      const timeoutId = setTimeout(() => {
        checkLLMStatusFallback();
      }, 1000); // 1 second delay to allow SSE to connect first
      
      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, status]);

  if (loading) {
    return (
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full mr-1.5 animate-pulse"></div>
        Checking LLM...
      </div>
    );
  }

  if (!status || !status.configured || !status.features[feature]) {
    return (
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full mr-1.5"></div>
        No LLM
      </div>
    );
  }

  // Provider-specific colors and icons
  const providerStyles = {
    anthropic: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      dot: 'bg-purple-500',
      icon: '🤖'
    },
    openai: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-500',
      icon: '🧠'
    },
    vertex: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      dot: 'bg-blue-500',
      icon: '☁️'
    },
    default: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      dot: 'bg-gray-500',
      icon: '🔮'
    }
  };

  const style = providerStyles[status.provider as keyof typeof providerStyles] || providerStyles.default;

  return (
    <div 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text} ${className}`}
      title={`${status.providerName}${showModel ? ` (${status.model})` : ''}`}
    >
      <div className={`w-2 h-2 ${style.dot} rounded-full mr-1.5 animate-pulse`}></div>
      <span className="mr-1">{style.icon}</span>
      <span>
        {status.providerName}
        {showModel && (
          <span className="ml-1 opacity-75">({status.model})</span>
        )}
      </span>
    </div>
  );
}